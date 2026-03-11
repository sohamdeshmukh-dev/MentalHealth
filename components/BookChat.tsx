"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import InkText from "@/components/InkText";

export interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    createdAt: string;
    isNew?: boolean;
}

interface BookChatProps {
    onTranscriptReceived?: (transcript: string, reply: string) => void;
}

const FALLBACK_REPLIES = [
    "Thank you for sharing that. What part of this feels most present for you right now?",
    "That sounds like a lot to carry. Do you notice where this feeling shows up in your body?",
    "I hear you. What would support look like for you in this moment, even if it is small?",
    "Your feelings make sense. Is there one gentle action you can take after this check-in?",
    "Would it help to name one thing that felt steady or grounding today?",
];

export default function BookChat({ onTranscriptReceived }: BookChatProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: "intro",
            role: "assistant",
            content:
                "Welcome. This is your private journal — a quiet place to reflect. Share what is on your mind, and we will explore it together, one page at a time.",
            createdAt: new Date().toISOString(),
            isNew: false,
        },
    ]);
    const [isThinking, setIsThinking] = useState(false);
    const [input, setInput] = useState("");
    const viewportRef = useRef<HTMLDivElement | null>(null);

    const orderedMessages = useMemo(() => messages, [messages]);

    useEffect(() => {
        const node = viewportRef.current;
        if (!node) return;
        node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
    }, [orderedMessages, isThinking]);

    const getHistory = useCallback(() => {
        return messages
            .filter((m) => m.id !== "intro")
            .map((m) => ({ role: m.role, content: m.content }));
    }, [messages]);

    const sendToAPI = useCallback(
        async (text: string) => {
            try {
                const res = await fetch("/api/therapist", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        message: text,
                        history: getHistory(),
                    }),
                });

                if (!res.ok) throw new Error("API error");

                const data = await res.json();
                return data.reply as string;
            } catch {
                // Fallback to local reply
                return FALLBACK_REPLIES[Math.floor(Math.random() * FALLBACK_REPLIES.length)];
            }
        },
        [getHistory]
    );

    async function handleSend() {
        const trimmed = input.trim();
        if (!trimmed || isThinking) return;

        const userMessage: ChatMessage = {
            id: `user-${Date.now()}`,
            role: "user",
            content: trimmed,
            createdAt: new Date().toISOString(),
            isNew: false,
        };

        setMessages((cur) => [...cur, userMessage]);
        setInput("");
        setIsThinking(true);

        const reply = await sendToAPI(trimmed);

        const assistantMessage: ChatMessage = {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: reply,
            createdAt: new Date().toISOString(),
            isNew: true,
        };
        setMessages((cur) => [...cur, assistantMessage]);
        setIsThinking(false);
    }

    // Called when voice recording produces a transcript
    const handleVoiceMessage = useCallback(
        async (transcript: string) => {
            const userMessage: ChatMessage = {
                id: `user-voice-${Date.now()}`,
                role: "user",
                content: `🎙️ ${transcript}`,
                createdAt: new Date().toISOString(),
                isNew: false,
            };

            setMessages((cur) => [...cur, userMessage]);
            setIsThinking(true);

            const reply = await sendToAPI(transcript);

            const assistantMessage: ChatMessage = {
                id: `assistant-${Date.now()}`,
                role: "assistant",
                content: reply,
                createdAt: new Date().toISOString(),
                isNew: true,
            };

            setMessages((cur) => [...cur, assistantMessage]);
            setIsThinking(false);
            onTranscriptReceived?.(transcript, reply);
        },
        [sendToAPI, onTranscriptReceived]
    );

    // expose handleVoiceMessage for parent
    useEffect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).__bookChatVoice = handleVoiceMessage;
        return () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            delete (window as any).__bookChatVoice;
        };
    }, [handleVoiceMessage]);

    return (
        <div className="book-chat">
            {/* Lined paper chat area */}
            <div ref={viewportRef} className="book-chat-viewport">
                <AnimatePresence initial={false}>
                    {orderedMessages.map((msg) => (
                        <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.25, ease: "easeOut" }}
                            className={`book-message ${msg.role === "user" ? "book-message-user" : "book-message-ai"}`}
                        >
                            {msg.role === "assistant" && (
                                <span className="book-message-quill">✦</span>
                            )}
                            <div className="book-message-content">
                                {msg.role === "assistant" && msg.isNew ? (
                                    <InkText text={msg.content} speed={22} />
                                ) : (
                                    <p>{msg.content}</p>
                                )}
                            </div>
                            <span className="book-message-time">
                                {new Date(msg.createdAt).toLocaleTimeString("en-US", {
                                    hour: "numeric",
                                    minute: "2-digit",
                                })}
                            </span>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {isThinking && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="book-thinking"
                    >
                        <span className="book-thinking-quill">✦</span>
                        <motion.span
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{ repeat: Infinity, duration: 1.8 }}
                        >
                            The therapist is writing...
                        </motion.span>
                    </motion.div>
                )}
            </div>

            {/* Input area styled as bottom of journal page */}
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                }}
                className="book-chat-input"
            >
                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Write your thoughts here..."
                    className="book-input-field"
                    disabled={isThinking}
                />
                <button
                    type="submit"
                    disabled={!input.trim() || isThinking}
                    className="book-send-btn"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m5 12 7-7 7 7" />
                        <path d="M12 19V5" />
                    </svg>
                </button>
            </form>
        </div>
    );
}
