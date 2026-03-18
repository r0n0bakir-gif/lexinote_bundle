import Link from "next/link";
import { BookOpen, Brain, PlusCircle, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const actions = [
  {
    href: "/words",
    label: "Open notebook",
    description: "Manage saved words and decks.",
    icon: BookOpen,
    accent: "bg-[rgba(144,184,168,0.16)] text-[color:var(--accent-mint)]",
  },
  {
    href: "/study",
    label: "Start review",
    description: "Continue your due session.",
    icon: Brain,
    accent: "bg-[rgba(229,189,118,0.18)] text-[color:var(--accent-gold)]",
  },
  {
    href: "/words",
    label: "Add capture",
    description: "Save a word quickly.",
    icon: PlusCircle,
    accent: "bg-[color:var(--accent-soft)] text-[color:var(--accent)]",
  },
];

export function DashboardQuickActions() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-2xl">Quick actions</CardTitle>
        <CardDescription>Move from overview to action without leaving the flow.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-3">
          {actions.map((action) => {
            const Icon = action.icon;

            return (
              <Link
                key={action.label}
                href={action.href}
                className="group motion-enter motion-rise-sm rounded-[20px] border border-[color:var(--line)] bg-[color:var(--surface-soft)] p-4 shadow-[var(--shadow-sm)] transition hover:border-[color:var(--line-strong)] hover:bg-[color:var(--surface-strong)]"
                style={{ animationDelay: `${80 + actions.indexOf(action) * 70}ms` }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${action.accent}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-[color:var(--text-muted)] transition group-hover:text-[color:var(--accent)]" />
                </div>
                <div className="mt-4 text-base font-semibold text-[color:var(--text)]">{action.label}</div>
                <div className="mt-1 text-sm text-[color:var(--text-soft)]">{action.description}</div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
