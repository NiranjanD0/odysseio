from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.integrations.telegram import TelegramClient
from app.schemas.common import Coordinates
from app.schemas.itinerary import Itinerary, ItineraryStop
from app.schemas.places import Place
from app.services.telegram_service import TelegramService


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
    with patch.object(client, "send_message", new_callable=AsyncMock) as mock_send:
        mock_send.return_value = (True, "Notification sent successfully.", 999)
        success, msg, msg_id = await client.send_message("Test message", chat_id="12345")
        assert success is True
        assert msg_id == 999


@pytest.mark.asyncio
async def test_telegram_link_code_endpoint(async_client: AsyncClient):
    res = await async_client.post(
        "/api/v1/telegram/link-code",
        json={"owner_id": "test_user_1"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["code"].startswith("ODY-")
    assert "expires_at" in data
    assert "bot_username" in data
    assert "deep_link" in data


@pytest.mark.asyncio
async def test_telegram_status_endpoint(async_client: AsyncClient):
    res = await async_client.get("/api/v1/telegram/status?owner_id=fresh_user")
    assert res.status_code == 200
    data = res.json()
    assert data["owner_id"] == "fresh_user"
    assert data["linked"] is False
    assert "bot_username" in data


@pytest.mark.asyncio
async def test_telegram_preferences_endpoint(async_client: AsyncClient):
    res = await async_client.post(
        "/api/v1/telegram/preferences",
        json={"owner_id": "pref_user", "notifications_enabled": False},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["notifications_enabled"] is False


@pytest.mark.asyncio
async def test_telegram_unlink_endpoint(async_client: AsyncClient):
    res = await async_client.post(
        "/api/v1/telegram/unlink",
        json={"owner_id": "unlink_user"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True


@pytest.mark.asyncio
async def test_telegram_test_message_endpoint(async_client: AsyncClient):
    with patch(
        "app.integrations.telegram.TelegramClient.send_message",
        new_callable=AsyncMock,
    ) as mock_send:
        mock_send.return_value = (True, "Notification sent successfully.", 123)
        res = await async_client.post(
            "/api/v1/telegram/test",
            json={"owner_id": "test_owner", "chat_id": "987654"},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["messageId"] == 123


@pytest.mark.asyncio
async def test_telegram_webhook_secret_validation(async_client: AsyncClient):
    with patch("app.core.config.settings.TELEGRAM_WEBHOOK_SECRET", "super-secret"):
        # Without secret header -> 403
        bad_res = await async_client.post(
            "/api/v1/telegram/webhook",
            json={"update_id": 1},
        )
        assert bad_res.status_code == 403

        # With wrong secret header -> 403
        bad_res2 = await async_client.post(
            "/api/v1/telegram/webhook",
            headers={"X-Telegram-Bot-Api-Secret-Token": "wrong-secret"},
            json={"update_id": 1},
        )
        assert bad_res2.status_code == 403

        # With correct secret header -> 200
        good_res = await async_client.post(
            "/api/v1/telegram/webhook",
            headers={"X-Telegram-Bot-Api-Secret-Token": "super-secret"},
            json={"update_id": 1, "message": {"chat": {"id": 123}, "text": "/help"}},
        )
        assert good_res.status_code == 200


@pytest.mark.asyncio
async def test_telegram_link_flow_and_replay_prevention(db_session: AsyncSession):
    service = TelegramService(db_session)

    # 1. Generate code
    code, expires_at = await service.generate_link_code(owner_id="user_link_test")
    assert code.startswith("ODY-")

    # 2. First link attempt should succeed
    success, reply = await service.link_chat(
        code_str=code,
        chat_id="555123",
        user_id="111",
        username="traveler",
    )
    assert success is True
    assert "Successfully linked" in reply

    # 3. Check status is now linked
    status = await service.get_link_status("user_link_test")
    assert status.linked is True
    assert status.chat_id == "555123"
    assert status.username == "traveler"
    assert status.notifications_enabled is True

    # 4. Replay attack: trying to use the same code again MUST fail
    success2, reply2 = await service.link_chat(
        code_str=code,
        chat_id="999999",
    )
    assert success2 is False
    assert "Invalid or already used" in reply2


@pytest.mark.asyncio
async def test_telegram_commands(db_session: AsyncSession):
    service = TelegramService(db_session)
    chat_id = "777888"

    # /start
    start_reply = await service.handle_command(chat_id, "/start")
    assert "Welcome to ODYSSEIO" in start_reply

    # /help
    help_reply = await service.handle_command(chat_id, "/help")
    assert "ODYSSEIO Telegram Bot Guide" in help_reply

    # Link account
    code, _ = await service.generate_link_code(owner_id="command_user")
    link_reply = await service.handle_command(chat_id, f"/link {code}")
    assert "Successfully linked" in link_reply

    # /notify off
    notify_off = await service.handle_command(chat_id, "/notify off")
    assert "OFF" in notify_off

    # /notify on
    notify_on = await service.handle_command(chat_id, "/notify on")
    assert "ON" in notify_on

    # /unlink
    unlink_reply = await service.handle_command(chat_id, "/unlink")
    assert "unlinked" in unlink_reply


def test_telegram_journey_formatting():
    client = TelegramClient(bot_token="test-token")
    mock_itinerary = Itinerary(
        id="test-journey-123",
        title="Balanced Adventure in Paris",
        city="Paris",
        date="2026-11-01",
        startTime="10:00",
        returnDeadline="14:00",
        safetyBufferMinutes=20,
        stops=[
            ItineraryStop(
                id="s1",
                place=Place(
                    id="p1",
                    name="Riverside Park",
                    city="Paris",
                    address="1 Rue de Paris",
                    category="nature",
                    coordinates=Coordinates(lat=48.85, lng=2.35),
                    estimatedVisitMinutes=40,
                ),
                arrivalTime="10:15",
                departureTime="10:55",
                travelTimeFromPrev=15,
            ),
            ItineraryStop(
                id="s2",
                place=Place(
                    id="p2",
                    name="City Museum",
                    city="Paris",
                    address="2 Rue de Paris",
                    category="culture",
                    coordinates=Coordinates(lat=48.86, lng=2.36),
                    estimatedVisitMinutes=60,
                ),
                arrivalTime="11:10",
                departureTime="12:10",
                travelTimeFromPrev=15,
            ),
        ],
        pace="balanced",
        transport="walking",
        totalMinutes=130,
        explorationMinutes=100,
        travelMinutes=30,
        returnLegMinutes=15,
        interests=["nature", "culture"],
        status="upcoming",
        createdAt="2026-11-01T10:00:00Z",
        centerCoordinates=Coordinates(lat=48.85, lng=2.35),
        warnings=[],
    )

    msg = client.format_journey_message(mock_itinerary, web_url="https://odysseio.example.com")
    assert "Your ODYSSEIO journey is ready" in msg
    assert "Start: 10:00" in msg
    assert "Return by: 14:00" in msg
    assert "Riverside Park — 40 min" in msg
    assert "City Museum — 60 min" in msg
    assert "Return buffer: 20 min" in msg
    assert "FEASIBLE" in msg
    assert "https://odysseio.example.com/adventure/test-journey-123" in msg
