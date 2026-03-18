import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardActivityItem } from "@/lib/dashboard-fetch";

const toneMap: Record<string, string> = {
  again: "bg-[rgba(184,92,84,0.14)] text-[#8f463f]",
  hard: "bg-[rgba(229,189,118,0.18)] text-[#87601f]",
  good: "bg-[rgba(144,184,168,0.16)] text-[#507567]",
  easy: "bg-[rgba(115,155,198,0.16)] text-[#3d6488]",
};

export function DashboardRecentActivity({ items }: { items: DashboardActivityItem[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-2xl">Recent activity</CardTitle>
        <CardDescription>Your latest review decisions.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {items.length ? (
            items.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-3 rounded-[18px] border border-[color:var(--line)] bg-[color:var(--surface-soft)] px-4 py-3 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <div className="text-sm font-semibold text-[color:var(--text)]">{item.germanWord}</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                    {new Date(item.reviewedAt).toLocaleString()}
                  </div>
                </div>
                <Badge className={`w-fit capitalize ${toneMap[item.rating] || ""}`}>{item.rating}</Badge>
              </div>
            ))
          ) : (
            <div className="rounded-[22px] border border-dashed border-[color:var(--line)] bg-[color:var(--surface-soft)] p-8 text-center">
              <div className="text-lg font-semibold text-[color:var(--text)]">No reviews yet</div>
              <div className="mt-2 text-sm text-[color:var(--text-soft)]">Completed cards will appear here.</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
