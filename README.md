#To-Do List

1) Real-Time Emotional Weather 

Examples:
	•	Anxiety → storm clouds
	•	Calm → sunshine
	•	Sad → rain
	•	Happy → glowing areas

Instead of just heatmaps, show:
	•	emotion layers
	•	animated overlays

Example map layers:
	•	😰 Anxiety zones
	•	😔 Sadness clusters
	•	😌 Calm spaces
	•	😄 Happiness hotspots

Tech:
	•	Mapbox layers
	•	WebGL overlays

2) Safe Spaces Finder

Show places where people feel mentally safe.

Examples:
	•	parks
	•	libraries
	•	quiet cafés
	•	meditation rooms
	•	campus spaces

Users can tag locations with:

"calm"
"safe"
"quiet"
"good for studying"
"stressful"

3) Mood Journey Tracking
Let users see their emotional patterns over time.

Example dashboard:

Monday: stressed
Tuesday: anxious
Wednesday: calm
Thursday: calm
Friday: happy

Graph:

Mood Score vs Time

Then AI insights:

“You tend to feel stressed near the library during exam weeks.”

4) Anonymous Community Checkins

People can post anonymous emotional check-ins on the map.
Example bubble on map:

📍 Drexel Library
"I'm overwhelmed with finals."

Others can react:
	•	❤️ support
	•	🙏 same
	•	💬 advice

Think:

Reddit + Google Maps for emotions


5) AI Therapist + AI Copilot Based on Location 🤖

Combine map + AI therapist.

Example:

User opens map near campus.

AI says:

“Many people near you reported stress today. Want a 2-minute breathing exercise?”

Or:

“There is a quiet park 4 minutes away.”

This is context-aware AI.

7) AI mood Prediction(Individual/Community)

8) Daily AI Reflection(With Image)
After check-in:

AI generates reflection.

Example:

User logs mood: 😔

AI response:

“You’ve logged sadness three times this week. Would you like to talk about what’s causing it?”

This creates emotional engagement.

10) Suggest Breathing and meditation tools
Built-in tools.

Example:

2-minute breathing exercise
4-7-8 breathing
grounding exercises

Simple but useful.


12) Mental Health Score(Sentiment Anaylsis)
Users get a well-being score.

Based on:
	•	check-ins
	•	journaling
	•	outdoor time
	•	sleep input

Encourages healthy habits.

14) Crisis Detection, suggest future activities
If someone writes something dangerous:

AI flags:

"I'm thinking about hurting myself"

Then shows:
	•	crisis hotline
	•	campus support
	•	AI conversation

16) Emotion time Machine(move a time slider on the map)
Move a time slider on the map.

Example:

Now
Yesterday
Last Week
Exam Week

Watch emotional patterns shift.

18) Friends Tab

19) Stripe(monthly subscription)

20) Login Page OAuth(Google, Facebook)

21)Weather forecast(slider)

22) UI section roller at the top of the screen to switch tabs from mood section and friends

23) Add an integration for college students to see their colleges on the map and their specific data sets for the college


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
