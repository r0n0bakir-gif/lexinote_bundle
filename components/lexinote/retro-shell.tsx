"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "@/components/lexinote/theme-provider";
import {
  BookOpen,
  Brain,
  LayoutDashboard,
  MousePointer2,
  Crop,
  Pencil,
  Type,
  ZoomIn,
  Pipette,
  Eraser,
  Move,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navTools = [
  { href: "/dashboard", Icon: LayoutDashboard, label: "Dashboard" },
  { href: "/words", Icon: BookOpen, label: "Notebook" },
  { href: "/study", Icon: Brain, label: "Study" },
];

const decorativeTools = [MousePointer2, Move, Crop, Wand2, Pencil, Eraser, Type, ZoomIn, Pipette];

const menuItems = ["File", "Edit", "View", "Words", "Study", "Window", "Help"];

export function RetroShell({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const pathname = usePathname();

  if (theme !== "retro") {
    return <>{children}</>;
  }

  const currentSection =
    navTools.find((t) => pathname.startsWith(t.href))?.label ?? "LexiNote";

  return (
    <div className="retro-frame">
      {/* Photoshop-style top bar */}
      <div className="ps-topbar">
        <div className="ps-topbar-menus">
          {menuItems.map((item) => (
            <span key={item} className="ps-menu-item">
              {item}
            </span>
          ))}
        </div>
        <div className="ps-topbar-title">LexiNote</div>
        <div className="ps-topbar-right">
          <span className="ps-status-pill">
            Section: {currentSection}
          </span>
          <span className="ps-status-pill">
            100%
          </span>
        </div>
      </div>

      {/* Main workspace */}
      <div className="retro-workspace">
        {/* Left tool panel */}
        <div className="ps-tools">
          {navTools.map(({ href, Icon, label }) => (
            <Link
              key={href}
              href={href}
              className={cn("ps-tool-btn", pathname.startsWith(href) && "ps-tool-btn-active")}
              title={label}
            >
              <Icon size={14} />
            </Link>
          ))}
          <div className="ps-tools-divider" />
          {decorativeTools.map((Icon, i) => (
            <button key={i} type="button" className="ps-tool-btn" title="">
              <Icon size={14} />
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="retro-content">{children}</div>
      </div>
    </div>
  );
}
