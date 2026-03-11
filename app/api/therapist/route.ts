import { NextRequest, NextResponse } from "next/server";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const THERAPIST_SYSTEM_PROMPT = `You are a warm, highly empathetic, and deeply grounding journaling companion and therapeutic guide. You exist within a physical, leather-bound journal. Your tone is soothing, poetic, and incredibly patient. RULES: 1. NEVER act like a robotic AI assistant. 2. NEVER rush to give advice or solve the user's problem immediately. 3. NEVER repeat the exact same question twice. 4. Read the conversation history carefully and naturally build upon what the user just said. 5. ALWAYS validate their feelings first using reflective listening (e.g., 'It makes complete sense that you feel [emotion] because...'). 6. Keep your responses concise (2-3 sentences max) so it feels like a natural, gentle conversation being written in ink. 7. Ask one gentle, open-ended guiding question at the end of your response to help them explore their feelings deeper. 8. If they are in severe distress, offer a grounding exercise.`;

const SMILE_SCORE_PROMPT = `Analyze the following voice journal transcript. Determine the user's primary mood (one word) and calculate a "Smile Score" from 0 to 100 representing their underlying positivity, hope, or emotional resilience. Return ONLY a JSON object: { "mood": "string", "smile_score": number }.`;

/**
 * POST /api/therapist
 * Body can be:
 *   - JSON: { message, history? }  — text chat
 *   - JSON: { message, history?, analyze: true } — text chat + smile score
 *   - FormData with "audio" file — Whisper transcription + GPT-4o + smile score
 */
export async function POST(request: NextRequest) {
    if (!OPENAI_API_KEY) {
        return NextResponse.json(
            { error: "OpenAI API key is not configured. Add OPENAI_API_KEY to .env.local" },
            { status: 500 }
        );
    }

    const contentType = request.headers.get("content-type") || "";

    let userMessage: string;
    let history: Array<{ role: string; content: string }> = [];
    let shouldAnalyze = false;
    let shouldTTS = false;

    /* ─── Audio path (Whisper transcription) ─── */
    if (contentType.includes("multipart/form-data")) {
        const formData = await request.formData();
        const audioFile = formData.get("audio") as File | null;
        const historyRaw = formData.get("history") as string | null;
        const analyzeRaw = formData.get("analyze") as string | null;
        const ttsRaw = formData.get("tts") as string | null;

        shouldAnalyze = analyzeRaw === "true";
        shouldTTS = ttsRaw === "true";

        if (!audioFile) {
            return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
        }

        if (historyRaw) {
            try {
                history = JSON.parse(historyRaw);
            } catch {
                /* ignore parse errors */
            }
        }

        // Transcribe with Whisper
        const whisperForm = new FormData();
        whisperForm.append("file", audioFile, "recording.webm");
        whisperForm.append("model", "whisper-1");
        whisperForm.append("language", "en");

        const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
            method: "POST",
            headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
            body: whisperForm,
        });

        if (!whisperRes.ok) {
            const err = await whisperRes.text();
            return NextResponse.json(
                { error: "Whisper transcription failed", details: err },
                { status: 502 }
            );
        }

        const whisperData = await whisperRes.json();
        userMessage = whisperData.text || "";

        if (!userMessage.trim()) {
            return NextResponse.json(
                { error: "Could not transcribe any speech from the recording" },
                { status: 400 }
            );
        }

        // For audio, always analyze
        shouldAnalyze = true;
    } else {
        /* ─── Text path ─── */
        const body = await request.json();
        userMessage = body.message || "";
        history = body.history || [];
        shouldAnalyze = body.analyze === true;
        shouldTTS = body.tts === true;

        if (!userMessage.trim()) {
            return NextResponse.json({ error: "No message provided" }, { status: 400 });
        }
    }

    /* ─── Build messages for GPT-4o (therapist reply) ─── */
    const messages = [
        { role: "system", content: THERAPIST_SYSTEM_PROMPT },
        ...history.slice(-20),
        { role: "user", content: userMessage },
    ];

    const gptRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: "gpt-4o",
            messages,
            temperature: 0.7,
            max_tokens: 300,
        }),
    });

    if (!gptRes.ok) {
        const err = await gptRes.text();
        return NextResponse.json(
            { error: "GPT response failed", details: err },
            { status: 502 }
        );
    }

    const gptData = await gptRes.json();
    const assistantReply =
        gptData.choices?.[0]?.message?.content || "I'm here with you. Can you tell me more?";

    /* ─── Smile Score analysis (separate GPT call) ─── */
    let smileScore: number | null = null;
    let detectedMood: string | null = null;

    if (shouldAnalyze) {
        try {
            const analyzeRes = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${OPENAI_API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: "gpt-4o",
                    messages: [
                        { role: "system", content: SMILE_SCORE_PROMPT },
                        { role: "user", content: userMessage },
                    ],
                    temperature: 0.3,
                    max_tokens: 80,
                }),
            });

            if (analyzeRes.ok) {
                const analyzeData = await analyzeRes.json();
                const raw = analyzeData.choices?.[0]?.message?.content || "";
                // Extract JSON from response (handle markdown code blocks too)
                const jsonMatch = raw.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    smileScore = typeof parsed.smile_score === "number"
                        ? Math.max(0, Math.min(100, parsed.smile_score))
                        : null;
                    detectedMood = typeof parsed.mood === "string" ? parsed.mood : null;
                }
            }
        } catch {
            // Non-critical — smile score is optional
        }
    }

    /* ─── TTS: Generate spoken audio of the reply ─── */
    let audioBase64: string | null = null;

    if (shouldTTS) {
        try {
            const ttsRes = await fetch("https://api.openai.com/v1/audio/speech", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${OPENAI_API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: "tts-1",
                    voice: "nova",
                    input: assistantReply,
                }),
            });

            if (ttsRes.ok) {
                const audioBuffer = Buffer.from(await ttsRes.arrayBuffer());
                audioBase64 = audioBuffer.toString("base64");
            }
        } catch {
            // TTS is non-critical — text reply still works
        }
    }

    return NextResponse.json({
        transcript: userMessage,
        reply: assistantReply,
        smile_score: smileScore,
        mood: detectedMood,
        audioBase64,
    });
}
