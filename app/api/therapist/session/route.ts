import { NextResponse } from 'next/server';

export async function POST() {
    try {
        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
        }

        // Request an ephemeral session token from OpenAI
        const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "gpt-realtime", // The high-speed speech-to-speech model
                voice: "shimmer",      // The warm, empathetic female voice
                instructions: `You are a warm, highly empathetic, and deeply grounding clinical therapist. 
                Your tone is soothing and incredibly patient. 
                RULES: 
                1. NEVER rush to give advice. 
                2. ALWAYS validate their feelings first. 
                3. Keep your spoken responses concise (1-2 sentences) so it feels like a natural, back-and-forth human conversation.`,
                input_audio_transcription: { model: "whisper-1" }
            }),
        });

        if (!response.ok) {
            const err = await response.text();
            console.error("OpenAI Session Error:", err);
            return NextResponse.json({ error: "Failed to generate token", details: err }, { status: response.status });
        }

        const data = await response.json();
        
        // Return the client_secret to the frontend
        return NextResponse.json(data);

    } catch (error) {
        console.error("Realtime Session Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
