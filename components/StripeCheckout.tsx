"use client";
import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function StripeCheckout({ userId, userEmail, onClose }: { userId: string, userEmail: string, onClose: () => void }) {
  const [clientSecret, setClientSecret] = useState('');

  useEffect(() => {
    fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, userEmail }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          // THIS WILL REVEAL THE EXACT PROBLEM!
          console.error("STRIPE BACKEND ERROR:", data.error); 
          alert("Stripe Error: " + data.error); // Pops up an alert so you can't miss it
        } else {
          setClientSecret(data.clientSecret);
        }
      })
      .catch((err) => console.error("Fetch failed:", err));
  }, [userId, userEmail]);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto relative shadow-2xl shadow-purple-500/20">
        
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded-full text-black font-bold z-10 flex items-center justify-center transition">
          ✕
        </button>

        <div className="p-6 pt-12">
          {clientSecret ? (
            <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret }}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
              <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              Loading secure checkout...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
