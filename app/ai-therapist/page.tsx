"use client";

import TherapistChat from "@/components/TherapistChat";

export default function AITherapistPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] page-enter">
      <div className="mx-auto max-w-4xl px-4 pb-12 pt-24 sm:px-6">
        <section className="py-10 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)] sm:text-4xl">
            <span className="bg-gradient-to-r from-teal-400 to-indigo-400 bg-clip-text text-transparent">
              AI Therapist
            </span>
          </h1>
          <p className="mt-3 text-sm text-[var(--muted-text)]">
            Your private space to talk and reflect.
          </p>
        </section>

        <section className="py-6">
          <TherapistChat />
        </section>
      </div>
    </div>
  );
}
