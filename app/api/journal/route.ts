import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

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
            // Server component -- cookies are read-only
          }
        },
      },
    }
  );
}

function clampIntensity(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 50;
  }
  return Math.max(1, Math.min(100, Math.round(parsed)));
}

function isMissingColumnError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("could not find the") ||
    normalized.includes("schema cache") ||
    (normalized.includes("column") && normalized.includes("does not exist"))
  );
}

export async function GET() {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("journal_entries")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const mood = typeof body.mood === "string" ? body.mood : "";
  const journalText =
    typeof body.journal_text === "string"
      ? body.journal_text
      : typeof body.note === "string"
      ? body.note
      : "";
  const imageUrl = typeof body.image_url === "string" ? body.image_url : typeof body.imageUrl === "string" ? body.imageUrl : null;
  const location = typeof body.location === "string" ? body.location : null;
  const intensity = clampIntensity(body.intensity);

  if (!mood.trim()) {
    return NextResponse.json({ error: "Mood is required" }, { status: 400 });
  }

  const fullPayload = {
    user_id: user.id,
    mood: mood.trim(),
    intensity,
    journal_text: journalText.slice(0, 1000),
    image_url: imageUrl,
    location: location?.slice(0, 160) || null,
  };

  const payloadVariants = [
    fullPayload,
    {
      user_id: fullPayload.user_id,
      mood: fullPayload.mood,
      intensity: fullPayload.intensity,
      journal_text: fullPayload.journal_text,
      location: fullPayload.location,
    },
    {
      user_id: fullPayload.user_id,
      mood: fullPayload.mood,
      intensity: fullPayload.intensity,
      journal_text: fullPayload.journal_text,
    },
    {
      user_id: fullPayload.user_id,
      mood: fullPayload.mood,
      journal_text: fullPayload.journal_text,
    },
  ];

  let inserted: unknown = null;
  let lastErrorMessage = "Failed to save journal entry.";

  for (const payload of payloadVariants) {
    const { data, error } = await supabase
      .from("journal_entries")
      .insert(payload)
      .select("*")
      .single();

    if (!error && data) {
      inserted = data;
      break;
    }

    const message = error?.message || "Failed to save journal entry.";
    lastErrorMessage = message;

    if (!isMissingColumnError(message)) {
      break;
    }
  }

  if (!inserted) {
    return NextResponse.json({ error: lastErrorMessage }, { status: 500 });
  }

  return NextResponse.json(inserted, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await request.json();

  if (!id) {
    return NextResponse.json({ error: "Entry ID required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("journal_entries")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
