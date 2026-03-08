import { NextResponse } from "next/server";
import { addCheckIn, getAllCheckIns } from "@/lib/store";
import { CheckIn, Mood, MOODS } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  return NextResponse.json(getAllCheckIns());
}

export async function POST(request: Request) {
  const body = await request.json();

  const { mood, message, lat, lng } = body as {
    mood: string;
    message?: string;
    lat?: number;
    lng?: number;
  };

  if (!mood || !MOODS.some((m) => m.label === mood)) {
    return NextResponse.json({ error: "Invalid mood" }, { status: 400 });
  }

  const entry: CheckIn = {
    id: uuidv4(),
    mood: mood as Mood,
    message: message?.slice(0, 280) ?? "",
    timestamp: new Date().toISOString(),
    lat: lat ?? 40.7128 + (Math.random() - 0.5) * 0.05,
    lng: lng ?? -74.006 + (Math.random() - 0.5) * 0.05,
  };

  addCheckIn(entry);
  return NextResponse.json(entry, { status: 201 });
}
