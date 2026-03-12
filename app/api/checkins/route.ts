import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { CheckIn, Mood, MOODS, CITIES } from "@/lib/types";
import { detectCampus } from "@/lib/campusDetection";
import { v4 as uuidv4 } from "uuid";

interface CollegeRecord {
  id: string;
  name: string;
  city: string;
  latitude: number;
  longitude: number;
  campus_radius: number;
}

async function getSupabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server component usage (read-only cookies)
          }
        },
      },
    }
  );
}

function getSupabasePublic() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

async function insertCheckinWithSchemaFallback(
  supabase: { from: (...args: any[]) => any },
  entry: CheckIn & {
    user_id?: string | null;
    college_id?: string | null;
  }
) {
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
  const supabase = getSupabasePublic();
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
  const supabase = await getSupabaseServer();
  const body = await request.json();

  const { mood, message, city } = body as {
    mood: string;
    message?: string;
    city?: string;
  };

  if (!mood || !MOODS.some((m) => m.label === mood)) {
    return NextResponse.json({ error: "Invalid mood" }, { status: 400 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profileCity: string | null = null;
  let profileCollege: CollegeRecord | null = null;

  if (user?.id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("college_id, city")
      .eq("id", user.id)
      .single();

    profileCity = profile?.city ?? null;

    if (profile?.college_id) {
      const { data: collegeData } = await supabase
        .from("colleges")
        .select("id, name, city, latitude, longitude, campus_radius")
        .eq("id", profile.college_id)
        .single();

      profileCollege = (collegeData as CollegeRecord | null) ?? null;
    }
  }

  const targetCity = CITIES.find((candidate) => candidate.name === city)
    ?? CITIES.find((candidate) => candidate.name === profileCity)
    ?? CITIES[0];

  let lat = targetCity.lat + (Math.random() - 0.5) * 0.06;
  let lng = targetCity.lng + (Math.random() - 0.5) * 0.06;
  let campusName: string | undefined;
  let collegeId: string | null = null;

  if (profileCollege && targetCity.name === profileCollege.city) {
    // Keep campus points clustered near the registered college instead of city-wide random placement.
    lat = profileCollege.latitude + (Math.random() - 0.5) * 0.02;
    lng = profileCollege.longitude + (Math.random() - 0.5) * 0.02;
    campusName = profileCollege.name;
    collegeId = profileCollege.id;
  } else {
    const campus = detectCampus(lat, lng);
    campusName = campus?.name;
  }

  const entry: CheckIn = {
    id: uuidv4(),
    mood: mood as Mood,
    message: message?.slice(0, 280) ?? "",
    timestamp: Date.now(),
    lat,
    lng,
    city: targetCity.name,
    hugs: 0,
    campus_name: campusName,
  };

  const error = await insertCheckinWithSchemaFallback(supabase, {
    ...entry,
    user_id: user?.id ?? null,
    college_id: collegeId,
  });

  if (error) {
    return NextResponse.json(
      { error: error.message ?? "Unable to insert check-in." },
      { status: 500 }
    );
  }

  // Update latest_mood on profile
  if (user?.id) {
    await supabase.from("profiles").update({
      latest_mood: entry.mood,
      latest_mood_updated_at: new Date().toISOString()
    }).eq("id", user.id);
  }

  return NextResponse.json(entry, { status: 201 });
}
