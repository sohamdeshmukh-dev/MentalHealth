export type Mood = "Happy" | "Calm" | "Neutral" | "Stressed" | "Sad" | "Overwhelmed";

export interface CheckIn {
  id: string;
  mood: Mood;
  message: string;
  timestamp: number;
  lat: number;
  lng: number;
  city: string;
  hugs?: number;
  campus_name?: string;
  user_id?: string | null;
  college_id?: string | null;
}

export interface College {
  id: string;
  name: string;
  city: string;
  latitude: number;
  longitude: number;
  campus_radius: number;
}

export interface CampusEmotionDistributionItem {
  emotion: Mood;
  count: number;
  share: number;
}

export interface CampusTrendPoint {
  date: string;
  average_score: number;
  checkin_count: number;
}

export interface CampusWindowTrend {
  average_score: number;
  checkin_count: number;
}

export interface CampusEmotionResponse {
  college_id: string;
  college_name: string;
  city: string;
  participant_count: number;
  min_participants_required: number;
  redacted: boolean;
  emotion_distribution: CampusEmotionDistributionItem[];
  checkin_count: number;
  trend_data: CampusTrendPoint[];
  top_reported_emotions: CampusEmotionDistributionItem[];
  top_emotions?: { emotion: string; percentage: number }[];
  overall_vibe?: string;
  recent_checkins?: number;
  total_checkins?: number;
  checkins_count?: number;
  students_on_platform?: number;
  student_count?: number;
  recent_mood_trends: {
    today: CampusWindowTrend;
    week: CampusWindowTrend;
    month: CampusWindowTrend;
  } | null;
  heatmap_points: Array<{
    lat: number;
    lng: number;
    mood: Mood;
    weight: number;
    intensity: number;
  }>;
}

export interface Resource {
  name: string;
  address1: string;
  lat: number;
  lng: number;
  phone?: string;
}

export interface CityConfig {
  name: string;
  state: string;
  lat: number;
  lng: number;
  radius: number; // km — approximate urban area radius for mask
}

export const MOODS: { label: Mood; color: string; icon: string; weight: number }[] = [
  { label: "Calm", color: "#60a5fa", icon: "😌", weight: 0.1 },
  { label: "Happy", color: "#34d399", icon: "😊", weight: 0.25 },
  { label: "Neutral", color: "#a78bfa", icon: "😐", weight: 0.4 },
  { label: "Sad", color: "#fbbf24", icon: "😢", weight: 0.55 },
  { label: "Overwhelmed", color: "#fb923c", icon: "😵", weight: 0.7 },
  { label: "Stressed", color: "#ef4444", icon: "😰", weight: 0.85 },
];

export const CITIES: CityConfig[] = [
  { name: "New York City", state: "NY", lat: 40.7128, lng: -74.006, radius: 18 },
  { name: "Los Angeles", state: "CA", lat: 34.0522, lng: -118.2437, radius: 25 },
  { name: "Chicago", state: "IL", lat: 41.8781, lng: -87.6298, radius: 18 },
  { name: "Houston", state: "TX", lat: 29.7604, lng: -95.3698, radius: 22 },
  { name: "Phoenix", state: "AZ", lat: 33.4484, lng: -112.074, radius: 20 },
  { name: "Philadelphia", state: "PA", lat: 39.9526, lng: -75.1652, radius: 14 },
  { name: "San Antonio", state: "TX", lat: 29.4241, lng: -98.4936, radius: 18 },
  { name: "San Diego", state: "CA", lat: 32.7157, lng: -117.1611, radius: 16 },
  { name: "Dallas", state: "TX", lat: 32.7767, lng: -96.797, radius: 18 },
  { name: "Jacksonville", state: "FL", lat: 30.3322, lng: -81.6557, radius: 24 },
  { name: "Charlottesville", state: "VA", lat: 38.0293, lng: -78.4767, radius: 10 },
];

export const MOOD_WEIGHT: Record<string, number> = {
  Happy: 0.1,
  Calm: 0.2,
  Neutral: 0.4,
  Stressed: 0.7,
  Sad: 0.85,
  Overwhelmed: 1.0,
};

export const MOOD_INTENSITY: Record<string, number> = {
  Happy: 0.1,
  Calm: 0.2,
  Neutral: 0.4,
  Stressed: 0.7,
  Sad: 0.8,
  Overwhelmed: 1.0,
};

export interface Friend {
  id: string;
  friend_id: string;
  profile?: any;
  display_name?: string;
  avatar_url?: string;
  unique_code?: string;
  college_id?: string;
  college_name?: string;
  entry_count: number;
}
