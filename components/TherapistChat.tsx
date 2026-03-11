"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import ChatInput from "@/components/ChatInput";
import MessageBubble, { ChatMessage } from "@/components/MessageBubble";

const AI_REFLECTIONS = [
  "Thank you for sharing that. What part of this feels most present for you right now?",
  "That sounds like a lot to carry. Do you notice where this feeling shows up in your body?",
  "I hear you. What would support look like for you in this moment, even if it is small?",
  "Your feelings make sense. Is there one gentle action you can take after this check-in?",
  "Would it help to name one thing that felt steady or grounding today?",
];

function buildAssistantReply(input: string) {
  const lowered = input.toLowerCase();

  if (lowered.includes("anxious") || lowered.includes("stress") || lowered.includes("overwhelmed")) {
    return "That sounds intense. Let us take one breath together. In for 4, out for 6. What feels slightly lighter after that?";
  }

  if (lowered.includes("sad") || lowered.includes("down") || lowered.includes("lonely")) {
    return "I am here with you. When sadness shows up, gentle routines can help. What is one kind thing you can do for yourself tonight?";
  }

  if (lowered.includes("happy") || lowered.includes("good") || lowered.includes("grateful")) {
    return "It is good to notice that. What contributed to this moment so you can return to it later?";
  }

  const randomIndex = Math.floor(Math.random() * AI_REFLECTIONS.length);
  return AI_REFLECTIONS[randomIndex];
}

export default function TherapistChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "intro",
      role: "assistant",
      content:
        "Welcome. This is a private space to reflect. You can share what you are feeling, and we can explore it together at your pace.",
      createdAt: new Date().toISOString(),
    },
  ]);
  const [isThinking, setIsThinking] = useState(false);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  const orderedMessages = useMemo(() => messages, [messages]);

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) {
      return;
    }

    node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
  }, [orderedMessages, isThinking]);

  function handleSendMessage(content: string) {
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };

    setMessages((current) => [...current, userMessage]);
    setIsThinking(true);

    window.setTimeout(() => {
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: buildAssistantReply(content),
        createdAt: new Date().toISOString(),
      };
      setMessages((current) => [...current, assistantMessage]);
      setIsThinking(false);
    }, 520);
  }

  return (
    <div className="app-surface rounded-3xl p-6">
      <div
        ref={viewportRef}
        className="mb-4 h-[420px] space-y-3 overflow-y-auto rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-2)] p-4"
      >
        <AnimatePresence initial={false}>
          {orderedMessages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <MessageBubble message={message} />
            </motion.div>
          ))}
        </AnimatePresence>

        {isThinking ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-fit rounded-xl border border-[var(--border-soft)] bg-[var(--surface-1)] px-3 py-2 text-xs text-[var(--muted-text)]"
          >
            AI Therapist is reflecting...
          </motion.div>
        ) : null}
      </div>

      <ChatInput onSend={handleSendMessage} disabled={isThinking} />
    </div>
  );
}
