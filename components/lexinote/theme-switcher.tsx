"use client";

import { Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { themeOptions } from "@/lib/theme";
import { useTheme } from "@/components/lexinote/theme-provider";

export function ThemeSwitcher() {
  const { theme, setTheme, isLoaded } = useTheme();

  return (
    <div className="w-full rounded-[24px] border border-[color:var(--line)] bg-[color:var(--surface)] p-1.5 shadow-[var(--shadow-md)]">
      <div className="flex flex-wrap items-center gap-1">
        <div className="flex items-center gap-2 px-3 text-[11px] uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
          <Palette className="h-3.5 w-3.5" />
          Theme
        </div>
        {themeOptions.map((option) => (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant="outline"
            disabled={!isLoaded}
            className={cn(
              "rounded-full border-transparent px-3 py-2 text-[11px] uppercase tracking-[0.16em] shadow-none",
              theme === option.value
                ? "bg-[color:var(--bg-elevated)] text-[color:var(--text-inverse)]"
                : "bg-transparent text-[color:var(--text-soft)]"
            )}
            onClick={() => setTheme(option.value)}
            title={option.description}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
