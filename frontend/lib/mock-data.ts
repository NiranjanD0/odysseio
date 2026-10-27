import type { Place, Destination, Itinerary } from "@/types";

// ─── Places ────────────────────────────────────────────────────────────────

export const MOCK_PLACES: Place[] = [
  {
    id: "p1",
    name: "Café de Flore",
    city: "Paris",
    country: "France",
    description:
      "One of the oldest and most prestigious coffeehouses in Paris, beloved by artists and intellectuals since the 1880s. Famous for its art deco interior and literary heritage.",
    category: "cafe",
    tags: ["iconic", "literary", "historic", "coffee"],
    coordinates: { lat: 48.8543, lng: 2.3327 },
    imageUrl:
      "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&auto=format&fit=crop&q=80",
    rating: 4.5,
    reviewCount: 2841,
    estimatedVisitMinutes: 45,
    openingHours: { open: "07:30", close: "01:30", days: "Daily" },
    address: "172 Boulevard Saint-Germain, 75006 Paris",
  },
  {
    id: "p2",
    name: "Musée d'Orsay",
    city: "Paris",
    country: "France",
    description:
      "A masterpiece of Beaux-Arts architecture housed in a former railway station, showcasing the world's largest collection of Impressionist and Post-Impressionist art.",
    category: "culture",
    tags: ["museum", "impressionism", "art", "must-see"],
    coordinates: { lat: 48.8599, lng: 2.3266 },
    imageUrl:
      "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=800&auto=format&fit=crop&q=80",
    rating: 4.8,
    reviewCount: 18420,
    estimatedVisitMinutes: 120,
    openingHours: { open: "09:30", close: "18:00", days: "Tue–Sun" },
    address: "1 Rue de la Légion d'Honneur, 75007 Paris",
  },
  {
    id: "p3",
    name: "Rue Crémieux",
    city: "Paris",
    country: "France",
    description:
      "A charming cobblestone street lined with colourful pastel houses that seems straight out of a fairy tale. A favourite haunt of photographers and Instagram lovers.",
    category: "photography",
    tags: ["colourful", "picturesque", "residential", "hidden"],
    coordinates: { lat: 48.8484, lng: 2.3677 },
    imageUrl:
      "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&auto=format&fit=crop&q=80",
    rating: 4.3,
    reviewCount: 976,
    estimatedVisitMinutes: 30,
    address: "Rue Crémieux, 75012 Paris",
  },
  {
    id: "p4",
    name: "Marché des Enfants Rouges",
    city: "Paris",
    country: "France",
    description:
      "The oldest covered market in Paris, dating to 1615. A lively food market offering everything from Moroccan tagines to Japanese bento and classic French cheese.",
    category: "food",
    tags: ["market", "local", "food hall", "historic"],
    coordinates: { lat: 48.8633, lng: 2.3619 },
    imageUrl:
      "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80",
    rating: 4.6,
    reviewCount: 3102,
    estimatedVisitMinutes: 60,
    openingHours: { open: "08:30", close: "20:00", days: "Tue–Sun" },
    address: "39 Rue de Bretagne, 75003 Paris",
  },
  {
    id: "p5",
    name: "Parc des Buttes-Chaumont",
    city: "Paris",
    country: "France",
    description:
      "A sprawling, dramatically landscaped park in north-east Paris with cliffs, a lake, a temple-crowned island, and sweeping views across the city.",
    category: "nature",
    tags: ["park", "views", "lake", "peaceful"],
    coordinates: { lat: 48.8785, lng: 2.3821 },
    imageUrl:
      "https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=800&auto=format&fit=crop&q=80",
    rating: 4.7,
    reviewCount: 5629,
    estimatedVisitMinutes: 75,
    address: "1 Rue Botzaris, 75019 Paris",
  },
  {
    id: "p6",
    name: "Sainte-Chapelle",
    city: "Paris",
    country: "France",
    description:
      "A Gothic royal chapel renowned for its breathtaking 15 stained-glass windows that bathe the interior in a kaleidoscope of colour on sunny days.",
    category: "history",
    tags: ["gothic", "stained glass", "medieval", "chapel"],
    coordinates: { lat: 48.8554, lng: 2.3451 },
    imageUrl:
      "https://images.unsplash.com/photo-1549144511-f099e773c147?w=800&auto=format&fit=crop&q=80",
    rating: 4.7,
    reviewCount: 9874,
    estimatedVisitMinutes: 60,
    openingHours: { open: "09:00", close: "17:00", days: "Daily" },
    address: "8 Boulevard du Palais, 75001 Paris",
  },
  {
    id: "p7",
    name: "Printemps Haussmann",
    city: "Paris",
    country: "France",
    description:
      "An iconic Haussmann-era department store with a gorgeous Art Nouveau dome, stunning views from the rooftop terrace, and an unparalleled selection of French luxury brands.",
    category: "shopping",
    tags: ["luxury", "fashion", "rooftop", "art nouveau"],
    coordinates: { lat: 48.8754, lng: 2.3303 },
    imageUrl:
      "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&auto=format&fit=crop&q=80",
    rating: 4.2,
    reviewCount: 6411,
    estimatedVisitMinutes: 60,
    openingHours: { open: "09:30", close: "20:30", days: "Mon–Sat" },
    address: "64 Boulevard Haussmann, 75009 Paris",
  },
  {
    id: "p8",
    name: "Le Marais Street Art Trail",
    city: "Paris",
    country: "France",
    description:
      "A self-guided walk through the trendy Marais district discovering works by street artists including Invader, Miss Tic, and JonOne on the neighbourhood's medieval walls.",
    category: "art",
    tags: ["street art", "urban", "self-guided", "hidden-gem"],
    coordinates: { lat: 48.8561, lng: 2.3530 },
    imageUrl:
      "https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?w=800&auto=format&fit=crop&q=80",
    rating: 4.4,
    reviewCount: 1287,
    estimatedVisitMinutes: 50,
    address: "Le Marais, 75004 Paris",
  },
  // Tokyo places
  {
    id: "p9",
    name: "Tsukiji Outer Market",
    city: "Tokyo",
    country: "Japan",
    description:
      "A bustling seafood and produce market where you can sample ultra-fresh sushi, tamagoyaki, and street snacks alongside local vendors in a lively, authentic atmosphere.",
    category: "food",
    tags: ["sushi", "seafood", "market", "local", "breakfast"],
    coordinates: { lat: 35.6655, lng: 139.7707 },
    imageUrl:
      "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=800&auto=format&fit=crop&q=80",
    rating: 4.7,
    reviewCount: 12300,
    estimatedVisitMinutes: 90,
    openingHours: { open: "05:00", close: "14:00", days: "Mon–Sat" },
    address: "4-16-2 Tsukiji, Chuo City, Tokyo",
  },
  {
    id: "p10",
    name: "Senso-ji Temple",
    city: "Tokyo",
    country: "Japan",
    description:
      "Tokyo's oldest and most revered Buddhist temple in the Asakusa district, approached through the iconic Kaminarimon gate and Nakamise shopping street.",
    category: "history",
    tags: ["temple", "buddhist", "iconic", "traditional", "must-see"],
    coordinates: { lat: 35.7148, lng: 139.7967 },
    imageUrl:
      "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&auto=format&fit=crop&q=80",
    rating: 4.8,
    reviewCount: 31800,
    estimatedVisitMinutes: 60,
    address: "2-3-1 Asakusa, Taito City, Tokyo",
  },
  {
    id: "p11",
    name: "Shinjuku Gyoen Garden",
    city: "Tokyo",
    country: "Japan",
    description:
      "A serene 58-hectare garden combining French formal, English landscape, and Japanese traditional garden styles. Famous for cherry blossoms in spring and autumn colours.",
    category: "nature",
    tags: ["garden", "park", "cherry blossom", "peaceful"],
    coordinates: { lat: 35.6852, lng: 139.7100 },
    imageUrl:
      "https://images.unsplash.com/photo-1524413840807-0c3cb6fa808d?w=800&auto=format&fit=crop&q=80",
    rating: 4.6,
    reviewCount: 14200,
    estimatedVisitMinutes: 90,
    openingHours: { open: "09:00", close: "16:30", days: "Tue–Sun" },
    address: "11 Naitomachi, Shinjuku City, Tokyo",
  },
  {
    id: "p12",
    name: "TeamLab Planets",
    city: "Tokyo",
    country: "Japan",
    description:
      "An immersive digital art museum where you walk barefoot through rooms of reflecting water and extraordinary light installations that respond to your presence.",
    category: "art",
    tags: ["digital art", "immersive", "modern", "interactive"],
    coordinates: { lat: 35.6488, lng: 139.7832 },
    imageUrl:
      "https://images.unsplash.com/photo-1536924940846-227afb31e2a5?w=800&auto=format&fit=crop&q=80",
    rating: 4.9,
    reviewCount: 8900,
    estimatedVisitMinutes: 90,
    openingHours: { open: "10:00", close: "22:00", days: "Daily" },
    address: "6-1-16 Toyosu, Koto City, Tokyo",
  },
  // Barcelona places
  {
    id: "p13",
    name: "La Sagrada Família",
    city: "Barcelona",
    country: "Spain",
    description:
      "Gaudí's unfinished masterpiece: a UNESCO World Heritage basilica that has been under construction since 1882, featuring extraordinary organic facades and otherworldly towers.",
    category: "architecture",
    tags: ["gaudi", "cathedral", "unesco", "must-see", "iconic"],
    coordinates: { lat: 41.4036, lng: 2.1744 },
    imageUrl:
      "https://images.unsplash.com/photo-1583422409516-2895a77efded?w=800&auto=format&fit=crop&q=80",
    rating: 4.8,
    reviewCount: 45200,
    estimatedVisitMinutes: 90,
    openingHours: { open: "09:00", close: "19:00", days: "Daily" },
    address: "Carrer de Mallorca, 401, 08013 Barcelona",
  },
  {
    id: "p14",
    name: "La Barceloneta Beach",
    city: "Barcelona",
    country: "Spain",
    description:
      "Barcelona's most beloved urban beach, a 1.1km stretch of golden sand with beach bars, outdoor activities, and the backdrop of the city's skyline.",
    category: "nature",
    tags: ["beach", "swimming", "waterfront", "relaxation"],
    coordinates: { lat: 41.3788, lng: 2.1929 },
    imageUrl:
      "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=800&auto=format&fit=crop&q=80",
    rating: 4.5,
    reviewCount: 22100,
    estimatedVisitMinutes: 90,
    address: "La Barceloneta, 08003 Barcelona",
  },
  {
    id: "p15",
    name: "Boqueria Market",
    city: "Barcelona",
    country: "Spain",
    description:
      "One of Europe's most vibrant covered food markets overflowing with colourful fresh produce, tapas bars, fresh juices, Jamón, and seafood.",
    category: "food",
    tags: ["market", "tapas", "fresh produce", "local experience"],
    coordinates: { lat: 41.3818, lng: 2.1720 },
    imageUrl:
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&auto=format&fit=crop&q=80",
    rating: 4.3,
    reviewCount: 17800,
    estimatedVisitMinutes: 60,
    openingHours: { open: "08:00", close: "20:30", days: "Mon–Sat" },
    address: "La Rambla, 91, 08001 Barcelona",
  },
];

// ─── Destinations ──────────────────────────────────────────────────────────

export const MOCK_DESTINATIONS: Destination[] = [
  {
    id: "d1",
    city: "Paris",
    country: "France",
    imageUrl:
      "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&auto=format&fit=crop&q=80",
    description:
      "The City of Light — a seamless blend of grand boulevards, intimate neighbourhoods, world-class museums, and unbeatable café culture.",
    highlights: [
      "Eiffel Tower views",
      "World-class museums",
      "Legendary food scene",
      "Charming arrondissements",
    ],
    coordinates: { lat: 48.8566, lng: 2.3522 },
    popularCategories: ["culture", "food", "history", "cafe", "photography"],
    placeCount: 8,
  },
  {
    id: "d2",
    city: "Tokyo",
    country: "Japan",
    imageUrl:
      "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&auto=format&fit=crop&q=80",
    description:
      "A city that effortlessly weaves ancient temples with futuristic technology, offering every kind of experience from serene gardens to neon-lit nights.",
    highlights: [
      "Incredible street food",
      "Digital art museums",
      "Historic temples",
      "Vibrant neighbourhoods",
    ],
    coordinates: { lat: 35.6762, lng: 139.6503 },
    popularCategories: ["food", "culture", "history", "art", "nature"],
    placeCount: 4,
  },
  {
    id: "d3",
    city: "Barcelona",
    country: "Spain",
    imageUrl:
      "https://images.unsplash.com/photo-1583422409516-2895a77efded?w=800&auto=format&fit=crop&q=80",
    description:
      "Gaudí's city by the sea — where modernist architecture, tapas culture, golden beaches, and a buzzing nightlife all coexist in perfect harmony.",
    highlights: [
      "Gaudí masterpieces",
      "Tapas & seafood",
      "Urban beaches",
      "Gothic Quarter",
    ],
    coordinates: { lat: 41.3851, lng: 2.1734 },
    popularCategories: ["architecture", "food", "nature", "history", "culture"],
    placeCount: 3,
  },
  {
    id: "d4",
    city: "New York",
    country: "USA",
    imageUrl:
      "https://images.unsplash.com/photo-1500916434205-0c77489c6cf7?w=800&auto=format&fit=crop&q=80",
    description:
      "The city that never sleeps delivers an electrifying mix of world-famous landmarks, diverse neighbourhoods, cutting-edge art, and extraordinary food from every corner of the globe.",
    highlights: [
      "Iconic skyline",
      "Central Park",
      "World-class dining",
      "Broadway shows",
    ],
    coordinates: { lat: 40.7128, lng: -74.006 },
    popularCategories: ["culture", "food", "art", "architecture", "shopping"],
    placeCount: 0,
  },
  {
    id: "d5",
    city: "Kyoto",
    country: "Japan",
    imageUrl:
      "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&auto=format&fit=crop&q=80",
    description:
      "Japan's ancient imperial capital is a living museum of shrines, zen gardens, geisha districts, and bamboo groves that transport you to another era.",
    highlights: [
      "Thousand torii gates",
      "Bamboo forests",
      "Geisha district",
      "Zen gardens",
    ],
    coordinates: { lat: 35.0116, lng: 135.7681 },
    popularCategories: ["history", "culture", "nature", "photography", "food"],
    placeCount: 0,
  },
  {
    id: "d6",
    city: "Amsterdam",
    country: "Netherlands",
    imageUrl:
      "https://images.unsplash.com/photo-1512470876302-972faa2aa9a4?w=800&auto=format&fit=crop&q=80",
    description:
      "A city of canals, cycling culture, and world-class museums where every neighbourhood has its own distinct personality waiting to be explored.",
    highlights: [
      "Canal ring",
      "Rijksmuseum",
      "Bike culture",
      "Cosy brown cafés",
    ],
    coordinates: { lat: 52.3676, lng: 4.9041 },
    popularCategories: ["culture", "history", "cafe", "photography", "nature"],
    placeCount: 0,
  },
];

// ─── Sample Itinerary ──────────────────────────────────────────────────────

export const MOCK_ITINERARIES: Itinerary[] = [
  {
    id: "itin-1",
    title: "Morning in Le Marais",
    city: "Paris",
    date: "2026-11-15",
    startTime: "09:00",
    returnDeadline: "14:00",
    safetyBufferMinutes: 15,
    pace: "balanced",
    transport: "walking",
    totalMinutes: 300,
    explorationMinutes: 235,
    travelMinutes: 50,
    interests: ["food", "culture", "photography"],
    status: "upcoming",
    createdAt: "2026-10-27T12:00:00Z",
    centerCoordinates: { lat: 48.856, lng: 2.352 },
    stops: [
      {
        id: "s1",
        place: MOCK_PLACES[3], // Marché des Enfants Rouges
        arrivalTime: "09:00",
        departureTime: "10:00",
        travelTimeFromPrev: 0,
        status: "upcoming",
      },
      {
        id: "s2",
        place: MOCK_PLACES[7], // Le Marais Street Art Trail
        arrivalTime: "10:10",
        departureTime: "11:00",
        travelTimeFromPrev: 10,
        status: "upcoming",
      },
      {
        id: "s3",
        place: MOCK_PLACES[5], // Sainte-Chapelle
        arrivalTime: "11:20",
        departureTime: "12:20",
        travelTimeFromPrev: 20,
        status: "upcoming",
      },
      {
        id: "s4",
        place: MOCK_PLACES[0], // Café de Flore
        arrivalTime: "12:40",
        departureTime: "13:25",
        travelTimeFromPrev: 20,
        status: "upcoming",
      },
    ],
  },
  {
    id: "itin-2",
    title: "Tokyo in a Day",
    city: "Tokyo",
    date: "2026-10-10",
    startTime: "08:00",
    returnDeadline: "20:00",
    safetyBufferMinutes: 30,
    pace: "packed",
    transport: "public",
    totalMinutes: 720,
    explorationMinutes: 510,
    travelMinutes: 150,
    interests: ["history", "food", "art", "nature"],
    status: "completed",
    createdAt: "2026-10-05T09:00:00Z",
    centerCoordinates: { lat: 35.69, lng: 139.75 },
    stops: [
      {
        id: "s5",
        place: MOCK_PLACES[8], // Tsukiji
        arrivalTime: "08:00",
        departureTime: "09:30",
        travelTimeFromPrev: 0,
        status: "completed",
      },
      {
        id: "s6",
        place: MOCK_PLACES[9], // Senso-ji
        arrivalTime: "10:00",
        departureTime: "11:00",
        travelTimeFromPrev: 30,
        status: "completed",
      },
      {
        id: "s7",
        place: MOCK_PLACES[10], // Shinjuku Gyoen
        arrivalTime: "12:00",
        departureTime: "13:30",
        travelTimeFromPrev: 60,
        status: "completed",
      },
      {
        id: "s8",
        place: MOCK_PLACES[11], // TeamLab
        arrivalTime: "15:00",
        departureTime: "16:30",
        travelTimeFromPrev: 90,
        status: "completed",
      },
    ],
  },
  {
    id: "itin-3",
    title: "Barcelona Architecture Walk",
    city: "Barcelona",
    date: "2026-11-22",
    startTime: "10:00",
    returnDeadline: "18:00",
    safetyBufferMinutes: 20,
    pace: "relaxed",
    transport: "walking",
    totalMinutes: 480,
    explorationMinutes: 360,
    travelMinutes: 60,
    interests: ["architecture", "food", "nature"],
    status: "upcoming",
    createdAt: "2026-10-25T14:00:00Z",
    centerCoordinates: { lat: 41.385, lng: 2.173 },
    stops: [
      {
        id: "s9",
        place: MOCK_PLACES[12], // Sagrada Família
        arrivalTime: "10:00",
        departureTime: "11:30",
        travelTimeFromPrev: 0,
        status: "upcoming",
      },
      {
        id: "s10",
        place: MOCK_PLACES[14], // Boqueria
        arrivalTime: "12:00",
        departureTime: "13:00",
        travelTimeFromPrev: 30,
        status: "upcoming",
      },
      {
        id: "s11",
        place: MOCK_PLACES[13], // Barceloneta
        arrivalTime: "13:30",
        departureTime: "15:00",
        travelTimeFromPrev: 30,
        status: "upcoming",
      },
    ],
  },
];
