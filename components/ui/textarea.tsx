import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "min-h-[120px] w-full rounded-[22px] border border-[color:var(--line)] bg-[color:var(--surface-soft)] px-4 py-3 text-sm text-[color:var(--text)] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] outline-none transition",
        "placeholder:text-[color:var(--text-muted)] focus:border-[color:var(--accent)] focus:bg-[color:var(--surface-strong)] focus:shadow-[0_0_0_4px_var(--accent-soft)]",
        className
      )}
      {...props}
    />
  );
});
