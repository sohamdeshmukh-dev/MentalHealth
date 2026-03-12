import { NextRequest, NextResponse } from "next/server";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const THERAPIST_SYSTEM_PROMPT = `You are a deeply empathetic, warm, and grounded mental wellness companion. 
Your goal is to provide a safe space for the user to process their emotions using reflective listening and gentle Socratic questioning.

CRITICAL CLINICAL BOUNDARIES (STRICTLY ENFORCED):
1. YOU ARE NOT A DOCTOR: Never attempt to diagnose a mental health condition (e.g., do not say "It sounds like you have clinical depression").
2. NO MEDICAL ADVICE: Never recommend medications, treatments, or supplements.
3. NO FALSE PROMISES: Never promise that you can "fix" or "cure" them. 
4. CRISIS PROTOCOL: If the user explicitly mentions a desire to harm themselves, end their life, or harm others, you MUST stop the therapeutic conversation immediately. Respond with extreme empathy, validate their pain, and provide this exact phrase: 
"I hear how much pain you are in right now, and I want you to know you don't have to carry this alone. Please, right now, text or call 988 to reach the Suicide & Crisis Lifeline. There are people who want to support you through this exact moment."

CONVERSATION STYLE:
- Validate their feelings first (e.g., "It makes complete sense that you are feeling overwhelmed by...").
- Keep responses concise (2-3 sentences max).
- End with one gentle, open-ended question to help them reflect.`;

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

    /* ─── NEW: Ethical Guardrail & Crisis Detection ─── */
    try {
        const moderationRes = await fetch("https://api.openai.com/v1/moderations", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${OPENAI_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ input: userMessage }),
        });

        if (moderationRes.ok) {
            const modData = await moderationRes.json();
            const results = modData.results[0];

            // If OpenAI flags this as self-harm or violence
            if (results.categories["self-harm"] || results.categories["violence"]) {
                console.warn("CRISIS DETECTED: Triggering safety protocol.");

                return NextResponse.json({
                    transcript: userMessage,
                    reply: "I am so sorry you are hurting this much. I am an AI and cannot give you the level of support you deserve right now, but your life is incredibly valuable. Please, text or call 988 (Suicide & Crisis Lifeline) immediately to speak with someone who can truly help. You don't have to go through this alone.",
                    smile_score: 0,
                    mood: "Crisis",
                    audioBase64: null, // Don't speak crisis messages out loud
                });
            }
        }
    } catch (modError) {
        console.error("Moderation API failed, continuing with prompt safety...", modError);
    }
    /* ─────────────────────────────────── */

    /* ─── Build messages for GPT-5.4 (therapist reply) ─── */
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
            model: "gpt-5.4", // 🚀 UPGRADED TO GPT-5.4
            messages,
            temperature: 0.5, // Lowered slightly so the AI thinks more logically
            max_tokens: 500,  // Increased slightly to give it room to "think"
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
                    model: "gpt-5.4", // 🚀 UPGRADED TO GPT-5.4
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

    /* ─── TTS: Generate spoken audio of the reply (Using Gemini 2.5 Pro TTS) ─── */
    let audioBase64: string | null = null;

    if (shouldTTS) {
        try {
            const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

            if (!GEMINI_API_KEY) {
                console.error("GEMINI_API_KEY is missing from .env.local");
            } else {
                // Call Google's Gemini 2.5 Pro Preview TTS API
                const ttsRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro-preview-tts:generateContent?key=${GEMINI_API_KEY}`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{ text: assistantReply }]
                        }],
                        generationConfig: {
                            responseModalities: ["AUDIO"],
                            speechConfig: {
                                voiceConfig: {
                                    prebuiltVoiceConfig: {
                                        voiceName: "Zephyr" // The voice you selected in the AI Studio playground!
                                    }
                                }
                            }
                        }
                    }),
                });

                if (ttsRes.ok) {
                    const ttsData = await ttsRes.json();
                    // Gemini conveniently returns the audio already formatted as a Base64 string
                    audioBase64 = ttsData.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
                } else {
                    const errText = await ttsRes.text();
                    console.error("Gemini TTS Failed:", errText);
                }
            }
        } catch (error) {
            console.error("TTS Error:", error);
            // TTS is non-critical — text reply still works if this fails
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