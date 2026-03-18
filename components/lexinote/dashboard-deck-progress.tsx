import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardDeckProgress, DashboardInsightSummary } from "@/lib/dashboard-fetch";

export function DashboardDeckProgress({
  decks,
  insights,
}: {
  decks: DashboardDeckProgress[];
  insights: DashboardInsightSummary;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-2xl">Progress depth</CardTitle>
        <CardDescription>Completion, activity, and deck load.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-[18px] border border-[color:var(--line)] bg-[color:var(--surface-soft)] p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-[color:var(--text-muted)]">Completion</div>
            <div className="mt-2 text-3xl font-semibold text-[color:var(--text)]">{insights.completionRate}%</div>
          </div>
          <div className="rounded-[18px] border border-[color:var(--line)] bg-[color:var(--surface-soft)] p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-[color:var(--text-muted)]">Active days (14d)</div>
            <div className="mt-2 text-3xl font-semibold text-[color:var(--text)]">{insights.activeDaysLast14}</div>
          </div>
          <div className="rounded-[18px] border border-[color:var(--line)] bg-[color:var(--surface-soft)] p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-[color:var(--text-muted)]">Reviews (7d)</div>
            <div className="mt-2 text-3xl font-semibold text-[color:var(--text)]">{insights.reviewsLast7}</div>
          </div>
        </div>

        <div className="space-y-3">
          {decks.length ? (
            decks.map((deck) => (
              <div
                key={deck.id}
                className="rounded-[18px] border border-[color:var(--line)] bg-[color:var(--surface-soft)] p-4 shadow-[var(--shadow-sm)]"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-base font-semibold text-[color:var(--text)]">{deck.name}</div>
                    <div className="mt-1 text-sm text-[color:var(--text-soft)]">
                      {deck.totalWords} total, {deck.dueCount} due, {deck.learnedCount} learned
                    </div>
                  </div>
                  <div className="text-sm text-[color:var(--text-soft)]">
                    Learning {deck.learningCount} | Review {deck.reviewCount}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[28px] border border-dashed border-[color:var(--line)] bg-[color:var(--surface-soft)] p-10 text-center">
              <div className="text-lg font-semibold text-[color:var(--text)]">No deck data yet</div>
              <div className="mt-2 text-sm text-[color:var(--text-soft)]">Create a few decks to compare progress.</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
