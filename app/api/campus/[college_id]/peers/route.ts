import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ college_id: string }> } 
) {
  try {
    const resolvedParams = await params;
    const collegeId = resolvedParams.college_id;
    
    // We can pass the current user's ID in the URL so we don't show them in their own feed!
    const currentUserId = request.nextUrl.searchParams.get("userId");

    if (!collegeId) {
      return NextResponse.json({ error: "Missing college ID" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; 
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch peers from the same college
    let query = supabase
      .from('profiles')
      .select('id, unique_code')
      .eq('college_id', collegeId)
      .limit(5); // Just show up to 5 peers to keep the UI clean

    // Safely exclude the current user (prevents UUID casting errors if the frontend sends "undefined")
    if (currentUserId && currentUserId !== "undefined" && currentUserId !== "null") {
      query = query.neq('id', currentUserId);
    }

    const { data: peers, error } = await query;

    if (error) throw new Error(error.message);

    return NextResponse.json({ peers: peers || [] }, { status: 200 });

  } catch (error: any) {
    console.error("Error fetching peers:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
