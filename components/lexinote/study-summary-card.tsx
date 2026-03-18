import { Activity, Clock3, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const summaryMeta = [
  { label: "Due now", icon: Clock3 },
  { label: "Remaining", icon: Activity },
  { label: "Reviewed", icon: CheckCircle2 },
] as const;

export function StudySummaryCard({
  dueCount,
  remainingCount,
  reviewedCount,
}: {
  dueCount: number;
  remainingCount: number;
  reviewedCount: number;
}) {
  const values = [dueCount, remainingCount, reviewedCount];

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {summaryMeta.map((item, index) => {
        const Icon = item.icon;

        return (
          <Card key={item.label} className="rounded-[22px] bg-[color:var(--surface)] shadow-[var(--shadow-sm)]">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="eyebrow">{item.label}</div>
                  <div className="mt-2 text-3xl font-semibold text-[color:var(--text)]">{values[index]}</div>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[color:var(--accent-soft)] text-[color:var(--accent)]">
                  <Icon className="h-4 w-4" />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
