import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardRatingBreakdownItem } from "@/lib/dashboard-fetch";

const ratingColors: Record<string, string> = {
  again: "bg-[rgba(184,92,84,0.16)] text-[#8f463f]",
  hard: "bg-[rgba(241,202,133,0.24)] text-[#886125]",
  good: "bg-[rgba(156,201,184,0.2)] text-[#406758]",
  easy: "bg-[rgba(113,169,224,0.18)] text-[#335f8b]",
};

export function DashboardRatingBreakdown({ items }: { items: DashboardRatingBreakdownItem[] }) {
  const total = items.reduce((sum, item) => sum + item.count, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-2xl">Rating balance</CardTitle>
        <CardDescription>How recent reviews distributed across your SRS buttons.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item) => {
          const percent = total ? Math.round((item.count / total) * 100) : 0;

          return (
            <div key={item.rating} className="space-y-2">
              <div className="flex items-center justify-between">
                <Badge className={`capitalize ${ratingColors[item.rating]}`}>{item.rating}</Badge>
                <div className="text-sm text-[color:var(--text-soft)]">{item.count} reviews</div>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-[rgba(97,77,63,0.08)]">
                <div
                  className={`h-full rounded-full ${ratingColors[item.rating].split(" ")[0]}`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
