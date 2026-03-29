"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  BookOpenText,
  Brain,
  Compass,
  LayoutDashboard,
  Sparkles,
} from "lucide-react";
import { ThemeSwitcher } from "@/components/lexinote/theme-switcher";
import { UserMenu } from "@/components/lexinote/user-menu";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/lexinote/theme-provider";

type ProfileSummary = {
  email?: string | null;
  displayName?: string | null;
};

const links = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    note: "Progress and momentum",
  },
  {
    href: "/words",
    label: "Notebook",
    icon: BookOpen,
    note: "Capture and organize",
  },
  {
    href: "/study",
    label: "Study",
    icon: Brain,
    note: "Review with focus",
  },
] as const;

const pageDetails: Record<
  string,
  {
    eyebrow: string;
    title: string;
    description: string;
  }
> = {
  "/dashboard": {
    eyebrow: "Learning cockpit",
    title: "See what deserves attention first.",
    description: "A calmer way to navigate review pressure, streaks, and deck momentum.",
  },
  "/words": {
    eyebrow: "Notebook workspace",
    title: "Capture words without losing structure.",
    description: "Keep decks, notes, and tags moving inside one organized workspace.",
  },
  "/study": {
    eyebrow: "Session flow",
    title: "Enter study mode without friction.",
    description: "A focused shell for review sessions, theme control, and quick movement between spaces.",
  },
};

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppTopbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme } = useTheme();
  const [profile, setProfile] = useState<ProfileSummary | null>(null);

  const currentPage = useMemo(() => {
    const matchedEntry =
      Object.entries(pageDetails).find(([href]) => isActivePath(pathname, href)) ?? Object.entries(pageDetails)[0];
    return matchedEntry[1];
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        const response = await fetch("/api/profile", { cache: "no-store" });
        const data = await response.json().catch(() => null);

        if (cancelled || !response.ok || !data?.ok) {
          return;
        }

        setProfile({
          email: data.profile?.email ?? null,
          displayName: data.profile?.displayName ?? null,
        });
      } catch {}
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  if (theme === "retro") {
    return null;
  }

  return (
    <div className="motion-enter mb-8 space-y-4 md:mb-10">
      <div className="rounded-[30px] border border-[color:var(--line)] bg-[color:var(--surface-overlay)] p-4 shadow-[var(--shadow-lg)] backdrop-blur-xl md:p-5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[color:var(--line)] bg-[color:var(--surface)] text-[color:var(--text)] shadow-[var(--shadow-sm)] transition hover:-translate-y-0.5 hover:bg-[color:var(--surface-soft)]"
                aria-label="Go back"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>

              <div className="inline-flex min-w-0 items-center gap-3 rounded-full border border-[color:var(--line)] bg-[color:var(--surface)] px-3 py-2.5 shadow-[var(--shadow-sm)]">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--bg-elevated)] text-[color:var(--accent-gold)]">
                  <BookOpenText className="h-[18px] w-[18px]" />
                </div>
                <div className="min-w-0">
                  <div className="eyebrow text-[10px] text-[color:var(--text-muted)]">LexiNote</div>
                  <div className="truncate text-sm font-semibold text-[color:var(--text)]">Vocabulary workspace</div>
                </div>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--line)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-soft)] shadow-[var(--shadow-sm)]">
                <Compass className="h-4 w-4 text-[color:var(--accent)]" />
                {currentPage.eyebrow}
              </div>
            </div>

            <div className="mt-5 max-w-3xl">
              <h2 className="text-2xl font-semibold tracking-tight text-[color:var(--text)] md:text-[2rem]">
                {currentPage.title}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--text-soft)] md:text-[15px]">
                {currentPage.description}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 xl:min-w-[360px] xl:max-w-[420px] xl:items-end">
            <ThemeSwitcher />
            <UserMenu email={profile?.email} displayName={profile?.displayName} />
          </div>
        </div>
      </div>

      <div className="motion-enter rounded-[26px] border border-[color:var(--line)] bg-[color:var(--surface)] p-2 shadow-[var(--shadow-md)]" style={{ animationDelay: "80ms" }}>
        <div className="grid gap-2 md:grid-cols-3">
          {links.map((link) => {
            const Icon = link.icon;
            const active = isActivePath(pathname, link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "group flex items-center justify-between gap-4 rounded-[20px] border px-4 py-3 transition",
                  active
                    ? "border-transparent bg-[color:var(--bg-elevated)] text-[color:var(--text-inverse)] shadow-[var(--shadow-md)]"
                    : "border-[color:var(--line)] bg-[color:var(--surface-soft)] text-[color:var(--text)] hover:-translate-y-0.5 hover:border-[color:var(--line-strong)] hover:bg-[color:var(--surface)]"
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-full transition",
                      active
                        ? "bg-[rgba(255,255,255,0.12)] text-[color:var(--accent-gold)]"
                        : "bg-[color:var(--surface)] text-[color:var(--accent)]"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>

                  <div>
                    <div
                      className={cn(
                        "text-sm font-semibold",
                        active ? "text-[color:var(--text-inverse)]" : "text-[color:var(--text)]"
                      )}
                    >
                      {link.label}
                    </div>
                    <div
                      className={cn(
                        "mt-0.5 text-xs",
                        active ? "text-[color:var(--text-muted-inverse)]" : "text-[color:var(--text-soft)]"
                      )}
                    >
                      {link.note}
                    </div>
                  </div>
                </div>

                <div
                  className={cn(
                    "flex items-center gap-2 text-[11px] uppercase tracking-[0.18em]",
                    active ? "text-[color:var(--accent-gold)]" : "text-[color:var(--text-muted)]"
                  )}
                >
                  {active ? (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      Current
                    </>
                  ) : (
                    "Open"
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
