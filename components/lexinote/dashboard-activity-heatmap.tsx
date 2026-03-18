import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardHeatmapCell } from "@/lib/dashboard-fetch";

function getHeatColor(intensity: number) {
  if (intensity >= 0.85) return "bg-[#d16c44]";
  if (intensity >= 0.55) return "bg-[#ea8f6a]";
  if (intensity >= 0.25) return "bg-[#f1ca85]";
  if (intensity > 0) return "bg-[rgba(156,201,184,0.55)]";
  return "bg-[rgba(97,77,63,0.08)]";
}

export function DashboardActivityHeatmap({ cells }: { cells: DashboardHeatmapCell[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-2xl">Activity heatmap</CardTitle>
        <CardDescription>Six weeks of consistency at a glance.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2">
          {cells.map((cell) => {
            const total = cell.reviewsDone + cell.wordsAdded;
            return (
              <div
                key={cell.date}
                title={`${cell.date}: ${cell.reviewsDone} reviews, ${cell.wordsAdded} added`}
                className={`aspect-square rounded-[12px] border border-[color:var(--line)] ${getHeatColor(cell.intensity)}`}
              >
                <div className="sr-only">{total}</div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-[color:var(--text-soft)]">
          <span>Less</span>
          <span className="h-3 w-3 rounded-full bg-[rgba(97,77,63,0.08)]" />
          <span className="h-3 w-3 rounded-full bg-[rgba(156,201,184,0.55)]" />
          <span className="h-3 w-3 rounded-full bg-[#f1ca85]" />
          <span className="h-3 w-3 rounded-full bg-[#ea8f6a]" />
          <span className="h-3 w-3 rounded-full bg-[#d16c44]" />
          <span>More</span>
        </div>
      </CardContent>
    </Card>
  );
}
