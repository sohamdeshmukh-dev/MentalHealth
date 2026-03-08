# MentalMap

An interactive map-based mental health platform where users can view local mental health resources and anonymously check in with how they're feeling.

## Features

- **Interactive Map** -- Leaflet-powered map showing mood check-ins and mental health resources
- **Feelings Check-In** -- Select your mood (Happy, Calm, Neutral, Stressed, Sad, Overwhelmed) and optionally write a short anonymous message
- **Automatic Location** -- Captures approximate lat/lng via browser geolocation (falls back to random coords if denied)
- **Live Markers** -- Submitted moods appear as color-coded circle markers on the map
- **Resource Directory** -- Sidebar lists mental health resources (hotlines, clinics, support groups) with map markers
- **Recent Check-Ins Feed** -- View the 10 most recent anonymous submissions in the sidebar

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **Map:** Leaflet + react-leaflet
- **Backend:** Next.js API Routes with in-memory store (mock database)

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
mentalmap/
  app/
    api/checkins/route.ts   # GET/POST API for mood check-ins
    globals.css             # Global styles + Tailwind
    layout.tsx              # Root layout with metadata
    page.tsx                # Homepage with map + sidebar
  components/
    MapView.tsx             # Leaflet map with mood & resource markers
    MoodForm.tsx            # Feelings check-in form
    ResourceCard.tsx        # Resource info card
    Sidebar.tsx             # Sidebar panel (form + feed + resources)
  lib/
    store.ts                # In-memory mock database
    types.ts                # TypeScript types, mood config, sample data
```

## API

### `GET /api/checkins`
Returns all check-ins sorted by most recent.

### `POST /api/checkins`
Submit a new check-in.

**Body:**
```json
{
  "mood": "Happy",
  "message": "Feeling great today!",
  "lat": 40.7128,
  "lng": -74.006
}
```

## Future Improvements

- **Persistent Database** -- Replace in-memory store with Firebase, Supabase, or PostgreSQL
- **Sentiment Analysis** -- Analyze message text to detect crisis signals
- **Crisis Resource Suggestions** -- Auto-suggest hotlines when negative moods are detected
- **Community Mood Heatmap** -- Aggregate moods into a heatmap layer on the map
- **Time-Based Trends** -- Charts showing mood trends over time by region
- **User Accounts** -- Optional accounts for tracking personal mood history
- **Mobile Responsive** -- Collapsible sidebar for mobile/tablet views

#Kaggle Datasets
- https://www.kaggle.com/datasets/vkocaman/mentalhealthcentersinusa

## License

MIT
