import { NextResponse } from "next/server";
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
            // Server component usage (read-only cookies)
          }
        },
      },
    }
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

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("college_id, city")
    .eq("id", user.id)
    .single();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  if (!profile?.college_id) {
    return NextResponse.json({ college: null, city: profile?.city ?? null });
  }

  const { data: college, error: collegeError } = await supabase
    .from("colleges")
    .select("id, name, city, latitude, longitude, campus_radius")
    .eq("id", profile.college_id)
    .single();

  if (collegeError) {
    return NextResponse.json({ error: collegeError.message }, { status: 500 });
  }

  return NextResponse.json({ college, city: profile.city ?? college.city ?? null });
}
