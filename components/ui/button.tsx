import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline" | "destructive" | "secondary";
  size?: "default" | "sm";
  asChild?: boolean;
  children?: React.ReactNode;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "default", size = "default", asChild = false, children, ...props },
  ref
) {
  const classes = cn(
    "inline-flex items-center justify-center rounded-full font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
    "active:scale-[0.985]",
    variant === "default" &&
      "bg-[color:var(--accent)] text-[color:var(--text-inverse)] shadow-[var(--shadow-sm)] hover:-translate-y-0.5 hover:bg-[color:var(--accent-strong)]",
    variant === "outline" &&
      "border border-[color:var(--line)] bg-[color:var(--surface-soft)] text-[color:var(--text)] shadow-[var(--shadow-sm)] hover:border-[color:var(--line-strong)] hover:bg-[color:var(--surface-strong)]",
    variant === "destructive" &&
      "bg-[#b85c54] text-white shadow-[0_10px_20px_rgba(184,92,84,0.22)] hover:bg-[#a74b43]",
    variant === "secondary" &&
      "border border-[color:var(--line)] bg-[color:var(--surface-overlay)] text-[color:var(--text-inverse)] hover:bg-[color:var(--surface-soft)] hover:text-[color:var(--text)]",
    size === "default" && "px-5 py-3 text-sm",
    size === "sm" && "px-4 py-2 text-xs",
    className
  );

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      className: cn(classes, (children as React.ReactElement<any>).props.className),
    });
  }

  return (
    <button ref={ref} className={classes} {...props}>
      {children}
    </button>
  );
});
