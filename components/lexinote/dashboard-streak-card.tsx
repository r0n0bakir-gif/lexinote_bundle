import { Flame } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function DashboardStreakCard({
  streak,
  todayReviews,
  todayWordsAdded,
}: {
  streak: number;
  todayReviews: number;
  todayWordsAdded: number;
}) {
  return (
    <Card className="overflow-hidden rounded-[26px] bg-[linear-gradient(135deg,rgba(255,248,241,0.96),rgba(255,239,227,0.93))] shadow-[0_18px_40px_rgba(28,20,16,0.16)]">
      <CardHeader className="relative pb-3">
        <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top_left,rgba(234,143,106,0.18),transparent_48%),radial-gradient(circle_at_top_right,rgba(156,201,184,0.18),transparent_44%)]" />
        <div className="relative">
          <CardTitle className="flex items-center gap-3 text-2xl">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#2f2621] text-[#fff8f1]">
              <Flame className="h-4.5 w-4.5" />
            </span>
            Current streak
          </CardTitle>
          <CardDescription className="mt-2 max-w-xl text-sm">
            A compact view of your daily consistency.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-3">
          <div className="text-5xl font-semibold leading-none text-[#241c18]">{streak}</div>
          <div className="pb-1 text-base text-[#79695f]">day{streak === 1 ? "" : "s"} in a row</div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <div className="rounded-[20px] border border-[rgba(97,77,63,0.12)] bg-[rgba(255,255,255,0.54)] p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-[#9a7b67]">Today reviews</div>
            <div className="mt-2 text-2xl font-semibold text-[#241c18]">{todayReviews}</div>
          </div>
          <div className="rounded-[20px] border border-[rgba(97,77,63,0.12)] bg-[rgba(255,255,255,0.54)] p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-[#9a7b67]">Today added</div>
            <div className="mt-2 text-2xl font-semibold text-[#241c18]">{todayWordsAdded}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
