import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { CheckIn, Mood, MOODS, CITIES } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";

export async function GET(request: NextRequest) {
  const city = request.nextUrl.searchParams.get("city");

  const query = supabase
    .from("checkins")
    .select("*")
    .order("timestamp", { ascending: false })
    .limit(50);

  if (city) query.eq("city", city);

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
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
    timestamp: Date.now(),
    lat: targetCity.lat + (Math.random() - 0.5) * 0.06,
    lng: targetCity.lng + (Math.random() - 0.5) * 0.06,
    city: targetCity.name,
  };

  const { error } = await supabase.from("checkins").insert([entry]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(entry, { status: 201 });
}
