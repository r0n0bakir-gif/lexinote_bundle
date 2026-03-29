"use client";

import { cn } from "@/lib/utils";

type WindowPanelProps = {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
};

export function WindowPanel({ title, icon, children, className, bodyClassName }: WindowPanelProps) {
  return (
    <div className={cn("win-panel-outer", className)}>
      <div className="win-titlebar">
        <div className="flex items-center gap-1">
          {icon && <span className="win-titlebar-icon">{icon}</span>}
          <span className="win-title-text">{title}</span>
        </div>
        <div className="win-panel-buttons">
          <button className="win-btn" title="Minimize" type="button">
            <svg width="8" height="2" viewBox="0 0 8 2" fill="currentColor">
              <rect width="8" height="2" />
            </svg>
          </button>
          <button className="win-btn" title="Maximize" type="button">
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="0.75" y="0.75" width="6.5" height="6.5" />
            </svg>
          </button>
          <button className="win-btn win-btn-close" title="Close" type="button">
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5">
              <line x1="1" y1="1" x2="7" y2="7" />
              <line x1="7" y1="1" x2="1" y2="7" />
            </svg>
          </button>
        </div>
      </div>
      <div className={cn("win-panel-body", bodyClassName)}>{children}</div>
    </div>
  );
}
