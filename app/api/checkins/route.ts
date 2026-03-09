import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { CheckIn, Mood, MOODS, CITIES } from "@/lib/types";
import { detectCampus } from "@/lib/campusDetection";
import { v4 as uuidv4 } from "uuid";

async function insertCheckinWithSchemaFallback(entry: CheckIn) {
  const payload: Record<string, unknown> = { ...entry };
  const triedMissingCols = new Set<string>();

  for (let i = 0; i < 4; i++) {
    const { error } = await supabase.from("checkins").insert([payload]);
    if (!error) return null;

    const missingColMatch = error.message?.match(/Could not find the '([^']+)' column/);
    const missingCol = missingColMatch?.[1];

    if (!missingCol || triedMissingCols.has(missingCol) || !(missingCol in payload)) {
      return error;
    }

    triedMissingCols.add(missingCol);
    delete payload[missingCol];
  }

  return { message: "Insert failed after schema fallback attempts." };
}

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

  const lat = targetCity.lat + (Math.random() - 0.5) * 0.06;
  const lng = targetCity.lng + (Math.random() - 0.5) * 0.06;
  const campus = detectCampus(lat, lng);

  const entry: CheckIn = {
    id: uuidv4(),
    mood: mood as Mood,
    message: message?.slice(0, 280) ?? "",
    timestamp: Date.now(),
    lat,
    lng,
    city: targetCity.name,
    hugs: 0,
    campus_name: campus?.name,
  };

  const error = await insertCheckinWithSchemaFallback(entry);

  if (error) {
    return NextResponse.json(
      { error: error.message ?? "Unable to insert check-in." },
      { status: 500 }
    );
  }
  return NextResponse.json(entry, { status: 201 });
}
