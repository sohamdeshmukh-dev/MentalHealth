export type Mood = "Happy" | "Calm" | "Neutral" | "Stressed" | "Sad" | "Overwhelmed";

export interface CheckIn {
  id: string;
  mood: Mood;
  message: string;
  timestamp: string;
  lat: number;
  lng: number;
  city: string;
}

export interface CityConfig {
  name: string;
  state: string;
  lat: number;
  lng: number;
}

export const MOODS: { label: Mood; color: string; heatColor: string; icon: string; weight: number }[] = [
  { label: "Happy", color: "#34d399", heatColor: "#06b6d4", icon: "😊", weight: 0.2 },
  { label: "Calm", color: "#60a5fa", heatColor: "#3b82f6", icon: "😌", weight: 0.1 },
  { label: "Neutral", color: "#a78bfa", heatColor: "#8b5cf6", icon: "😐", weight: 0.4 },
  { label: "Stressed", color: "#fb923c", heatColor: "#f97316", icon: "😰", weight: 0.7 },
  { label: "Sad", color: "#818cf8", heatColor: "#ef4444", icon: "😢", weight: 0.8 },
  { label: "Overwhelmed", color: "#f87171", heatColor: "#dc2626", icon: "😵", weight: 1.0 },
];

export const CITIES: CityConfig[] = [
  { name: "New York City", state: "NY", lat: 40.7128, lng: -74.006 },
  { name: "Los Angeles", state: "CA", lat: 34.0522, lng: -118.2437 },
  { name: "Chicago", state: "IL", lat: 41.8781, lng: -87.6298 },
  { name: "Houston", state: "TX", lat: 29.7604, lng: -95.3698 },
  { name: "Phoenix", state: "AZ", lat: 33.4484, lng: -112.074 },
  { name: "Philadelphia", state: "PA", lat: 39.9526, lng: -75.1652 },
  { name: "San Antonio", state: "TX", lat: 29.4241, lng: -98.4936 },
  { name: "San Diego", state: "CA", lat: 32.7157, lng: -117.1611 },
  { name: "Dallas", state: "TX", lat: 32.7767, lng: -96.797 },
  { name: "Jacksonville", state: "FL", lat: 30.3322, lng: -81.6557 },
];
