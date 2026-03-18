"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";

type SelectContextValue = { value?: string; onValueChange?: (value: string) => void };
const SelectContext = React.createContext<SelectContextValue>({});

export function Select({
  value,
  onValueChange,
  children,
}: {
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}) {
  return <SelectContext.Provider value={{ value, onValueChange }}>{children}</SelectContext.Provider>;
}

export function SelectTrigger({ children }: { children: React.ReactNode; className?: string }) {
  return <div className="hidden">{children}</div>;
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  const { value } = React.useContext(SelectContext);
  return <span>{value || placeholder || "Select"}</span>;
}

export function SelectContent({ children }: { children: React.ReactNode }) {
  const { value, onValueChange } = React.useContext(SelectContext);
  const items = React.Children.toArray(children) as React.ReactElement<{ value: string }>[];

  return (
    <div className="relative">
      <select
        className="w-full appearance-none rounded-[18px] border border-[color:var(--line)] bg-[color:var(--surface-soft)] px-4 py-3 pr-11 text-sm text-[color:var(--text)] outline-none transition focus:border-[color:var(--accent)] focus:bg-[color:var(--surface-strong)] focus:shadow-[0_0_0_4px_var(--accent-soft)]"
        value={value}
        onChange={(e) => onValueChange?.(e.target.value)}
      >
        {items.map((child) => React.cloneElement(child, { key: child.props.value }))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-muted)]" />
    </div>
  );
}

export function SelectItem({ value, children }: { value: string; children: React.ReactNode }) {
  return <option value={value}>{children}</option>;
}
