import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { CITIES } from "@/lib/types";

interface CollegeRow {
  id: string;
  name: string;
  city: string;
  latitude: number;
  longitude: number;
  campus_radius: number;
}

const SUPPORTED_CITIES = new Set(CITIES.map((city) => city.name));

export async function GET(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const city = request.nextUrl.searchParams.get("city")?.trim();
  const queryText = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (city && !SUPPORTED_CITIES.has(city)) {
    return NextResponse.json({ error: "Unsupported city" }, { status: 400 });
  }

  let query = supabase
    .from("colleges")
    .select("id, name, city, latitude, longitude, campus_radius")
    .order("city", { ascending: true })
    .order("name", { ascending: true });

  if (city) {
    query = query.eq("city", city);
  }

  if (queryText) {
    query = query.ilike("name", `%${queryText.slice(0, 80)}%`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ colleges: (data ?? []) as CollegeRow[] });
}
