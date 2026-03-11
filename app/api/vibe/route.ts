import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
    try {
        const { chatHistory } = await req.json();

        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: "You are a gentle, empathetic AI observing a wellness chat room. Read the recent messages and provide a 1-2 sentence 'Vibe Check'. Summarize the emotional state of the group and offer a warm, uplifting thought or suggestion. Keep it concise, poetic, and formatting clean."
                },
                {
                    role: "user",
                    content: `Here are the recent messages:\n\n${chatHistory}`
                }
            ],
            temperature: 0.7,
        });

        return NextResponse.json({ vibe: response.choices[0].message.content });
    } catch (error) {
        return NextResponse.json({ error: "The AI is currently resting." }, { status: 500 });
    }
}
