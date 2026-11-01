from datetime import UTC, datetime, timedelta
import hashlib
import secrets
import string

from sqlalchemy import delete, desc, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.logging import logger
from app.integrations.telegram import TelegramClient
from app.models.telegram_link import TelegramLinkCodeModel, TelegramLinkModel
from app.repositories.journey_repo import JourneyRepository
from app.schemas.itinerary import Itinerary
from app.schemas.telegram import TelegramStatusResponse


class TelegramService:
    def __init__(
        self,
        session: AsyncSession,
        telegram_client: TelegramClient | None = None,
    ):
        self.session = session
        self.client = telegram_client or TelegramClient()
        self.journey_repo = JourneyRepository(session)

    @staticmethod
    def _hash_code(code: str) -> str:
        return hashlib.sha256(code.strip().upper().encode("utf-8")).hexdigest()

    async def generate_link_code(self, owner_id: str = "default_user") -> tuple[str, datetime]:
        """Generate a short-lived, single-use 6-character link code."""
        # 6 uppercase alphanumeric characters (excluding confusing O, 0, I, 1)
        alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
        raw_code = "".join(secrets.choice(alphabet) for _ in range(6))
        display_code = f"ODY-{raw_code}"
        code_hash = self._hash_code(display_code)

        expires_at = datetime.now(UTC) + timedelta(minutes=15)

        # Invalidate old unused codes for this owner to prevent replay
        await self.session.execute(
            update(TelegramLinkCodeModel)
            .where(
                TelegramLinkCodeModel.owner_id == owner_id,
                TelegramLinkCodeModel.used_at.is_(None),
            )
            .values(expires_at=datetime.now(UTC))
        )

        new_code_entry = TelegramLinkCodeModel(
            code_hash=code_hash,
            owner_id=owner_id,
            expires_at=expires_at,
            used_at=None,
        )
        self.session.add(new_code_entry)
        await self.session.commit()

        return display_code, expires_at

    async def get_link_status(self, owner_id: str = "default_user") -> TelegramStatusResponse:
        """Get current link status and preferences for the given owner."""
        stmt = (
            select(TelegramLinkModel)
            .where(
                TelegramLinkModel.owner_id == owner_id,
                TelegramLinkModel.unlinked_at.is_(None),
            )
            .order_by(desc(TelegramLinkModel.linked_at))
            .limit(1)
        )
        res = await self.session.execute(stmt)
        link = res.scalar_one_or_none()

        bot_username = settings.TELEGRAM_BOT_USERNAME or "odysseioBot"

        if link:
            return TelegramStatusResponse(
                linked=True,
                owner_id=owner_id,
                chat_id=link.telegram_chat_id,
                username=link.telegram_username,
                notifications_enabled=link.notification_enabled,
                linked_at=link.linked_at.isoformat() if link.linked_at else None,
                bot_username=bot_username,
            )

        # If not explicitly linked, check if a default chat ID is configured in .env
        default_chat = settings.TELEGRAM_DEFAULT_CHAT_ID
        if default_chat and owner_id == "default_user":
            return TelegramStatusResponse(
                linked=True,
                owner_id=owner_id,
                chat_id=default_chat,
                username="configured_default",
                notifications_enabled=True,
                linked_at=None,
                bot_username=bot_username,
            )

        return TelegramStatusResponse(
            linked=False,
            owner_id=owner_id,
            chat_id=None,
            username=None,
            notifications_enabled=False,
            linked_at=None,
            bot_username=bot_username,
        )

    @staticmethod
    def _as_utc(dt: datetime) -> datetime:
        if dt.tzinfo is None:
            return dt.replace(tzinfo=UTC)
        return dt

    async def link_chat(
        self,
        code_str: str,
        chat_id: str,
        user_id: str | None = None,
        username: str | None = None,
    ) -> tuple[bool, str]:
        """Validate link code and bind Telegram chat to owner_id."""
        code_hash = self._hash_code(code_str)

        stmt = select(TelegramLinkCodeModel).where(TelegramLinkCodeModel.code_hash == code_hash)
        res = await self.session.execute(stmt)
        code_model = res.scalar_one_or_none()

        now = datetime.now(UTC)

        if not code_model or code_model.used_at is not None:
            return (
                False,
                "❌ Invalid or already used link code. Please generate a new code in the ODYSSEIO web app under Settings.",
            )

        if self._as_utc(code_model.expires_at) < now:
            return (
                False,
                "❌ Link code has expired. Please generate a new code in the ODYSSEIO web app under Settings.",
            )

        owner_id = code_model.owner_id

        # Mark code as used
        code_model.used_at = now

        # Unlink existing active associations for this chat or this owner
        await self.session.execute(
            update(TelegramLinkModel)
            .where(
                (TelegramLinkModel.telegram_chat_id == str(chat_id))
                | (TelegramLinkModel.owner_id == owner_id),
                TelegramLinkModel.unlinked_at.is_(None),
            )
            .values(unlinked_at=now, notification_enabled=False)
        )

        # Create new active link
        new_link = TelegramLinkModel(
            owner_id=owner_id,
            telegram_chat_id=str(chat_id),
            telegram_user_id=str(user_id) if user_id else None,
            telegram_username=username,
            notification_enabled=True,
            linked_at=now,
            unlinked_at=None,
        )
        self.session.add(new_link)
        await self.session.commit()

        return (
            True,
            "✅ Successfully linked! Your ODYSSEIO web session is now connected to this chat.\n"
            "You will receive notifications when you create or replan journeys.\n"
            "Type /journey to view your latest journey, or /help for more commands.",
        )

    async def unlink_by_chat(self, chat_id: str) -> tuple[bool, str]:
        """Unlink chat from Telegram command."""
        now = datetime.now(UTC)
        res = await self.session.execute(
            update(TelegramLinkModel)
            .where(
                TelegramLinkModel.telegram_chat_id == str(chat_id),
                TelegramLinkModel.unlinked_at.is_(None),
            )
            .values(unlinked_at=now, notification_enabled=False)
        )
        await self.session.commit()
        if res.rowcount > 0:
            return (
                True,
                "🔌 This chat has been unlinked from ODYSSEIO. You will no longer receive notifications. You can reconnect anytime with /link <code>.",
            )
        return False, "This chat is not currently linked to an ODYSSEIO account."

    async def unlink_by_owner(self, owner_id: str) -> tuple[bool, str]:
        """Unlink connection from Web app UI."""
        now = datetime.now(UTC)
        res = await self.session.execute(
            update(TelegramLinkModel)
            .where(
                TelegramLinkModel.owner_id == owner_id,
                TelegramLinkModel.unlinked_at.is_(None),
            )
            .values(unlinked_at=now, notification_enabled=False)
        )
        await self.session.commit()
        if res.rowcount > 0:
            return True, "Telegram account unlinked successfully."
        return True, "No active Telegram connection was linked."

    async def set_notification_preference_by_chat(
        self,
        chat_id: str,
        enabled: bool,
    ) -> tuple[bool, str]:
        """Update notification preference via /notify on|off."""
        res = await self.session.execute(
            update(TelegramLinkModel)
            .where(
                TelegramLinkModel.telegram_chat_id == str(chat_id),
                TelegramLinkModel.unlinked_at.is_(None),
            )
            .values(notification_enabled=enabled)
        )
        await self.session.commit()
        if res.rowcount > 0:
            status_text = "ON 🔔" if enabled else "OFF 🔕"
            return True, f"ODYSSEIO notifications are now {status_text}."
        return (
            False,
            "⚠️ This chat is not linked to ODYSSEIO yet. Link first using /link <code>.",
        )

    async def set_notification_preference_by_owner(
        self,
        owner_id: str,
        enabled: bool,
    ) -> tuple[bool, str]:
        """Update notification preference from Web UI."""
        res = await self.session.execute(
            update(TelegramLinkModel)
            .where(
                TelegramLinkModel.owner_id == owner_id,
                TelegramLinkModel.unlinked_at.is_(None),
            )
            .values(notification_enabled=enabled)
        )
        await self.session.commit()
        return True, f"Notification preferences set to {'enabled' if enabled else 'disabled'}."

    async def get_latest_journey_for_chat(self, chat_id: str) -> Itinerary | None:
        """Find latest saved journey for this chat's linked owner."""
        # Find owner
        stmt = select(TelegramLinkModel).where(
            TelegramLinkModel.telegram_chat_id == str(chat_id),
            TelegramLinkModel.unlinked_at.is_(None),
        )
        res = await self.session.execute(stmt)
        link = res.scalar_one_or_none()

        journeys = await self.journey_repo.list_journeys(limit=1, offset=0)
        return journeys[0] if journeys else None

    async def handle_command(
        self,
        chat_id: str,
        text: str,
        user: dict | None = None,
    ) -> str:
        """Handle incoming Telegram commands."""
        parts = text.strip().split()
        if not parts:
            return ""

        raw_cmd = parts[0].lower()
        # Handle command with bot username e.g. /start@odysseioBot
        cmd = raw_cmd.split("@")[0]
        args = parts[1:]

        user_id = str(user.get("id")) if user else None
        username = user.get("username") if user else None

        if cmd == "/start":
            if args:
                # User used deep-link format: /start ODY-XXXX
                code_arg = args[0]
                success, reply = await self.link_chat(code_arg, chat_id, user_id, username)
                return reply

            return (
                "👋 *Welcome to ODYSSEIO!*\n"
                "_Every minute, a new story._\n\n"
                "ODYSSEIO is your intelligent, time-aware city exploration planner. "
                "Discover real places, follow realistic routes, and never miss your return deadline.\n\n"
                "*Available commands:*\n"
                "• `/link <code>` — Connect this chat using a code from the web app\n"
                "• `/journey` — Show your latest linked saved journey\n"
                "• `/notify on|off` — Turn journey notifications on or off\n"
                "• `/unlink` — Disconnect this chat from ODYSSEIO\n"
                "• `/help` — Explain how to use the bot and connect a journey"
            )

        elif cmd == "/help":
            return (
                "ℹ️ *ODYSSEIO Telegram Bot Guide*\n\n"
                "*How to connect to ODYSSEIO:*\n"
                "1. Open ODYSSEIO in your browser and go to *Settings* → *Telegram Connection*.\n"
                "2. Click *Generate Link Code*.\n"
                "3. Send `/link <CODE>` here in this chat (e.g. `/link ODY-7X9K`).\n\n"
                "*Commands:*\n"
                "• `/link <CODE>` — Link your web session\n"
                "• `/journey` — View your latest planned route, stops & feasibility\n"
                "• `/notify on` — Receive notifications when journeys are created/replanned\n"
                "• `/notify off` — Mute automatic notifications\n"
                "• `/unlink` — Revoke chat association\n"
                "• `/help` — Show this message"
            )

        elif cmd == "/link":
            if not args:
                return (
                    "⚠️ Please provide your link code from the web app.\n"
                    "Usage: `/link <code>` (e.g. `/link ODY-7X9K`)\n"
                    "You can generate a code on the ODYSSEIO Settings page."
                )
            code_arg = args[0]
            success, reply = await self.link_chat(code_arg, chat_id, user_id, username)
            return reply

        elif cmd == "/journey":
            journey = await self.get_latest_journey_for_chat(chat_id)
            if not journey:
                return (
                    "🗺️ *No journeys found yet!*\n\n"
                    "Create your first itinerary on the ODYSSEIO web planner, then run `/journey` again to see it here."
                )
            return self.client.format_journey_message(journey)

        elif cmd == "/notify":
            if not args or args[0].lower() not in ("on", "off"):
                return "Usage: `/notify on` to enable or `/notify off` to disable notifications."
            enabled = args[0].lower() == "on"
            success, reply = await self.set_notification_preference_by_chat(chat_id, enabled)
            return reply

        elif cmd == "/unlink":
            success, reply = await self.unlink_by_chat(chat_id)
            return reply

        else:
            return "Unrecognized command. Type `/help` to see available commands."

    async def handle_update(self, update: dict) -> dict:
        """Process a single incoming Telegram update (from webhook or long-poll)."""
        message = update.get("message") or update.get("edited_message")
        if not message:
            return {"status": "ignored", "reason": "no_message"}

        chat = message.get("chat")
        if not chat:
            return {"status": "ignored", "reason": "no_chat"}

        chat_id = str(chat.get("id"))
        text = message.get("text", "").strip()
        user = message.get("from", {})

        if not text:
            return {"status": "ignored", "reason": "no_text"}

        reply_text = await self.handle_command(chat_id=chat_id, text=text, user=user)
        if reply_text:
            await self.client.send_message(text=reply_text, chat_id=chat_id)

        return {"status": "processed", "chat_id": chat_id}

    async def get_target_chat_ids(self, owner_id: str = "default_user") -> list[str]:
        """Get all opted-in Telegram chat IDs for this owner."""
        stmt = select(TelegramLinkModel.telegram_chat_id).where(
            TelegramLinkModel.owner_id == owner_id,
            TelegramLinkModel.unlinked_at.is_(None),
            TelegramLinkModel.notification_enabled.is_(True),
        )
        res = await self.session.execute(stmt)
        chat_ids = [str(r[0]) for r in res.fetchall()]

        # Fallback to TELEGRAM_DEFAULT_CHAT_ID if configured and no specific chat registered
        if not chat_ids and settings.TELEGRAM_DEFAULT_CHAT_ID:
            chat_ids.append(settings.TELEGRAM_DEFAULT_CHAT_ID)

        return chat_ids

    async def send_test_message(
        self,
        owner_id: str = "default_user",
        chat_id: str | None = None,
        custom_message: str | None = None,
    ) -> tuple[bool, str, int | None]:
        """Send a test message to verify the live Telegram connection."""
        target_chat = chat_id
        if not target_chat:
            chats = await self.get_target_chat_ids(owner_id)
            if not chats:
                return False, "No active Telegram chat is linked and no default chat is configured.", None
            target_chat = chats[0]

        text = custom_message or (
            "🚀 *ODYSSEIO Live Test Notification*\n\n"
            "Your Telegram connection is working perfectly!\n"
            "You are set to receive live itinerary summaries and replan updates."
        )

        return await self.client.send_message(text=text, chat_id=target_chat)

    async def notify_journey_created(
        self,
        itinerary: Itinerary,
        owner_id: str = "default_user",
    ) -> None:
        """Send journey created notification to all opted-in chats. Never raises."""
        try:
            chat_ids = await self.get_target_chat_ids(owner_id)
            if not chat_ids:
                return

            text = self.client.format_journey_message(itinerary)
            for cid in chat_ids:
                await self.client.send_message(text=text, chat_id=cid)
        except Exception as e:
            logger.warning(f"Telegram journey created notification error: {e}")

    async def notify_journey_replanned(
        self,
        itinerary: Itinerary,
        changes_summary: str = "",
        owner_id: str = "default_user",
    ) -> None:
        """Send journey replanned notification to all opted-in chats. Never raises."""
        try:
            chat_ids = await self.get_target_chat_ids(owner_id)
            if not chat_ids:
                return

            text = self.client.format_replan_message(
                itinerary=itinerary,
                changes_summary=changes_summary,
            )
            for cid in chat_ids:
                await self.client.send_message(text=text, chat_id=cid)
        except Exception as e:
            logger.warning(f"Telegram journey replanned notification error: {e}")

    async def notify_feasibility_changed(
        self,
        itinerary: Itinerary,
        old_status: str,
        new_status: str,
        owner_id: str = "default_user",
    ) -> None:
        """Send feasibility changed alert to all opted-in chats. Never raises."""
        try:
            chat_ids = await self.get_target_chat_ids(owner_id)
            if not chat_ids:
                return

            text = self.client.format_feasibility_alert(
                itinerary=itinerary,
                old_status=old_status,
                new_status=new_status,
            )
            for cid in chat_ids:
                await self.client.send_message(text=text, chat_id=cid)
        except Exception as e:
            logger.warning(f"Telegram feasibility alert error: {e}")
