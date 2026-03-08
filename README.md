# MentalMap

A 3D interactive mood heatmap platform where users can anonymously check in with how they're feeling across 10 major US cities. Built with a dark, calming UI designed for mental health awareness.

## Features

- **3D Map Visualization** -- Mapbox GL JS with terrain, 3D buildings, and globe projection
- **Mood Heatmap** -- Topographical heatmap layer (cool blues = calm, warm reds = stressed) similar to Snapchat Snap Map
- **Dark Mode UI** -- Full dark theme with soft accent colors and readable contrast
- **10 City Support** -- New York City, Los Angeles, Chicago, Houston, Phoenix, Philadelphia, San Antonio, San Diego, Dallas, Jacksonville
- **City Navigation** -- Arrow buttons and keyboard left/right arrows to switch between cities with smooth fly-to animations
- **Feelings Check-In** -- Select a mood (Happy, Calm, Neutral, Stressed, Sad, Overwhelmed) and optionally write a short anonymous message
- **Live Updates** -- Submitted moods appear immediately on the heatmap
- **Tilt, Rotate, Zoom** -- Full 3D map controls with pitched camera angle and terrain exaggeration
- **Recent Feed** -- Latest 12 anonymous check-ins shown per city in the sidebar

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4 (dark theme)
- **Map:** Mapbox GL JS with 3D terrain and heatmap layers
- **Backend:** Next.js API Routes with in-memory store

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

**Note:** You need a Mapbox access token. Replace the token in `components/Map3DView.tsx` with your own from [mapbox.com](https://www.mapbox.com/).

## Project Structure

```
app/
  api/checkins/route.ts     # GET/POST API (supports ?city= filter)
  globals.css               # Dark theme styles + Mapbox overrides
  layout.tsx                # Root layout (dark mode)
  page.tsx                  # Homepage: sidebar + 3D map
components/
  Map3DView.tsx             # Mapbox GL 3D map with heatmap + terrain
  CityNavigator.tsx         # City switcher with arrow navigation
  MoodForm.tsx              # Mood selection + anonymous message form
  HeatmapLegend.tsx         # Calm-to-stressed color gradient legend
  Sidebar.tsx               # Sidebar panel (navigator + form + feed)
lib/
  store.ts                  # In-memory mock DB with seed data
  types.ts                  # Types, mood config, city coordinates
```

## Supported Cities

| City | State |
|------|-------|
| New York City | NY |
| Los Angeles | CA |
| Chicago | IL |
| Houston | TX |
| Phoenix | AZ |
| Philadelphia | PA |
| San Antonio | TX |
| San Diego | CA |
| Dallas | TX |
| Jacksonville | FL |

## API

### `GET /api/checkins?city=New+York+City`
Returns check-ins filtered by city (or all if no city param).

### `POST /api/checkins`
```json
{
  "mood": "Stressed",
  "message": "Long day at work",
  "city": "Chicago"
}
```

## Future Improvements

- **Persistent Database** -- Replace in-memory store with Firebase or Supabase
- **Sentiment Analysis** -- Analyze message text to detect crisis signals
- **Crisis Resource Suggestions** -- Auto-suggest hotlines when negative moods are detected
- **Time-Based Heatmap** -- Animate mood data over time
- **Mobile Responsive** -- Collapsible sidebar for mobile views

#Kaggle Datasets
- https://www.kaggle.com/datasets/vkocaman/mentalhealthcentersinusa
- https://catalog.data.gov/dataset/mental-health-treatement-facilities-locator

## License

MIT
