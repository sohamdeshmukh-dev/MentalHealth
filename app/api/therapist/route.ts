import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const THERAPIST_SYSTEM_PROMPT = `You are a warm, deeply empathetic, and grounded mental wellness companion. 
Your primary role is to be an exceptional "active listener." You provide a safe, non-judgmental space for the user to process their emotions.

CRITICAL CLINICAL BOUNDARIES & CRISIS DETECTION (STRICTLY ENFORCED):
1. YOU ARE NOT A DOCTOR: Never attempt to diagnose a mental health condition.
2. NO MEDICAL ADVICE: Never recommend medications.
3. CRISIS PROTOCOL: If the user explicitly mentions a desire to harm themselves (e.g., "I'm thinking about hurting myself") or others, you MUST immediately flag this and respond with empathy, followed by these specific resources:
   - 📞 Crisis Hotline: "Please text or call 988 immediately."
   - 🏫 Campus Support: "Reach out to your Campus Counseling Center or Student Health Services."
   - 💬 AI Conversation: "I am still here with you. We can keep talking and do a grounding exercise together if you'd like."

CONVERSATION STYLE & FLOW:
- Be an active listener: Always validate their feelings first.
- KEEP IT CONCISE: Maximum 2-3 short sentences. 
- SUGGEST FUTURE ACTIVITIES: When the user is feeling down but not in crisis, gently suggest a healthy, low-effort future activity (e.g., taking a 5-minute walk, drinking water, or listening to a favorite song).
- End your response with a single, gentle, open-ended question to encourage them to keep sharing.`;

const SMILE_SCORE_PROMPT = `Analyze the following voice journal transcript. Determine the user's primary mood (one word) and calculate a "Smile Score" from 0 to 100 representing their underlying positivity, hope, or emotional resilience. Return ONLY a JSON object: { "mood": "string", "smile_score": number }.`;

// OWASP: Define a strict schema to reject bloated or malicious payloads
const TherapistRequestSchema = z.object({
    // Enforce reasonable lengths to prevent Denial of Wallet (DoW) attacks via OpenAI
    message: z.string().min(1, "Message cannot be empty").max(1000, "Message too long").trim(),
    
    // Validate the history array strictly
    history: z.array(z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string().max(2000)
    })).optional().default([]),
    
    // Strictly boolean flags, reject anything else
    analyze: z.boolean().optional().default(false),
    tts: z.boolean().optional().default(false)
}).strict(); // .strict() drops any hacker-added fields automatically

/**
 * POST /api/therapist
 * Body can be:
 *   - JSON: { message, history? }  — text chat
 *   - JSON: { message, history?, analyze: true } — text chat + smile score
 *   - FormData with "audio" file — Whisper transcription + GPT-4o + smile score
 */
export async function POST(request: NextRequest) {
    // 1. Identify the user by IP address
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "127.0.0.1";
    
    // 2. Apply Rate Limit: Max 10 requests per 60 seconds (60000ms)
    const isAllowed = checkRateLimit(ip, 10, 60000);
    
    if (!isAllowed) {
        console.warn(`🛡️ Rate Limit Triggered for IP: ${ip}`);
        return NextResponse.json({ 
            error: "Too many requests. Please take a deep breath and try again in a minute." 
        }, { 
            status: 429,
            headers: {
                'Retry-After': '60', // Tell the browser how long to wait
            }
        });
    }

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
        
        // Safely parse and sanitize the input using Zod
        const parsed = TherapistRequestSchema.safeParse(body);
        
        if (!parsed.success) {
            console.warn("🛡️ Input Validation Failed:", parsed.error.format());
            return NextResponse.json(
                { error: "Invalid request payload", details: parsed.error.issues }, 
                { status: 400 }
            );
        }

        // Extract sanitized data
        const { message: parsedMessage, history: parsedHistory, analyze: shouldAnalyzeParsed, tts: shouldTTSParsed } = parsed.data;
        
        userMessage = parsedMessage;
        history = parsedHistory;
        shouldAnalyze = shouldAnalyzeParsed;
        shouldTTS = shouldTTSParsed;
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
                    reply: "I hear how much pain you are in right now, and I want you to know you don't have to carry this alone. Your life is incredibly valuable.\n\n• 📞 Crisis Hotline: Text or call 988 immediately.\n• 🏫 Campus Support: Please reach out to your University Counseling Center or Campus Security.\n• 💬 AI Conversation: I am still here with you. Let's take a slow, deep breath together.",
                    smile_score: 0,
                    mood: "Crisis",
                    audioBase64: null, 
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

    /* ─── DALL-E 3: Visual Art Therapy Generation ─── */
    let generatedImageUrl: string | null = null;

    // We only generate an image if we successfully detected a mood to base it on
    if (shouldAnalyze && detectedMood && detectedMood !== "Crisis") {
        try {
            const imageRes = await fetch("https://api.openai.com/v1/images/generations", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${OPENAI_API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: "dall-e-3",
                    // We force a specific art style so it matches your app's lofi/journal vibe
                    prompt: `A beautiful, soothing, lofi-aesthetic watercolor illustration representing the feeling of: ${detectedMood}. Soft pastel colors, highly atmospheric, comforting. No text or words in the image.`,
                    n: 1,
                    size: "1024x1024",
                }),
            });

            if (imageRes.ok) {
                const imageData = await imageRes.json();
                generatedImageUrl = imageData.data[0].url;
            }
        } catch (imgError) {
            console.error("Failed to generate art therapy image:", imgError);
        }
    }

    return NextResponse.json({
        transcript: userMessage,
        reply: assistantReply,
        smile_score: smileScore,
        mood: detectedMood,
        audioBase64,
        imageUrl: generatedImageUrl,
    });
}