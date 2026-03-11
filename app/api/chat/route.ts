import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();

        const response = await openai.chat.completions.create({
            model: "gpt-4o", // using gpt-4o as it is the standard now and is used elsewhere
            messages: [
                {
                    role: "system",
                    content: "You are a gentle, empathetic AI therapist inside a lofi-aesthetic wellness app. Your tone is warm, poetic, and concise. You encourage deep reflection and never give generic medical advice. You speak like a wise friend sitting across a wooden desk."
                },
                ...messages,
            ],
            temperature: 0.7,
        });

        return NextResponse.json({ message: response.choices[0].message.content });
    } catch (error) {
        console.error("Chat API Error:", error);
        return NextResponse.json({ error: "The therapist is deep in thought (API Error)" }, { status: 500 });
    }
}
