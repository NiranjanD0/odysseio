from typing import Any

from fastapi import HTTPException


class OdysseioException(Exception):
    """Base exception for ODYSSEIO application."""

    def __init__(self, message: str, details: dict[str, Any] | None = None):
        super().__init__(message)
        self.message = message
        self.details = details or {}


class ProviderException(OdysseioException):
    """Exception raised when an external API integration fails."""

    pass


class RoutingException(ProviderException):
    """Exception raised when route calculation fails or is unavailable."""

    pass


class FeasibilityException(OdysseioException):
    """Exception raised when an itinerary cannot be scheduled feasibly."""

    pass


class ResourceNotFoundException(OdysseioException):
    """Exception raised when a requested resource does not exist."""

    pass


def raise_http_error(
    status_code: int,
    message: str,
    error_code: str = "ERROR",
    details: dict[str, Any] | None = None,
) -> None:
    raise HTTPException(
        status_code=status_code,
        detail={
            "error": error_code,
            "message": message,
            "details": details or {},
        },
    )
