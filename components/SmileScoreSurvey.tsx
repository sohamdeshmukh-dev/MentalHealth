"use client";
import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function SmileScoreSurvey({ userId }: { userId: string }) {
  const [step, setStep] = useState(1);
  const [journal, setJournal] = useState("");
  const [score, setScore] = useState(50);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async () => {
    // 1. Save to Supabase
    await supabase.from("journals").insert({
      user_id: userId,
      entry_text: journal,
      daily_score: score
    });

    // Note: update profiles logic can go here for the leaderboard

    // 2. Trigger Email
    const myDevEmail = "your.email@gmail.com"; // ⚠️ Change this!
    await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score, userEmail: myDevEmail })
    });

    setIsSubmitted(true);
  };

  if (isSubmitted) return <div className="p-6 bg-teal-500/20 text-teal-400 rounded-xl border border-teal-500/30 text-center font-bold">✨ Smile Score Updated! +{score} pts</div>;

  return (
    <div className="p-6 bg-gray-900 rounded-xl border border-gray-800">
      <h3 className="text-xl font-bold text-white mb-4">Daily Smile Check-In</h3>
      {step === 1 && (
        <div className="space-y-4">
          <p className="text-gray-300">How would you rate your mental clarity today?</p>
          <input type="range" min="1" max="100" value={score} onChange={(e) => setScore(Number(e.target.value))} className="w-full accent-teal-500" />
          <button onClick={() => setStep(2)} className="w-full bg-teal-500 text-black font-bold py-2 rounded-lg mt-4">Next</button>
        </div>
      )}
      {step === 2 && (
        <div className="space-y-4">
          <p className="text-gray-300">Journal your thoughts (Optional)</p>
          <textarea value={journal} onChange={(e) => setJournal(e.target.value)} placeholder="Get it off your chest..." className="w-full h-24 bg-gray-800 text-white border border-gray-700 rounded-lg p-3" />
          <button onClick={handleSubmit} className="w-full bg-teal-500 text-black font-bold py-2 rounded-lg">Calculate & Submit</button>
        </div>
      )}
    </div>
  );
}
