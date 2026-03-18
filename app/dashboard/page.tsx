"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Layers3, Sparkles, Target, Trophy } from "lucide-react";
import { AppTopbar } from "@/components/lexinote/app-topbar";
import { DashboardActivityHeatmap } from "@/components/lexinote/dashboard-activity-heatmap";
import { DashboardDeckProgress } from "@/components/lexinote/dashboard-deck-progress";
import { DashboardProgressChart } from "@/components/lexinote/dashboard-progress-chart";
import { DashboardStatCard } from "@/components/lexinote/dashboard-stat-card";
import { DashboardQuickActions } from "@/components/lexinote/dashboard-quick-actions";
import { DashboardRecentActivity } from "@/components/lexinote/dashboard-recent-activity";
import { DashboardRatingBreakdown } from "@/components/lexinote/dashboard-rating-breakdown";
import { DashboardStreakCard } from "@/components/lexinote/dashboard-streak-card";
import {
  fetchDashboard,
  type DashboardActivityItem,
  type DashboardDeck,
  type DashboardDeckProgress as DashboardDeckProgressItem,
  type DashboardHeatmapCell,
  type DashboardInsightSummary,
  type DashboardRatingBreakdownItem,
  type DashboardStats,
  type DashboardTrendPoint,
} from "@/lib/dashboard-fetch";

const emptyStats: DashboardStats = {
  dueCount: 0,
  totalWords: 0,
  learnedWords: 0,
  learningWords: 0,
  reviewWords: 0,
  todayReviews: 0,
  todayWordsAdded: 0,
  streak: 0,
  deckCount: 0,
};

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>(emptyStats);
  const [recentActivity, setRecentActivity] = useState<DashboardActivityItem[]>([]);
  const [decks, setDecks] = useState<DashboardDeck[]>([]);
  const [trend, setTrend] = useState<DashboardTrendPoint[]>([]);
  const [heatmap, setHeatmap] = useState<DashboardHeatmapCell[]>([]);
  const [ratingBreakdown, setRatingBreakdown] = useState<DashboardRatingBreakdownItem[]>([]);
  const [deckProgress, setDeckProgress] = useState<DashboardDeckProgressItem[]>([]);
  const [insights, setInsights] = useState<DashboardInsightSummary>({
    activeDaysLast14: 0,
    reviewsLast7: 0,
    wordsAddedLast7: 0,
    completionRate: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      try {
        setError(null);
        setIsLoading(true);
        const data = await fetchDashboard();
        setStats(data.stats);
        setRecentActivity(data.recentActivity);
        setDecks(data.decks);
        setTrend(data.trend);
        setHeatmap(data.heatmap);
        setRatingBreakdown(data.ratingBreakdown);
        setDeckProgress(data.deckProgress);
        setInsights(data.insights);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load dashboard.";
        if (message === "Unauthorized") {
          router.replace("/auth");
          return;
        }
        setError(message);
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboard();
  }, [router]);

  return (
    <div className="app-shell">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-10">
        <AppTopbar />

        <div className="mb-8 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div
            className="motion-enter rounded-[30px] border border-[color:var(--line)] bg-[color:var(--bg-elevated)] p-6 text-[color:var(--text-inverse)] shadow-[var(--shadow-lg)] backdrop-blur-xl md:p-7"
            style={{ animationDelay: "120ms" }}
          >
            <div className="eyebrow text-[color:var(--accent-gold)]">Learning dashboard</div>
            <h1 className="mt-4 max-w-3xl text-5xl font-semibold tracking-tight md:text-6xl">
              Your vocabulary system, finally in one place.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[color:var(--text-muted-inverse)] md:text-lg">
              Review load, streaks, and deck momentum at a glance.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.05)] px-4 py-2 text-sm text-[color:var(--text-inverse)]">
                <Target className="h-4 w-4 text-[color:var(--accent-gold)]" />
                {stats.dueCount ? `${stats.dueCount} cards due now` : "Queue is clear"}
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.05)] px-4 py-2 text-sm text-[color:var(--text-inverse)]">
                <Trophy className="h-4 w-4 text-[color:var(--accent-gold)]" />
                {stats.streak} day{stats.streak === 1 ? "" : "s"} of momentum
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.05)] px-4 py-2 text-sm text-[color:var(--text-inverse)]">
                <Sparkles className="h-4 w-4 text-[color:var(--accent-gold)]" />
                {insights.completionRate}% learned so far
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <div
              className="motion-enter rounded-[26px] border border-[color:var(--line)] bg-[color:var(--surface)] p-5 text-[color:var(--text)] shadow-[var(--shadow-md)]"
              style={{ animationDelay: "180ms" }}
            >
              <div className="eyebrow">Today&apos;s focus</div>
              <div className="mt-3 text-2xl font-semibold">
                {stats.dueCount ? "Review first, then capture." : "A light day for adding and organizing."}
              </div>
              <div className="mt-2 text-sm leading-6 text-[color:var(--text-soft)]">
                {stats.dueCount
                  ? "Clear due cards first, then return to capture."
                  : "A good moment to add words or tidy decks."}
              </div>
            </div>

            <div
              className="motion-enter rounded-[26px] border border-[color:var(--line)] bg-[color:var(--surface)] p-5 text-[color:var(--text)] shadow-[var(--shadow-md)]"
              style={{ animationDelay: "240ms" }}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="eyebrow">Deck snapshot</div>
                  <div className="mt-2 text-lg font-semibold">Your active spaces</div>
                </div>
                <Layers3 className="h-5 w-5 text-[color:var(--accent)]" />
              </div>

              <div className="mt-4 space-y-2.5">
                {decks.length ? (
                  decks.slice(0, 4).map((deck, index) => (
                    <div
                      key={deck.id}
                      className="flex items-center justify-between rounded-[18px] border border-[color:var(--line)] bg-[color:var(--surface-soft)] px-4 py-3"
                    >
                      <div>
                        <div className="text-sm font-semibold text-[color:var(--text)]">{deck.name}</div>
                        <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                          Deck {index + 1}
                        </div>
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-[color:var(--accent)]" />
                    </div>
                  ))
                ) : (
                  <div className="rounded-[18px] border border-dashed border-[color:var(--line)] bg-[color:var(--surface-soft)] p-6 text-sm text-[color:var(--text-soft)]">
                    No decks yet. Create one from the notebook.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {error ? (
          <div className="mb-6 rounded-[24px] border border-[#d99e95] bg-[#fff1ed] px-5 py-4 text-sm text-[#9b4f42]">
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <div className="rounded-[30px] border border-[color:var(--line)] bg-[color:var(--surface-overlay)] p-10 text-sm text-[color:var(--text-muted-inverse)] backdrop-blur-sm">
            Loading overview...
          </div>
        ) : (
          <div className="space-y-6">
            <div className="motion-enter grid gap-4 md:grid-cols-2 xl:grid-cols-4" style={{ animationDelay: "220ms" }}>
              <DashboardStatCard label="Due for review" value={stats.dueCount} hint="ready now" />
              <DashboardStatCard label="Total words" value={stats.totalWords} hint="in notebook" />
              <DashboardStatCard label="Learned words" value={stats.learnedWords} hint="fully retained" />
              <DashboardStatCard label="Decks" value={stats.deckCount} hint="active spaces" />
            </div>

            <div className="motion-enter grid gap-4 md:grid-cols-2 xl:grid-cols-3" style={{ animationDelay: "280ms" }}>
              <DashboardStatCard label="Learning" value={stats.learningWords} hint="early repetition" />
              <DashboardStatCard label="In review" value={stats.reviewWords} hint="active rotation" />
              <DashboardStatCard label="Today reviews" value={stats.todayReviews} hint="completed today" />
            </div>

            <div className="motion-enter grid gap-6 xl:grid-cols-[0.95fr_1.05fr]" style={{ animationDelay: "340ms" }}>
              <DashboardStreakCard
                streak={stats.streak}
                todayReviews={stats.todayReviews}
                todayWordsAdded={stats.todayWordsAdded}
              />
              <DashboardQuickActions />
            </div>

            <div className="motion-enter grid gap-6 xl:grid-cols-[1.1fr_0.9fr]" style={{ animationDelay: "400ms" }}>
              <DashboardProgressChart trend={trend} />
              <DashboardRatingBreakdown items={ratingBreakdown} />
            </div>

            <div className="motion-enter grid gap-6 xl:grid-cols-[0.95fr_1.05fr]" style={{ animationDelay: "460ms" }}>
              <DashboardActivityHeatmap cells={heatmap} />
              <DashboardDeckProgress decks={deckProgress} insights={insights} />
            </div>

            <div className="motion-enter" style={{ animationDelay: "520ms" }}>
              <DashboardRecentActivity items={recentActivity} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
