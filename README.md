#To-Do List

✅1) Real-Time Emotional Weather 

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

✅2) Safe Spaces Finder

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

✅3) Mood Journey Tracking
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


5-6) AI Therapist + AI Copilot Based on Location 🤖

Combine map + AI therapist.

Example:

User opens map near campus.

AI says:

“Many people near you reported stress today. Want a 2-minute breathing exercise?”

Or:

“There is a quiet park 4 minutes away.”

This is context-aware AI.

7) AI mood Prediction(Individual/Community)

✅8) Daily AI Reflection(With Image)
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

✅18) Friends Tab

19) Stripe(monthly subscription)

20) Login Page OAuth(Google, Facebook)

21)Weather forecast(slider)

✅22) UI section roller at the top of the screen to switch tabs from the mood section and friends

✅23) Add an integration for college students to see their colleges on the map and their specific data sets for the college

✅24) Add some financial features for Capital One ( Ask AI for ideas)

✅25) IOS chat integration into the friends tab

26) Security measures:  Adding Rate limiting on all public endpoints(IP+user-based, sensible defaults, graceful 429s), Strict Input Validation & Sanitization on all user inputs(schema-based, type checks, length limits, reject unexpected fields), Secure API key handling( remove hardcoded keys, move to enviormental variables, rotate keys, ensure no keys are exposed to client side) Follow OWASP best practices, include clear comments, and do not break existing functionality.
    

1. Emotion Trails (Your Emotional Footprint)

Instead of just points on the map, show a trail of moods over time.

Example:

Home → 😌 calm  
Walk to class → 😐 neutral  
Library → 😰 stress  
Park → 😌 calm

Then render a color gradient path on the map.

Why this is cool:
	•	visually impressive
	•	shows emotional patterns tied to location

Tech idea:
	•	store check-ins with lat, lng, mood, timestamp
	•	draw path using Mapbox line layers

⸻

2. Mood Prediction AI

Use simple ML to predict emotional states.

Example:

“You usually report stress near the library at 11pm.”

Or:

“Your mood improves when you visit parks.”

Even a basic model like:

location + time of day + past mood → predicted mood

looks very impressive in a demo.

⸻

3. Emotion Augmented Reality Mode

Imagine pointing your phone camera and seeing emotions floating over places.

Example:

Library → 😰 stress
Park → 😌 calm
Gym → 😄 energy

Even if it’s simulated, judges love AR-style ideas.

⸻

4. AI Mood Companion

Instead of just a chatbot therapist, make it context aware.

Example:

User checks in with 😔

AI says:

“It looks like you’re near campus during midterms. Want a 2-minute grounding exercise?”

Or:

“Many users here feel stressed. You’re not alone.”

⸻

5. Emotional Time Machine

Add a timeline slider to the map.

User drags it:

Now
Yesterday
Last week
Finals week

Then watch emotional heatmaps change over time.

This makes the map feel alive.

⸻

6. Anonymous Emotional Confessions

Users can leave anonymous notes on the map.

Example:

📍 Library
"I'm so overwhelmed with exams."

Other people can react:

❤️ support
🙏 same
💬 encouragement

This builds community feeling.

⸻

7. Mental Health Routes

Let the app generate recommended walking routes for mood improvement.

Example:

User selects:

Goal: calm down

App suggests:

10-minute calming walk
Park → quiet street → river path

Combine with breathing prompts.

⸻

8. Emotional Soundscapes

When you enter a calm area, play ambient sounds.

Examples:

calm zone → birds
focus zone → rain
stress zone → breathing audio

This creates a very immersive experience.

⸻

9. AI Mood Summary

Every night, generate a daily emotional report.

Example:

“Today you visited 4 locations. Your mood improved after leaving the library and going outside. Consider studying in calmer places.”

Feels like AI journaling.

⸻

10. Crisis Detection

If someone writes something concerning:

"I want to disappear"
"I can't handle this anymore"

AI detects it and shows:

Campus support
988 hotline
Immediate chat

This adds real impact.

⸻

11. Global Emotional Map

Instead of just your campus, allow global emotion aggregation.

Imagine seeing:

NYC → high stress
California → calm
Campus → exam anxiety

Like weather for emotions.

⸻

12. Emotion Leaderboard (Fun Feature)

Gamify wellness.

Examples:

Most calm location
Most supportive users
Top mood improvement streak

Adds engagement.

⸻

13. AI Journal Generation

After mood check-in:

AI writes a short reflection:

“You’ve reported stress near academic buildings this week. It might help to take short breaks outside.”

This feels personalized and intelligent.

⸻

14. Emotional Clusters

Detect clusters of emotions using simple algorithms.

Example:

Cluster detected:
😰 Anxiety spike near campus library

Then show suggestions.

This adds data science vibes.

⸻

15. Emotion-Based Recommendations

Based on mood, suggest:

breathing exercises
meditation
walk
music
talk to AI therapist


⸻

If You Want the App to Look INSANE in the Demo

Focus on these 5 features:

1️⃣ Emotional weather overlays
2️⃣ Anonymous emotional notes on the map
3️⃣ AI therapist with location awareness
4️⃣ Mood prediction AI
5️⃣ Timeline emotional map

That combo feels very futuristic.

⸻

One Crazy Idea (Hackathon Winner Level)

Mental Health Radar

Open the map and see:

😰 stress cluster detected
😌 calm zone nearby
😔 sadness cluster

Then AI says:

“Exam stress is rising near campus tonight.”

It becomes like weather forecasting for emotions.

⸻

If you want, I can also show you 3 features that judges consistently give first place to at hackathons (they’re surprisingly simple but look insanely impressive).


# Aura Atlas

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
