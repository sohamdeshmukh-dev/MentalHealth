import { NextRequest, NextResponse } from "next/server";
import { addCheckIn, getAllCheckIns, getCheckInsByCity } from "@/lib/store";
import { CheckIn, Mood, MOODS, CITIES } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";

export async function GET(request: NextRequest) {
  const city = request.nextUrl.searchParams.get("city");
  if (city) {
    return NextResponse.json(getCheckInsByCity(city));
  }
  return NextResponse.json(getAllCheckIns());
}

export async function POST(request: Request) {
  const body = await request.json();

  const { mood, message, city } = body as {
    mood: string;
    message?: string;
    city?: string;
  };

  if (!mood || !MOODS.some((m) => m.label === mood)) {
    return NextResponse.json({ error: "Invalid mood" }, { status: 400 });
  }

  const targetCity = CITIES.find((c) => c.name === city) ?? CITIES[0];

  const entry: CheckIn = {
    id: uuidv4(),
    mood: mood as Mood,
    message: message?.slice(0, 280) ?? "",
    timestamp: new Date().toISOString(),
    lat: targetCity.lat + (Math.random() - 0.5) * 0.06,
    lng: targetCity.lng + (Math.random() - 0.5) * 0.06,
    city: targetCity.name,
  };

  addCheckIn(entry);
  return NextResponse.json(entry, { status: 201 });
}
