import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
    try {
        const { id } = await request.json();

        // Call Supabase increment_hug RPC function (if created via SQL)
        // fallback: get row and update directly
        const { data: row } = await supabase
            .from('checkins')
            .select('hugs')
            .eq('id', id)
            .single();

        if (row) {
            const { error } = await supabase
                .from('checkins')
                .update({ hugs: (row.hugs || 0) + 1 })
                .eq('id', id);

            if (error) {
                return NextResponse.json({ error: error.message }, { status: 500 });
            }
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
