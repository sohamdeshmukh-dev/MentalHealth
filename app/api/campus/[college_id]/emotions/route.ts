import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ college_id: string }> } 
) {
  try {
    const resolvedParams = await params;
    const collegeId = resolvedParams.college_id;

    if (!collegeId) {
      return NextResponse.json({ error: "Missing college ID" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; 

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. ✅ CHANGED 'emotion' TO 'mood' HERE
    const { data: checkins, error } = await supabase
      .from('checkins')
      .select('mood, profiles!inner(college_id)') 
      .eq('profiles.college_id', collegeId);

    if (error) {
      console.error("Supabase Database Error:", error.message);
      throw new Error(error.message);
    }

    if (!checkins || checkins.length === 0) {
      return NextResponse.json({
        college_id: collegeId,
        top_emotions: [],
        overall_vibe: "Quiet",
        recent_checkins: 0
      }, { status: 200 });
    }

    const emotionCounts: Record<string, number> = {};
    checkins.forEach((c: any) => {
      // 2. ✅ CHANGED 'c.emotion' TO 'c.mood' HERE
      const emotion = c.mood || "Neutral"; 
      emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
    });

    const totalCheckins = checkins.length;
    
    const sortedEmotions = Object.entries(emotionCounts)
      .map(([emotion, count]) => ({
        emotion,
        percentage: Math.round((count / totalCheckins) * 100)
      }))
      .sort((a, b) => b.percentage - a.percentage);

    const campusInsights = {
      college_id: collegeId,
      top_emotions: sortedEmotions.slice(0, 3),
      overall_vibe: sortedEmotions.length > 0 ? sortedEmotions[0].emotion : "Neutral",
      recent_checkins: totalCheckins
    };

    return NextResponse.json(campusInsights, { status: 200 });

  } catch (error: any) {
    console.error("Error fetching real campus emotions:", error);
    return NextResponse.json(
      { error: "Internal Server Error" }, 
      { status: 500 }
    );
  }
}
