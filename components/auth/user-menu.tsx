"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";

export function UserMenu({ email }: { email?: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const supabase = createBrowserClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
  }

  async function handleManageSubscription() {
    const res = await fetch("/api/stripe/portal", { method: "POST" });
    const { url } = await res.json();
    if (url) window.location.href = url;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-medium text-white"
        aria-label="User menu"
      >
        {email?.[0]?.toUpperCase() ?? "?"}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-10 z-50 w-56 rounded-xl border border-border bg-background p-1 shadow-lg">
            {email && (
              <p className="px-3 py-2 text-xs text-muted-foreground truncate">
                {email}
              </p>
            )}
            <button
              onClick={handleManageSubscription}
              className="flex w-full rounded-lg px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
            >
              Manage Subscription
            </button>
            <button
              onClick={handleSignOut}
              className="flex w-full rounded-lg px-3 py-2 text-sm hover:bg-muted transition-colors text-left text-red-500"
            >
              Sign Out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
