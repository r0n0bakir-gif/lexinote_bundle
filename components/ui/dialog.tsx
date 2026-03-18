"use client";
import * as React from "react";

const DialogContext = React.createContext<{ open: boolean; setOpen: (v: boolean) => void }>({ open: false, setOpen: () => {} });

export function Dialog({ open, onOpenChange, children }: { open: boolean; onOpenChange: (v: boolean) => void; children: React.ReactNode }) {
  return <DialogContext.Provider value={{ open, setOpen: onOpenChange }}>{children}</DialogContext.Provider>;
}

export function DialogTrigger({ asChild, children }: { asChild?: boolean; children: React.ReactElement }) {
  const { setOpen } = React.useContext(DialogContext);
  return React.cloneElement(children, { onClick: () => setOpen(true) } as any);
}

export function DialogContent({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const { open } = React.useContext(DialogContext);
  if (!open) return null;
  return <div className={`fixed inset-0 z-50 m-auto max-h-[90vh] max-w-2xl overflow-auto rounded-xl border border-stone-700 bg-stone-950 p-6 text-stone-100 shadow ${className}`}>{children}</div>;
}

export function DialogHeader({ children }: { children: React.ReactNode }) { return <div className="mb-4">{children}</div>; }
export function DialogTitle({ children }: { children: React.ReactNode }) { return <h3 className="text-lg font-semibold">{children}</h3>; }
