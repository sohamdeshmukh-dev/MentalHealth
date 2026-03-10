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
                        // Server component
                    }
                },
            },
        }
    );
}

export async function GET() {
    const supabase = await getSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get profile
    const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

    // Get journal entry count
    const { count: journalCount } = await supabase
        .from("mood_journal")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

    // Get checkin count
    const { count: checkinCount } = await supabase
        .from("checkins")
        .select("*", { count: "exact", head: true });

    // Get emergency contacts
    const { data: contacts } = await supabase
        .from("emergency_contacts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    return NextResponse.json({
        profile: profile || {},
        journalCount: journalCount || 0,
        checkinCount: checkinCount || 0,
        contacts: contacts || [],
        email: user.email,
    });
}

export async function PATCH(request: NextRequest) {
    const supabase = await getSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const allowedFields = [
        "username", "display_name", "anonymous_mode", "share_mood", "mood_visibility",
        "avatar_url", "hobbies", "favorite_movies", "favorite_music", "other_details",
    ];

    const updates: Record<string, any> = {};
    for (const field of allowedFields) {
        if (field in body) {
            updates[field] = body[field];
        }
    }

    if (Object.keys(updates).length === 0) {
        return NextResponse.json({ error: "No valid fields" }, { status: 400 });
    }

    const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
}

export async function POST(request: NextRequest) {
    const supabase = await getSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Add emergency contact
    if (body.action === "add_contact") {
        const { name, phone, relationship } = body;
        if (!name || !phone) {
            return NextResponse.json({ error: "Name and phone required" }, { status: 400 });
        }

        const { data, error } = await supabase
            .from("emergency_contacts")
            .insert({ user_id: user.id, name, phone, relationship })
            .select()
            .single();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json(data, { status: 201 });
    }

    // Delete emergency contact
    if (body.action === "delete_contact") {
        const { error } = await supabase
            .from("emergency_contacts")
            .delete()
            .eq("id", body.id)
            .eq("user_id", user.id);

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true });
    }

    // Export data
    if (body.action === "export") {
        const { data: journal } = await supabase
            .from("mood_journal")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

        const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();

        return NextResponse.json({
            exported_at: new Date().toISOString(),
            profile,
            journal_entries: journal || [],
        });
    }

    // Delete all journal entries
    if (body.action === "delete_all_journal") {
        const { error } = await supabase
            .from("mood_journal")
            .delete()
            .eq("user_id", user.id);

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
