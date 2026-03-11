"use client";

import { FormEvent, useState } from "react";
import Button from "@/components/Button";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export default function ChatInput({ onSend, disabled = false }: ChatInputProps) {
  const [value, setValue] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || disabled) {
      return;
    }

    onSend(trimmed);
    setValue("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-3 border-t border-[var(--border-soft)] pt-4">
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Type what you want to reflect on..."
        className="h-11 flex-1 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-2)] px-4 text-sm text-[var(--foreground)] placeholder:text-[var(--subtle-text)] outline-none transition-colors focus:border-teal-400/55"
      />
      <Button
        type="submit"
        disabled={!value.trim() || disabled}
        className="h-11 min-w-[90px] rounded-2xl px-4"
      >
        Send
      </Button>
    </form>
  );
}
