import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: "default" | "secondary" | "outline" }) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-[rgba(97,77,63,0.14)] bg-[rgba(255,246,237,0.95)] px-3 py-1.5 text-xs font-medium text-[#6e4f40] shadow-[0_6px_14px_rgba(41,29,23,0.06)]",
        className
      )}
      {...props}
    />
  );
}
