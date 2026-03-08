export type Mood = "Happy" | "Calm" | "Neutral" | "Stressed" | "Sad" | "Overwhelmed";

export interface CheckIn {
  id: string;
  mood: Mood;
  message: string;
  timestamp: string;
  lat: number;
  lng: number;
}

export interface Resource {
  id: string;
  name: string;
  type: "Hotline" | "Clinic" | "Support Group" | "Online";
  description: string;
  phone?: string;
  lat: number;
  lng: number;
}

export const MOODS: { label: Mood; color: string; icon: string }[] = [
  { label: "Happy", color: "#22c55e", icon: "😊" },
  { label: "Calm", color: "#3b82f6", icon: "😌" },
  { label: "Neutral", color: "#a855f7", icon: "😐" },
  { label: "Stressed", color: "#f97316", icon: "😰" },
  { label: "Sad", color: "#6366f1", icon: "😢" },
  { label: "Overwhelmed", color: "#ef4444", icon: "😵" },
];

export const SAMPLE_RESOURCES: Resource[] = [
  {
    id: "r1",
    name: "Crisis Text Line",
    type: "Hotline",
    description: "Text HOME to 741741 for free, 24/7 crisis counseling.",
    phone: "741741",
    lat: 40.7128,
    lng: -74.006,
  },
  {
    id: "r2",
    name: "NAMI Helpline",
    type: "Hotline",
    description: "Free information, referrals, and support for mental health.",
    phone: "1-800-950-6264",
    lat: 40.7580,
    lng: -73.9855,
  },
  {
    id: "r3",
    name: "Community Wellness Center",
    type: "Clinic",
    description: "Walk-in mental health clinic with sliding-scale fees.",
    lat: 40.7282,
    lng: -73.7949,
  },
  {
    id: "r4",
    name: "Mindful Peers",
    type: "Support Group",
    description: "Weekly peer support groups for anxiety and depression.",
    lat: 40.6892,
    lng: -74.0445,
  },
];
