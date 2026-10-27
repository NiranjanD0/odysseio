import httpx

from app.core.config import settings
from app.core.logging import logger
from app.schemas.itinerary import Itinerary


class TelegramClient:
    def __init__(self, bot_token: str | None = None):
        self.bot_token = bot_token if bot_token is not None else settings.TELEGRAM_BOT_TOKEN
        self.base_url = f"https://api.telegram.org/bot{self.bot_token}" if self.bot_token else ""

    async def send_message(
        self,
        text: str,
        chat_id: str | None = None,
        parse_mode: str = "Markdown",
    ) -> tuple[bool, str, int | None]:
        target_chat = chat_id or settings.TELEGRAM_DEFAULT_CHAT_ID
        if not self.bot_token or not target_chat:
            return False, "Telegram bot token or chat ID is not configured.", None

        url = f"{self.base_url}/sendMessage"
        payload = {
            "chat_id": target_chat,
            "text": text,
            "parse_mode": parse_mode,
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(url, json=payload)

            if res.status_code == 200:
                data = res.json()
                msg_id = data.get("result", {}).get("message_id")
                return True, "Notification sent successfully.", msg_id
            else:
                return False, f"Telegram API error HTTP {res.status_code}: {res.text}", None
        except Exception as e:
            logger.error(f"Telegram send error: {e}")
            return False, f"Failed to send Telegram message: {str(e)}", None

    def format_itinerary_message(self, itinerary: Itinerary) -> str:
        lines = [
            f"🗺️ *ODYSSEIO Adventure:* {itinerary.title}",
            f"📍 *City:* {itinerary.city}",
            f"⏰ *Window:* {itinerary.startTime} - {itinerary.returnDeadline} (Buffer: {itinerary.safetyBufferMinutes}m)",
            f"🚶 *Pace & Transport:* {itinerary.pace.capitalize()} | {itinerary.transport.capitalize()}",
            f"⏱️ *Duration:* {itinerary.totalMinutes}m (Explore: {itinerary.explorationMinutes}m, Travel: {itinerary.travelMinutes}m)",
            "",
            "*Stops:*",
        ]

        for i, stop in enumerate(itinerary.stops, 1):
            lines.append(
                f"{i}. *{stop.place.name}* ({stop.place.category})\n"
                f"   🕒 {stop.arrivalTime} - {stop.departureTime} (travel: {stop.travelTimeFromPrev}m)"
            )

        if itinerary.warnings:
            lines.append("")
            lines.append("⚠️ *Notes:*")
            for w in itinerary.warnings:
                lines.append(f"• {w}")

        return "\n".join(lines)
