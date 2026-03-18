"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function Switch({
  checked,
  onCheckedChange,
}: {
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-all duration-200",
        checked
          ? "border-[#ea8f6a] bg-[#ea8f6a]/90 shadow-[0_8px_18px_rgba(209,108,68,0.26)]"
          : "border-[rgba(97,77,63,0.2)] bg-[rgba(97,77,63,0.14)]"
      )}
    >
      <span
        className={cn(
          "ml-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  );
}
