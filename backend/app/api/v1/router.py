from fastapi import APIRouter

from app.api.v1.endpoints import (
    context,
    health,
    itineraries,
    journeys,
    notifications,
    places,
    saved_places,
)

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(health.router)
api_router.include_router(places.router)
api_router.include_router(context.router)
api_router.include_router(itineraries.router)
api_router.include_router(journeys.router)
api_router.include_router(saved_places.router)
api_router.include_router(notifications.router)
