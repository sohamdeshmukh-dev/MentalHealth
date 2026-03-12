import { NextRequest, NextResponse } from 'next/server';
import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { checkRateLimit } from "@/lib/rate-limit";

// This route ONLY uses the Gemini Key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const VibeRequestSchema = z.object({
    chatHistory: z.string().min(1, "Chat history cannot be empty").max(5000, "Too many messages to analyze").trim(),
}).strict();

export async function POST(req: NextRequest) {
    // 1. Identify the user by IP address
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";
    
    // 2. Apply Rate Limit: Max 10 requests per 60 seconds (60000ms)
    const isAllowed = checkRateLimit(ip, 10, 60000);
    
    if (!isAllowed) {
        console.warn(`🛡️ Rate Limit Triggered for IP: ${ip}`);
        return NextResponse.json({ 
            error: "Too many requests. Please take a deep breath and try again in a minute." 
        }, { 
            status: 429,
            headers: {
                'Retry-After': '60',
            }
        });
    }

    try {
        const body = await req.json();
        const parsed = VibeRequestSchema.safeParse(body);

        if (!parsed.success) {
            console.warn("🛡️ Vibe Input Validation Failed:", parsed.error.format());
            return NextResponse.json(
                { error: "Invalid request payload", details: parsed.error.issues }, 
                { status: 400 }
            );
        }

        const { chatHistory } = parsed.data;

        // Use the highly stable 1.5 Flash model which is definitely on your free tier
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `You are a gentle, empathetic AI observing a wellness chat room. 
        Read these recent messages and provide a 1-2 sentence 'Vibe Check'. 
        Summarize the emotional state of the group and offer a warm, uplifting thought or suggestion. 
        Keep it concise, poetic, and formatting clean.
        
        Recent Messages: 
        ${chatHistory}`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();

        return NextResponse.json({ vibe: text });

    } catch (error: any) {
        console.error("GEMINI VIBE ERROR:", error);
        return NextResponse.json({ error: "The AI is currently resting." }, { status: 500 });
    }
}