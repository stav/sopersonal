"use client";

import { useState } from "react";

export default function SubscribePage() {
  const [loading, setLoading] = useState(false);

  async function handleSubscribe() {
    setLoading(true);
    const res = await fetch("/api/stripe/checkout", { method: "POST" });
    const { url } = await res.json();
    if (url) {
      window.location.href = url;
    } else {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <div className="mb-6 text-5xl">👶</div>
        <h1 className="mb-2 text-2xl font-bold tracking-tight">
          Subscribe to SoPersonal
        </h1>
        <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
          Get unlimited access to your AI parenting companion with
          evidence-based advice grounded in trusted resources.
        </p>

        <div className="mb-6 rounded-xl border border-border p-6">
          <div className="text-3xl font-bold">
            $9.99<span className="text-base font-normal text-muted-foreground">/mo</span>
          </div>
          <ul className="mt-4 space-y-2 text-left text-sm">
            <li className="flex items-center gap-2">
              <span className="text-green-500">&#10003;</span>
              Unlimited AI parenting advice
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">&#10003;</span>
              Voice conversations
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">&#10003;</span>
              Evidence-based responses
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">&#10003;</span>
              Cancel anytime
            </li>
          </ul>
        </div>

        <button
          onClick={handleSubscribe}
          disabled={loading}
          className="flex h-12 w-full items-center justify-center rounded-xl bg-primary text-base font-medium text-white transition-colors hover:bg-primary-light disabled:opacity-50"
        >
          {loading ? "Redirecting..." : "Subscribe Now"}
        </button>
      </div>
    </div>
  );
}
