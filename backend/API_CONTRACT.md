# ODYSSEIO API Contract

This document provides the authoritative contract between the **ODYSSEIO Next.js Frontend** and the **ODYSSEIO FastAPI Backend**.

All endpoints are versioned under `/api/v1` (with `/health` also available at the root).

---

## 1. Base Configuration

- **Local Base URL:** `http://localhost:8000`
- **Swagger / Interactive Docs:** `http://localhost:8000/docs`
- **OpenAPI Schema:** `http://localhost:8000/openapi.json`
- **CORS Allowed Origins:** `http://localhost:3000`, `http://127.0.0.1:3000`
- **Content-Type:** `application/json`

---

## 2. Common Data Types

### `Category`
```typescript
type Category =
  | "cafe"
  | "food"
  | "culture"
  | "history"
  | "nature"
  | "architecture"
  | "photography"
  | "shopping"
  | "hidden-gem"
  | "art"
  | "nightlife";
```

### `Pace`
```typescript
type Pace = "relaxed" | "balanced" | "packed";
```

### `Transport`
```typescript
type Transport = "walking" | "public" | "cycling" | "mixed";
```

### `Coordinates`
```json
{
  "lat": 48.8566,
  "lng": 2.3522
}
```

### `Place`
```json
{
  "id": "geo-48.86060-2.33760",
  "name": "Musée du Louvre",
  "city": "Paris",
  "country": "France",
  "description": "World-famous historic art museum and former royal palace.",
  "category": "art",
  "tags": ["museum", "art", "culture"],
  "coordinates": { "lat": 48.8606, "lng": 2.3376 },
  "imageUrl": "https://images.unsplash.com/...",
  "rating": 4.8,
  "reviewCount": 3200,
  "estimatedVisitMinutes": 60,
  "openingHours": { "open": "09:00", "close": "18:00", "days": "Mon-Sun" },
  "address": "Rue de Rivoli, 75001 Paris",
  "isSaved": false
}
```

---

## 3. Endpoints

### 3.1 Health Check
**`GET /health`** or **`GET /api/v1/health`**

Response (`200 OK`):
```json
{
  "status": "healthy",
  "version": "0.1.0",
  "environment": "development",
  "database": "connected",
  "timestamp": "2026-10-27T18:00:00Z"
}
```

Curl:
```bash
curl -X GET http://localhost:8000/api/v1/health
```

---

### 3.2 Place Discovery
**`GET /api/v1/places`**

Query Parameters:
| Param | Type | Required | Description |
|---|---|---|---|
| `lat` | float | Optional* | Latitude (-90 to 90) |
| `lng` | float | Optional* | Longitude (-180 to 180) |
| `city` | string | Optional* | City name (e.g. "Paris") |
| `categories` | string | Optional | Comma-separated categories (e.g. `art,food`) |
| `query` | string | Optional | Search query string |
| `radius` | int | Optional | Radius in meters (default: 5000) |

*Either `lat` and `lng`, or a recognized `city` name must be provided.

Response (`200 OK`):
```json
{
  "places": [
    {
      "id": "geo-48.86060-2.33760",
      "name": "Louvre Museum",
      "city": "Paris",
      "country": "France",
      "description": "Historic art museum",
      "category": "art",
      "tags": ["museum"],
      "coordinates": { "lat": 48.8606, "lng": 2.3376 },
      "imageUrl": "",
      "rating": 4.8,
      "reviewCount": 1500,
      "estimatedVisitMinutes": 60,
      "address": "Rue de Rivoli, 75001 Paris",
      "isSaved": false
    }
  ],
  "count": 1,
  "source": "geoapify"
}
```

Curl:
```bash
curl -X GET "http://localhost:8000/api/v1/places?lat=48.8566&lng=2.3522&categories=art,nature"
```

---

### 3.3 Environmental Context (Weather & Bike Sharing)
**`GET /api/v1/context`**

Query Parameters:
| Param | Type | Required | Description |
|---|---|---|---|
| `lat` | float | Yes | Latitude |
| `lng` | float | Yes | Longitude |

Response (`200 OK`):
```json
{
  "coordinates": { "lat": 48.8566, "lng": 2.3522 },
  "weather": {
    "current": {
      "temperature": 18.5,
      "weatherCode": 1,
      "windSpeed": 11.2,
      "isDay": true,
      "description": "Mainly clear"
    },
    "forecast": [
      {
        "date": "2026-10-27",
        "maxTemp": 21.0,
        "minTemp": 12.0,
        "precipitationProbability": 10,
        "weatherCode": 1
      }
    ]
  },
  "airQuality": {
    "aqi": 28,
    "pm25": 9.2,
    "pm10": 16.4,
    "category": "Fair"
  },
  "bikeSharing": {
    "available": true,
    "networkName": "Vélib' Métropole",
    "stations": [
      {
        "id": "station-102",
        "name": "Pont Neuf",
        "freeBikes": 8,
        "emptySlots": 14,
        "coordinates": { "lat": 48.857, "lng": 2.342 },
        "distanceMeters": 180
      }
    ]
  },
  "timestamp": "2026-10-27T18:00:00Z"
}
```

Curl:
```bash
curl -X GET "http://localhost:8000/api/v1/context?lat=48.8566&lng=2.3522"
```

---

### 3.4 Generate Itinerary
**`POST /api/v1/itineraries`**

Request JSON:
```json
{
  "destination": "Paris",
  "startLocation": "Hôtel de Ville",
  "startCoordinates": { "lat": 48.8566, "lng": 2.3522 },
  "returnLocation": "Hôtel de Ville",
  "returnCoordinates": { "lat": 48.8566, "lng": 2.3522 },
  "startTime": "09:00",
  "returnTime": "13:00",
  "safetyBufferMinutes": 15,
  "interests": ["art", "nature", "cafe"],
  "pace": "balanced",
  "transport": "walking"
}
```

Response (`201 Created`):
```json
{
  "id": "d8e3b4a2-11c5-4a12-87ff-43b9287361a0",
  "title": "Balanced Adventure in Paris",
  "city": "Paris",
  "date": "2026-10-27",
  "startTime": "09:00",
  "returnDeadline": "13:00",
  "safetyBufferMinutes": 15,
  "pace": "balanced",
  "transport": "walking",
  "totalMinutes": 210,
  "explorationMinutes": 150,
  "travelMinutes": 60,
  "returnLegMinutes": 12,
  "interests": ["art", "nature", "cafe"],
  "status": "upcoming",
  "createdAt": "2026-10-27T18:00:00Z",
  "centerCoordinates": { "lat": 48.8566, "lng": 2.3522 },
  "warnings": [],
  "stops": [
    {
      "id": "stop-1-geo-48.86",
      "place": {
        "id": "geo-48.86060-2.33760",
        "name": "Musée du Louvre",
        "city": "Paris",
        "category": "art",
        "coordinates": { "lat": 48.8606, "lng": 2.3376 },
        "rating": 4.8,
        "reviewCount": 2500,
        "estimatedVisitMinutes": 60,
        "address": "Rue de Rivoli, 75001 Paris"
      },
      "arrivalTime": "09:15",
      "departureTime": "10:15",
      "travelTimeFromPrev": 15,
      "travelDistanceFromPrev": 1200,
      "status": "upcoming",
      "notes": "Planned visit of 60m via walking."
    }
  ]
}
```

Curl:
```bash
curl -X POST http://localhost:8000/api/v1/itineraries \
  -H "Content-Type: application/json" \
  -d '{
    "destination": "Paris",
    "startLocation": "Hôtel de Ville",
    "startCoordinates": {"lat": 48.8566, "lng": 2.3522},
    "startTime": "09:00",
    "returnTime": "13:00",
    "safetyBufferMinutes": 15,
    "interests": ["art", "nature", "cafe"],
    "pace": "balanced",
    "transport": "walking"
  }'
```

---

### 3.5 Retrieve Saved Itinerary
**`GET /api/v1/itineraries/{id}`**

Response (`200 OK`): Returns `Itinerary` object (same structure as 3.4).

Curl:
```bash
curl -X GET http://localhost:8000/api/v1/itineraries/d8e3b4a2-11c5-4a12-87ff-43b9287361a0
```

---

### 3.6 Replan Itinerary
**`POST /api/v1/itineraries/{id}/replan`**

Request JSON:
```json
{
  "completedStopIds": ["stop-1-geo-48.86"],
  "skippedStopIds": [],
  "remainingMinutes": 75,
  "currentCoordinates": { "lat": 48.8606, "lng": 2.3376 },
  "updatedPace": "balanced",
  "updatedTransport": "walking",
  "updatedInterests": ["nature", "cafe"]
}
```

Response (`200 OK`): Returns updated `Itinerary` with preserved completed stops, skipped stops flagged, and remaining schedule guaranteed to hit return deadline.

Curl:
```bash
curl -X POST http://localhost:8000/api/v1/itineraries/d8e3b4a2-11c5-4a12-87ff-43b9287361a0/replan \
  -H "Content-Type: application/json" \
  -d '{
    "completedStopIds": ["stop-1-geo-48.86"],
    "remainingMinutes": 75
  }'
```

---

### 3.7 Journeys List & Management
- **`GET /api/v1/journeys?limit=50&offset=0`**: Returns `List[Itinerary]`
- **`DELETE /api/v1/journeys/{id}`**: Returns `204 No Content`

---

### 3.8 Saved Places
- **`GET /api/v1/saved-places`**: Returns `List[Place]`
- **`POST /api/v1/saved-places`**: Toggles save status
  ```json
  {
    "place": { ...Place object... },
    "notes": "Optional notes"
  }
  ```
- **`DELETE /api/v1/saved-places/{place_id}`**: Returns `204 No Content`

---

### 3.9 Telegram Notifications (Optional)
**`POST /api/v1/notifications/telegram`**

Request JSON:
```json
{
  "itineraryId": "d8e3b4a2-11c5-4a12-87ff-43b9287361a0",
  "chatId": "123456789",
  "customMessage": "Here is my ODYSSEIO trip for today!"
}
```

Response (`200 OK`):
```json
{
  "success": true,
  "message": "Notification sent successfully.",
  "messageId": 104
}
```

---

## 4. Error Responses

All API errors return consistent JSON structures:

```json
{
  "error": "FEASIBILITY_ERROR",
  "message": "Insufficient time window: 20m total minus 15m safety buffer leaves only 5m.",
  "details": {}
}
```

HTTP Status Codes:
- `400 Bad Request`: Invalid parameters or coordinates.
- `404 Not Found`: Resource (itinerary, journey, place) does not exist.
- `422 Unprocessable Content`: Itinerary infeasible or time window insufficient.
- `502 Bad Gateway`: External provider error or outage.
- `500 Internal Server Error`: Server failure.
