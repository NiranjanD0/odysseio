import httpx

from app.core.config import settings
from app.core.logging import logger
from app.schemas.context import (
    AirQualityContext,
    CurrentWeather,
    WeatherContext,
    WeatherForecast,
)

WMO_WEATHER_CODES: dict[int, str] = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Foggy",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    71: "Slight snow fall",
    73: "Moderate snow fall",
    75: "Heavy snow fall",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    95: "Thunderstorm",
}


class OpenMeteoClient:
    def __init__(self, timeout: float = 8.0):
        self.weather_url = settings.OPEN_METEO_BASE_URL + "/forecast"
        self.air_quality_url = settings.AIR_QUALITY_BASE_URL + "/air-quality"
        self.timeout = timeout

    async def get_weather(self, lat: float, lng: float) -> WeatherContext | None:
        params = {
            "latitude": lat,
            "longitude": lng,
            "current": "temperature_2m,weather_code,wind_speed_10m,is_day",
            "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
            "timezone": "auto",
        }
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.get(self.weather_url, params=params)
            if res.status_code != 200:
                logger.warning(f"Open-Meteo returned HTTP {res.status_code}")
                return None

            data = res.json()
            curr = data.get("current", {})
            current_weather = None
            if curr:
                code = curr.get("weather_code", 0)
                current_weather = CurrentWeather(
                    temperature=curr.get("temperature_2m", 0.0),
                    weatherCode=code,
                    windSpeed=curr.get("wind_speed_10m", 0.0),
                    isDay=bool(curr.get("is_day", 1)),
                    description=WMO_WEATHER_CODES.get(code, "Clear"),
                )

            daily = data.get("daily", {})
            forecast_list = []
            dates = daily.get("time", [])
            max_temps = daily.get("temperature_2m_max", [])
            min_temps = daily.get("temperature_2m_min", [])
            precip = daily.get("precipitation_probability_max", [])
            codes = daily.get("weather_code", [])

            for i in range(min(5, len(dates))):
                forecast_list.append(
                    WeatherForecast(
                        date=dates[i],
                        maxTemp=max_temps[i] if i < len(max_temps) else 0.0,
                        minTemp=min_temps[i] if i < len(min_temps) else 0.0,
                        precipitationProbability=precip[i]
                        if i < len(precip) and precip[i] is not None
                        else 0,
                        weatherCode=codes[i] if i < len(codes) else 0,
                    )
                )

            return WeatherContext(current=current_weather, forecast=forecast_list)
        except Exception as e:
            logger.warning(f"Failed to fetch Open-Meteo weather: {e}")
            return None

    async def get_air_quality(self, lat: float, lng: float) -> AirQualityContext | None:
        params = {
            "latitude": lat,
            "longitude": lng,
            "current": "european_aqi,pm10,pm2_5",
        }
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.get(self.air_quality_url, params=params)
            if res.status_code != 200:
                return None

            data = res.json()
            curr = data.get("current", {})
            if not curr:
                return None

            aqi = curr.get("european_aqi")
            pm10 = curr.get("pm10")
            pm25 = curr.get("pm2_5")

            category = "Good"
            if aqi is not None:
                if aqi <= 20:
                    category = "Good"
                elif aqi <= 40:
                    category = "Fair"
                elif aqi <= 60:
                    category = "Moderate"
                elif aqi <= 80:
                    category = "Poor"
                else:
                    category = "Very Poor"

            return AirQualityContext(
                aqi=aqi,
                pm25=pm25,
                pm10=pm10,
                category=category,
            )
        except Exception as e:
            logger.warning(f"Failed to fetch Open-Meteo air quality: {e}")
            return None
