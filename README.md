# ODYSSEIO

**Every minute, a new story.**

ODYSSEIO is an intelligent city-exploration companion designed for travelers who arrive in an unfamiliar city with limited time. It helps them discover interesting places, build a time-aware itinerary, and explore confidently while keeping their return deadline in mind.

> A little time. A whole new world.

## Overview

Planning a short visit to an unfamiliar city can be overwhelming. There may be dozens of places worth seeing, but only a few hours to explore them. ODYSSEIO turns that limited time into a practical, personalized adventure.

Travelers can provide their starting point, available time, return destination, interests, preferred pace, and transportation mode. ODYSSEIO can then discover relevant places, estimate travel time, organize stops into an itinerary, and help replan when circumstances change.

## Key Features

- **Personalized discovery:** Find cafés, cultural attractions, parks, photography spots, local food, and other points of interest based on travel preferences.
- **Time-aware itineraries:** Plan stops around the available time window, estimated travel durations, visit durations, and a return-time buffer.
- **Interactive map:** Explore recommended places and visualize the planned route.
- **Place details:** Review useful information such as a place's category, location, estimated visit duration, and available contextual information.
- **Live replanning:** Skip a stop, shorten an adventure, or recalculate the remaining itinerary when plans change.
- **Weather-aware exploration:** Use forecast information to help inform outdoor activity suggestions when data is available.
- **Air-quality context:** Surface available air-quality information to support more informed decisions.
- **Bike-share discovery:** Show nearby bike-sharing stations where supported.
- **Saved journeys and favorites:** Keep useful places and itineraries available for later.
- **Optional notifications:** Send trip updates through Telegram when notification setup is configured.

Feature availability depends on the APIs and services configured for the deployment.

## How It Works

1. **Set your starting point.** Choose a city and starting location, plus a return destination when needed.
2. **Set your time limit.** Provide a start time, return deadline, and preferred safety buffer.
3. **Choose your adventure.** Select interests, pace, and transportation preferences.
4. **Discover places.** ODYSSEIO retrieves relevant points of interest from configured data providers.
5. **Build an itinerary.** The itinerary engine evaluates place relevance and route durations to produce a schedule that fits the available time.
6. **Explore and adapt.** View the route, mark stops as completed, skip places, or replan the remaining journey.

## Design Philosophy

ODYSSEIO uses a consistent, warm visual identity inspired by travel journals and modern editorial design.

- **Oat cream:** `#F8F3E9`
- **Forest green:** `#315B48`
- **Sage:** `#DDEBDD`
- **Soft peach:** `#F5DCCF`
- **Lavender:** `#E8E1F3`
- **Paper white:** `#FFFFFF`

The design aims to feel playful without being childish, polished without being sterile, and consistent across desktop and mobile screens.

## Technology Stack

### Frontend
- React
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Leaflet / React Leaflet
- Lucide React

### Backend
- Java 21
- Spring Boot
- Spring Web
- Spring WebClient for external API calls
- Spring Data JPA
- Bean Validation
- Maven

### Data and Testing
- PostgreSQL
- Flyway database migrations
- JUnit 5
- Mockito
- Vitest and React Testing Library

The final versions and exact dependencies should match the implementation in the repository.

## External APIs and Services

ODYSSEIO is designed to integrate with the following services:

| Service | Intended use |
| --- | --- |
| [Geoapify](https://www.geoapify.com/) | Discover nearby places and points of interest |
| [Open-Meteo Weather API](https://open-meteo.com/) | Retrieve weather forecast information |
| [Open-Meteo Air Quality API](https://open-meteo.com/en/docs/air-quality-api) | Retrieve available air-quality information |
| [OSRM](https://project-osrm.org/) or another routing provider | Obtain supported route durations, distances, and geometry |
| [CityBikes](https://api.citybik.es/) | Discover bike-sharing networks and stations where supported |
| [Telegram Bot API](https://core.telegram.org/bots/api) | Optional trip notifications |

These are intended integrations, not a claim that every service is already configured or operational. Verify each provider's current coverage, API limits, response schema, attribution requirements, and terms before deployment. A routing provider's supported travel modes depend on the provider and its configuration.

## Itinerary Planning Principles

ODYSSEIO should account for the complete journey, not just the time spent at attractions.

The itinerary time budget includes:

- Travel from the starting point to the first stop
- Travel between selected stops
- Estimated visit duration at each stop
- Travel back to the return destination
- A user-configured safety buffer

A trip should be considered feasible only when these components fit within the user's available time window. Place rankings can consider interest match, variety, novelty, and travel cost. Route durations should come from a routing service where possible; straight-line distance should not be presented as actual travel time.

Travel times and visit durations are estimates and may change because of traffic, opening hours, crowds, weather, provider coverage, or other real-world conditions. Users should always be able to review the plan and adjust it.

## Getting Started

Setup instructions depend on the current repository configuration. In general, local development requires:

- A supported Java installation
- Maven
- Node.js and npm
- PostgreSQL
- API credentials for any services that require them

### Configuration

Keep credentials and deployment-specific settings in environment variables. Do not commit API keys, bot tokens, database passwords, or other secrets to version control.

Common configuration values may include:

```dotenv
DATABASE_URL=jdbc:postgresql://localhost:5432/odysseio
DB_USERNAME=postgres
DB_PASSWORD=replace-me
GEOAPIFY_API_KEY=replace-me
ROUTING_BASE_URL=replace-with-provider-url
TELEGRAM_BOT_TOKEN=
```

Configure the frontend's backend base URL using the environment-variable convention supported by the actual frontend setup. Only public configuration should be exposed to browser code. Private API credentials must remain on the backend.

Before running the application, create the database, configure the required environment variables, and follow the install and run scripts defined in the frontend and backend projects.

## API Overview

The backend is intended to expose versioned REST endpoints under `/api/v1`. The exact endpoints should be confirmed against the implementation.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/health` | Check backend health |
| `GET` | `/api/v1/places` | Discover nearby places |
| `GET` | `/api/v1/context` | Retrieve weather and air-quality context |
| `POST` | `/api/v1/itineraries` | Generate an itinerary |
| `GET` | `/api/v1/itineraries/{id}` | Retrieve an itinerary |
| `PATCH` | `/api/v1/itineraries/{id}` | Update itinerary preferences or stops |
| `POST` | `/api/v1/itineraries/{id}/replan` | Recalculate the remaining itinerary |
| `POST` | `/api/v1/itineraries/{id}/complete-stop` | Mark a stop as completed |
| `GET` | `/api/v1/journeys` | List saved journeys |
| `POST` | `/api/v1/favorites` | Save a favorite place |

This table describes the intended API surface. Remove or update endpoints that differ from the implemented backend before treating this README as API documentation.

## Reliability and Responsible Data Use

- Handle unavailable APIs, timeouts, rate limits, and incomplete responses gracefully.
- Clearly distinguish live provider data from estimates and demonstration data.
- Do not claim that a place is open unless reliable opening-hours data is available.
- Protect API credentials and validate all incoming requests.
- Configure authentication and authorization before exposing private saved journeys to multiple users.
- Respect provider terms, rate limits, attribution requirements, and data-retention policies.
- Provide useful error messages without exposing secrets or internal stack traces.

## Testing

Recommended coverage includes:

- Invalid coordinates and time windows
- Insufficient time to complete a proposed itinerary
- Return-buffer enforcement
- Duplicate or missing place results
- Routing and weather provider failures
- Replanning after a stop is skipped or completed
- Persistence and retrieval of saved journeys
- Responsive UI states, loading states, and API errors

Run the tests using the commands and scripts configured in the repository. Add exact commands here once the project configuration is finalized.

## Roadmap

- [ ] Complete the shared design system and responsive UI
- [ ] Implement place discovery
- [ ] Integrate route duration and geometry
- [ ] Build the time-constrained itinerary engine
- [ ] Add weather and air-quality context
- [ ] Persist journeys and favorites
- [ ] Implement stop completion and replanning
- [ ] Add optional bike-share and Telegram integrations
- [ ] Expand automated tests
- [ ] Deploy the frontend, backend, and database
- [ ] Add screenshots and a live demo link

## Contributing

Contributions and suggestions are welcome. For substantial changes, open an issue first to discuss the proposed improvement. Keep components reusable, preserve the shared design system, write tests for important logic, and never commit secrets.

## License

Choose and add a license before distributing the project publicly. Until a license is added to the repository, reuse and redistribution permissions may be limited.

---

**ODYSSEIO — Every minute, a new story.**
