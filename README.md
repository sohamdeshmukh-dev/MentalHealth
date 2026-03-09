# MentalMap

A 3D interactive emotional skyline platform where stress reports rise from the map as vertical extrusions like skyscrapers, and mood data glows as a Snap Map-style heatmap across 11 US cities.

## Features

- **3D Stress Skyline** -- Mood reports are aggregated into a spatial grid; each cell becomes a vertical column. Stressed/overwhelmed areas produce tall red/orange towers, calm/happy areas produce short blue/green pillars. Dense clusters stack taller.
- **Snap Map Heatmap** -- Ground-level glow layer beneath the skyline columns. Cool blues for calm zones, warm reds for stressed zones, visible at all zoom levels.
- **300-500 Demo Points Per City** -- Randomly generated clustered data with hot-zone bias so the skyline is immediately visible on load. Each city regenerates data when switching.
- **Custom Light Map** -- Mapbox style `mapbox://styles/soso593/cmmh6jzoe003m01qn8f00gog6`.
- **City Mask** -- Inverted polygon mask fades everything outside the city's urban boundary.
- **Arrow Navigation** -- Left/right controls on the map + keyboard arrow keys to fly between cities.
- **11 Supported Cities** -- NYC (default), LA, Chicago, Houston, Phoenix, Philadelphia, San Antonio, San Diego, Dallas, Jacksonville, Charlottesville.
- **Tilt, Rotate, Zoom** -- 60-degree pitch with terrain exaggeration for exploring the 3D skyline.
- **Feelings Check-In** -- Select mood + optional anonymous message. New submissions appear as skyline columns and heatmap intensity in real time.

## How the Skyline Works

Raw check-in points are aggregated into a grid (`lib/gridAggregator.ts`). Each grid cell becomes a small polygon with:
- **Height** = f(average stress weight, report density) -- more reports and higher stress = taller column
- **Color** = interpolated from blue (calm) through green, yellow, orange, to red (overwhelmed)

This solves the Mapbox limitation where `fill-extrusion` requires polygon geometry (points are silently ignored).

## Tech Stack

- **Framework:** Next.js 16 (App Router) + TypeScript
- **Styling:** Tailwind CSS v4
- **Map:** Mapbox GL JS (3D terrain, fill-extrusion, heatmap layers)
- **Geometry:** @turf/circle for city masks
- **Backend:** Next.js API Routes + in-memory store with seed data

## Getting Started

```bash
npm install
npm run dev
```

Add your Mapbox token to `.env.local`:
```
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_token_here
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
app/
  api/checkins/route.ts     # GET/POST API (?city= filter)
  globals.css               # Light theme + Mapbox overrides
  layout.tsx                # Root layout
  page.tsx                  # Sidebar + 3D map + navigator overlay
components/
  Map3DView.tsx             # Mapbox 3D map: skyline extrusions, heatmap, mask
  CityNavigator.tsx         # Arrow navigation overlay
  MoodForm.tsx              # Mood selection + message form
  HeatmapLegend.tsx         # Color gradient legend
  Sidebar.tsx               # Sidebar panel
lib/
  gridAggregator.ts         # Aggregates points into polygon grid for extrusions
  cityMask.ts               # Inverted polygon mask per city
  store.ts                  # In-memory DB with 300-500 clustered seed points/city
  types.ts                  # Types, moods, city configs
```

## Future Improvements

- Persistent database (Firebase / Supabase)
- Sentiment analysis on messages
- Crisis resource auto-suggestions
- Time-animated heatmap playback
- Mobile-responsive layout

#Kaggle Datasets
- https://www.kaggle.com/datasets/vkocaman/mentalhealthcentersinusa
- https://catalog.data.gov/dataset/mental-health-treatement-facilities-locator

## License

MIT
