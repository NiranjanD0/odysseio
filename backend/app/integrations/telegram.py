import httpx

from app.core.config import settings
from app.core.logging import logger
from app.schemas.itinerary import Itinerary


def _time_to_minutes(time_str: str) -> int:
    try:
        parts = time_str.split(":")
        return int(parts[0]) * 60 + int(parts[1])
    except Exception:
        return 0


class TelegramClient:
    def __init__(self, bot_token: str | None = None):
        self.bot_token = bot_token if bot_token is not None else settings.TELEGRAM_BOT_TOKEN
        self.base_url = f"https://api.telegram.org/bot{self.bot_token}" if self.bot_token else ""

    async def get_me(self) -> dict | None:
        if not self.bot_token:
            return None
        url = f"{self.base_url}/getMe"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(url)
            if res.status_code == 200:
                data = res.json()
                return data.get("result")
            logger.warning(f"Telegram getMe failed: HTTP {res.status_code} {res.text}")
            return None
        except Exception as e:
            logger.warning(f"Telegram getMe network error: {e}")
            return None

    async def get_updates(self, offset: int | None = None, timeout: int = 20) -> list[dict]:
        if not self.bot_token:
            return []
        url = f"{self.base_url}/getUpdates"
        params: dict = {"timeout": timeout}
        if offset is not None:
            params["offset"] = offset

        try:
            async with httpx.AsyncClient(timeout=float(timeout + 10)) as client:
                res = await client.get(url, params=params)
            if res.status_code == 200:
                data = res.json()
                return data.get("result", [])
            logger.warning(f"Telegram getUpdates error HTTP {res.status_code}: {res.text}")
            return []
        except Exception as e:
            logger.debug(f"Telegram getUpdates polling exception: {e}")
            return []

    async def set_webhook(self, url: str, secret_token: str | None = None) -> bool:
        if not self.bot_token:
            return False
        endpoint = f"{self.base_url}/setWebhook"
        payload: dict = {"url": url}
        if secret_token:
            payload["secret_token"] = secret_token
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(endpoint, json=payload)
            return res.status_code == 200 and res.json().get("ok", False)
        except Exception as e:
            logger.error(f"Telegram setWebhook error: {e}")
            return False

    async def delete_webhook(self, drop_pending_updates: bool = False) -> bool:
        if not self.bot_token:
            return False
        endpoint = f"{self.base_url}/deleteWebhook"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(
                    endpoint, json={"drop_pending_updates": drop_pending_updates}
                )
            return res.status_code == 200 and res.json().get("ok", False)
        except Exception as e:
            logger.error(f"Telegram deleteWebhook error: {e}")
            return False

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
            "chat_id": str(target_chat),
            "text": text,
        }
        if parse_mode:
            payload["parse_mode"] = parse_mode

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

    def format_journey_message(self, itinerary: Itinerary, web_url: str = "") -> str:
        """Format journey summary matching the ODYSSEIO standard presentation."""
        start_mins = _time_to_minutes(itinerary.startTime)
        deadline_mins = _time_to_minutes(itinerary.returnDeadline)
        if deadline_mins <= start_mins:
            deadline_mins += 24 * 60
        available_mins = deadline_mins - start_mins

        required_mins = (
            itinerary.explorationMinutes
            + itinerary.travelMinutes
            + itinerary.safetyBufferMinutes
        )
        spare_mins = available_mins - required_mins
        is_feasible = spare_mins >= 0

        status_str = (
            f"FEASIBLE — {spare_mins} min spare"
            if is_feasible
            else f"NOT FEASIBLE — {abs(spare_mins)} min overrun"
        )

        lines = [
            "Your ODYSSEIO journey is ready ■",
            f"Start: {itinerary.startTime}   Return by: {itinerary.returnDeadline}",
        ]

        for i, stop in enumerate(itinerary.stops, 1):
            arr = _time_to_minutes(stop.arrivalTime)
            dep = _time_to_minutes(stop.departureTime)
            if dep < arr:
                dep += 24 * 60
            visit_mins = dep - arr if dep >= arr else stop.place.estimatedVisitMinutes
            lines.append(f"{i}. {stop.place.name} — {visit_mins} min")

        lines.extend([
            f"Travel: {itinerary.travelMinutes} min | Visits: {itinerary.explorationMinutes} min",
            f"Return buffer: {itinerary.safetyBufferMinutes} min",
            f"Status: {status_str}",
        ])

        base = web_url.rstrip("/") if web_url else settings.TELEGRAM_WEB_BASE_URL.rstrip("/")
        if base and itinerary.id:
            lines.append(f"Open journey: {base}/adventure/{itinerary.id}")

        return "\n".join(lines)

    def format_replan_message(
        self,
        itinerary: Itinerary,
        changes_summary: str = "",
        web_url: str = "",
    ) -> str:
        """Format journey replanned notification."""
        journey_text = self.format_journey_message(itinerary, web_url=web_url)
        header = "🔄 *Your ODYSSEIO journey has been replanned*"
        if changes_summary:
            return f"{header}\n\n*Important Changes:* {changes_summary}\n\n{journey_text}"
        return f"{header}\n\n{journey_text}"

    def format_feasibility_alert(
        self,
        itinerary: Itinerary,
        old_status: str,
        new_status: str,
        web_url: str = "",
    ) -> str:
        """Format alert if feasibility changes."""
        base = web_url.rstrip("/") if web_url else settings.TELEGRAM_WEB_BASE_URL.rstrip("/")
        link = f"\nOpen journey: {base}/adventure/{itinerary.id}" if base and itinerary.id else ""
        return (
            f"⚠️ *ODYSSEIO Feasibility Alert!*\n\n"
            f"Your journey in *{itinerary.city}* has changed feasibility status:\n"
            f"Previous: {old_status.upper()}\n"
            f"Current: *{new_status.upper()}*\n\n"
            f"Start: {itinerary.startTime} | Return by: {itinerary.returnDeadline}\n"
            f"Return Buffer: {itinerary.safetyBufferMinutes} min\n"
            f"Please check your itinerary adjustments.{link}"
        )

    def format_itinerary_message(self, itinerary: Itinerary) -> str:
        """Legacy formatter preserved for backwards compatibility."""
        return self.format_journey_message(itinerary)
