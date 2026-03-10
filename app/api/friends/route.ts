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

    // Get accepted friends
    const { data: friends } = await supabase
        .from("friendships")
        .select("*")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .eq("status", "accepted");

    // Get pending requests received
    const { data: requests } = await supabase
        .from("friendships")
        .select("*")
        .eq("addressee_id", user.id)
        .eq("status", "pending");

    // Get profiles for friends
    const friendIds = (friends || []).map((f) =>
        f.requester_id === user.id ? f.addressee_id : f.requester_id
    );
    const requestIds = (requests || []).map((r) => r.requester_id);
    const allIds = [...new Set([...friendIds, ...requestIds])];

    let profiles: Record<string, any> = {};
    if (allIds.length > 0) {
        const { data: profileData } = await supabase
            .from("profiles")
            .select("id, username, avatar_url, unique_code")
            .in("id", allIds);

        if (profileData) {
            profileData.forEach((p: any) => {
                profiles[p.id] = p;
            });
        }
    }

    // Get journal entry counts for leaderboard
    const { data: journalCounts } = await supabase
        .from("journal_entries")
        .select("user_id")
        .in("user_id", [...friendIds, user.id]);

    const entryCounts: Record<string, number> = {};
    (journalCounts || []).forEach((j: any) => {
        entryCounts[j.user_id] = (entryCounts[j.user_id] || 0) + 1;
    });

    return NextResponse.json({
        friends: (friends || []).map((f) => {
            const friendId = f.requester_id === user.id ? f.addressee_id : f.requester_id;
            return {
                ...f,
                friend_id: friendId,
                profile: profiles[friendId] || null,
                entry_count: entryCounts[friendId] || 0,
            };
        }),
        requests: (requests || []).map((r) => ({
            ...r,
            profile: profiles[r.requester_id] || null,
        })),
        my_entry_count: entryCounts[user.id] || 0,
    });
}

export async function POST(request: NextRequest) {
    const supabase = await getSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { username } = await request.json();

    if (!username) {
        return NextResponse.json({ error: "Username required" }, { status: 400 });
    }

    // Find user by username or unique_code
    const { data: target } = await supabase
        .from("profiles")
        .select("id")
        .or(`username.eq.${username},unique_code.eq.${username}`)
        .single();

    if (!target) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (target.id === user.id) {
        return NextResponse.json({ error: "Cannot add yourself" }, { status: 400 });
    }

    // Check existing friendship
    const { data: existing } = await supabase
        .from("friendships")
        .select("*")
        .or(
            `and(requester_id.eq.${user.id},addressee_id.eq.${target.id}),and(requester_id.eq.${target.id},addressee_id.eq.${user.id})`
        )
        .limit(1);

    if (existing && existing.length > 0) {
        return NextResponse.json({ error: "Friend request already exists" }, { status: 409 });
    }

    const { data, error } = await supabase
        .from("friendships")
        .insert({ requester_id: user.id, addressee_id: target.id })
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: NextRequest) {
    const supabase = await getSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, action } = await request.json();

    if (!id || !["accept", "reject"].includes(action)) {
        return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { error } = await supabase
        .from("friendships")
        .update({ status: action === "accept" ? "accepted" : "rejected" })
        .eq("id", id)
        .eq("addressee_id", user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
    const supabase = await getSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await request.json();

    const { error } = await supabase
        .from("friendships")
        .delete()
        .eq("id", id)
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
}
