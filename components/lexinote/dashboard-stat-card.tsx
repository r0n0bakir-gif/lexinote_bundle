import { Activity, BookOpenText, CheckCircle2, Clock3, Layers3, Repeat2, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const iconMap: Record<string, any> = {
  "Due for review": Clock3,
  "Total words": BookOpenText,
  "Learned words": CheckCircle2,
  Decks: Layers3,
  Learning: Sparkles,
  "In review": Repeat2,
  "Today reviews": Activity,
};

export function DashboardStatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  const Icon = iconMap[label] ?? Activity;

  return (
    <Card className="rounded-[24px] bg-[rgba(255,249,241,0.92)] shadow-[0_16px_34px_rgba(28,20,16,0.14)]">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.22em] text-[#9a7b67]">{label}</div>
            <div className="mt-2 text-4xl font-semibold leading-none text-[#241c18]">{value}</div>
            {hint ? <div className="mt-2 text-xs text-[#85766b]">{hint}</div> : null}
          </div>

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[rgba(234,143,106,0.12)] text-[#c56f4a]">
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
