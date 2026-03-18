"use client";

import { useMemo, useState } from "react";
import { Loader2, LogOut, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase";

function getInitials(displayName?: string | null, email?: string | null) {
  const source = displayName?.trim() || email?.trim() || "Learner";
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  if (!parts.length) {
    return "L";
  }
  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function UserMenu({ email, displayName }: { email?: string | null; displayName?: string | null }) {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const initials = useMemo(() => getInitials(displayName, email), [displayName, email]);
  const name = displayName || "Learner";
  const subline = email || "Private workspace";

  async function handleSignOut() {
    try {
      setIsSigningOut(true);
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
      router.push("/auth");
      router.refresh();
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <div className="flex w-full items-center justify-between gap-3 rounded-[24px] border border-[color:var(--line)] bg-[color:var(--surface)] p-3 shadow-[var(--shadow-md)]">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[color:var(--bg-elevated)] text-sm font-semibold text-[color:var(--accent-gold)] shadow-[var(--shadow-sm)]">
          {initials}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
            <UserRound className="h-3.5 w-3.5" />
            Workspace
          </div>
          <div className="mt-1 truncate text-sm font-semibold text-[color:var(--text)]">{name}</div>
          <div className="truncate text-xs text-[color:var(--text-soft)]">{subline}</div>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        className="shrink-0 rounded-full px-4"
        onClick={handleSignOut}
        disabled={isSigningOut}
      >
        {isSigningOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
        <span className="hidden sm:inline">{isSigningOut ? "Leaving" : "Sign out"}</span>
      </Button>
    </div>
  );
}
