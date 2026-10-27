from unittest.mock import AsyncMock, patch

import httpx
import pytest
from httpx import AsyncClient

from app.integrations.telegram import TelegramClient


@pytest.mark.asyncio
async def test_telegram_unconfigured(async_client: AsyncClient):
    with patch("app.core.config.settings.TELEGRAM_BOT_TOKEN", ""):
        res = await async_client.post(
            "/api/v1/notifications/telegram",
            json={"customMessage": "Hello world!"},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is False
        assert "not configured" in data["message"]


@pytest.mark.asyncio
async def test_telegram_send_success():
    client = TelegramClient(bot_token="test-token")
    mock_resp = httpx.Response(
        status_code=200,
        json={"ok": True, "result": {"message_id": 999}},
        request=httpx.Request("POST", "https://api.telegram.org"),
    )

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_resp
        success, msg, msg_id = await client.send_message("Test message", chat_id="12345")
        assert success is True
        assert msg_id == 999
