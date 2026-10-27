from pydantic import BaseModel

from app.schemas.common import Coordinates


class CurrentWeather(BaseModel):
    temperature: float
    weatherCode: int
    windSpeed: float
    isDay: bool
    description: str


class WeatherForecast(BaseModel):
    date: str
    maxTemp: float
    minTemp: float
    precipitationProbability: int
    weatherCode: int


class WeatherContext(BaseModel):
    current: CurrentWeather | None = None
    forecast: list[WeatherForecast] = []


class AirQualityContext(BaseModel):
    aqi: int | None = None
    pm25: float | None = None
    pm10: float | None = None
    category: str = "Good"


class BikeStation(BaseModel):
    id: str
    name: str
    freeBikes: int
    emptySlots: int
    coordinates: Coordinates
    distanceMeters: int | None = None


class BikeSharingContext(BaseModel):
    available: bool = False
    networkName: str | None = None
    stations: list[BikeStation] = []


class ContextResponse(BaseModel):
    coordinates: Coordinates
    weather: WeatherContext | None = None
    airQuality: AirQualityContext | None = None
    bikeSharing: BikeSharingContext | None = None
    timestamp: str
