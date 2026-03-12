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

    // Get pending requests sent by me
    const { data: sentRequests } = await supabase
        .from("friendships")
        .select("*")
        .eq("requester_id", user.id)
        .eq("status", "pending");

    // Get profiles for friends and requests
    const friendIds = (friends || []).map((f) =>
        f.requester_id === user.id ? f.addressee_id : f.requester_id
    );
    const receivedIds = (requests || []).map((r) => r.requester_id);
    const sentIds = (sentRequests || []).map((r) => r.addressee_id);

    const allIds = [...new Set([...friendIds, ...receivedIds, ...sentIds])];

    let profiles: Record<string, any> = {};
    if (allIds.length > 0) {
        const { data: profileData } = await supabase
            .from("profiles")
            .select("id, username, display_name, avatar_url, unique_code")
            .in("id", allIds);

        if (profileData) {
            profileData.forEach((p: any) => {
                profiles[p.id] = p;
            });
        }
    }

    // Get journal entry counts for leaderboard (Combine multiple tables)
    const entryCounts: Record<string, number> = {};
    const relevantIds = [...new Set([...friendIds, user.id])];

    if (relevantIds.length > 0) {
        // 1. Journal Entries
        const { data: textCounts } = await supabase
            .from("journal_entries")
            .select("user_id")
            .in("user_id", relevantIds);

        // 2. Voice Journals
        const { data: voiceCounts } = await supabase
            .from("voice_journals")
            .select("user_id")
            .in("user_id", relevantIds);

        (textCounts || []).forEach((j: any) => {
            entryCounts[j.user_id] = (entryCounts[j.user_id] || 0) + 1;
        });
        (voiceCounts || []).forEach((j: any) => {
            entryCounts[j.user_id] = (entryCounts[j.user_id] || 0) + 1;
        });
    }

    return NextResponse.json({
        friends: (friends || []).map((f) => {
            const friendId = f.requester_id === user.id ? f.addressee_id : f.requester_id;
            const profile = profiles[friendId] || null;
            return {
                ...f,
                friend_id: friendId,
                profile: profile,
                // Flatten point for UI if needed
                display_name: profile?.display_name,
                avatar_url: profile?.avatar_url,
                unique_code: profile?.unique_code,
                entry_count: entryCounts[friendId] || 0,
            };
        }),
        incoming_requests: (requests || []).map((r) => {
            const profile = profiles[r.requester_id] || null;
            return {
                ...r,
                friendshipId: r.id,
                profile: profile,
                display_name: profile?.display_name,
                avatar_url: profile?.avatar_url,
                unique_code: profile?.unique_code,
            };
        }),
        sent_requests: (sentRequests || []).map((r) => {
            const profile = profiles[r.addressee_id] || null;
            return {
                ...r,
                friendshipId: r.id,
                profile: profile,
                display_name: profile?.display_name,
                avatar_url: profile?.avatar_url,
                unique_code: profile?.unique_code,
            };
        }),
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
