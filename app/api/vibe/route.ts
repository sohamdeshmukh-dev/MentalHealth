import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

// This route ONLY uses the Gemini Key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
    try {
        const { chatHistory } = await req.json();

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