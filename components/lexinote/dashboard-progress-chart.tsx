import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardTrendPoint } from "@/lib/dashboard-fetch";

export function DashboardProgressChart({ trend }: { trend: DashboardTrendPoint[] }) {
  const maxValue = Math.max(1, ...trend.flatMap((point) => [point.reviewsDone, point.wordsAdded]));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-2xl">Two-week trend</CardTitle>
        <CardDescription>Reviews and captures across the last fourteen days.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-3 md:grid-cols-14">
          {trend.map((point) => (
            <div key={point.date} className="flex flex-col items-center gap-2">
              <div className="flex h-32 items-end gap-1">
                <div
                  className="w-2.5 rounded-full bg-[color:var(--accent-mint)]"
                  style={{ height: `${Math.max(8, (point.wordsAdded / maxValue) * 100)}%` }}
                  title={`${point.wordsAdded} words added`}
                />
                <div
                  className="w-2.5 rounded-full bg-[color:var(--accent)]"
                  style={{ height: `${Math.max(8, (point.reviewsDone / maxValue) * 100)}%` }}
                  title={`${point.reviewsDone} reviews`}
                />
              </div>
              <div className="text-[10px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                {new Date(point.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-[color:var(--text-soft)]">
          <div className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[color:var(--accent-mint)]" />
            Words added
          </div>
          <div className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[color:var(--accent)]" />
            Reviews
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
