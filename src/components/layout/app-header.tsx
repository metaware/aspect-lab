"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun, RotateCcw, Link2, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { useSimulatorStore } from "@/store/simulator-store";
import { ShareDialog } from "@/components/export/share-dialog";
import { ExportDialog } from "@/components/export/export-dialog";
import { ShortcutsDialog } from "./shortcuts";
import { cn } from "@/lib/utils";

const GITHUB_URL = process.env.NEXT_PUBLIC_GITHUB_URL;

export function Logo() {
  return (
    <svg viewBox="0 0 32 32" className="size-7" aria-hidden>
      <rect width="32" height="32" rx="7" fill="var(--accent)" />
      <path d="M9 21V9h12" fill="none" stroke="var(--accent-foreground)" strokeWidth="2.6" strokeLinecap="square" />
      <path d="M23 11v12H11" fill="none" stroke="var(--accent-foreground)" strokeWidth="2.6" strokeLinecap="square" opacity="0.55" />
    </svg>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const options = [
    { value: "light", icon: Sun, label: "Light theme" },
    { value: "dark", icon: Moon, label: "Dark theme" },
    { value: "system", icon: Monitor, label: "System theme" },
  ];
  return (
    <div role="radiogroup" aria-label="Color theme" className="flex items-center rounded-md border border-border bg-surface p-0.5">
      {options.map(({ value, icon: Icon, label }) => {
        const active = mounted && theme === value;
        return (
          <Tooltip key={value} content={label} side="bottom">
            <button
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={label}
              onClick={() => setTheme(value)}
              className={cn(
                "flex size-6 items-center justify-center rounded transition-colors",
                active ? "bg-panel text-foreground shadow-panel" : "text-subtle-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-3.5" />
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
}

export function AppHeader() {
  const reset = useSimulatorStore((s) => s.reset);
  const toast = useSimulatorStore((s) => s.toast);
  const [shareOpen, setShareOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  useEffect(() => {
    const open = () => setShortcutsOpen(true);
    window.addEventListener("aspectlab:shortcuts", open);
    return () => window.removeEventListener("aspectlab:shortcuts", open);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-panel/90 px-4 backdrop-blur">
      <div className="flex min-w-0 items-center gap-3">
        <Logo />
        <div className="flex min-w-0 items-baseline gap-2">
          <h1 className="text-[15px] font-semibold tracking-tight">AspectLab</h1>
          <span className="hidden truncate text-[13px] text-muted-foreground sm:inline">/ Responsive Image Simulator</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <ThemeToggle />
        <Tooltip content="Keyboard shortcuts (?)" side="bottom">
          <Button variant="ghost" size="icon" aria-label="Keyboard shortcuts" onClick={() => setShortcutsOpen(true)} className="hidden md:inline-flex">
            <Keyboard />
          </Button>
        </Tooltip>
        {GITHUB_URL && (
          <Tooltip content="View source on GitHub" side="bottom">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub repository"
              className="hidden size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-hover hover:text-foreground sm:inline-flex"
            >
              <svg viewBox="0 0 16 16" className="size-4" fill="currentColor" aria-hidden>
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
              </svg>
            </a>
          </Tooltip>
        )}
        <ExportDialog />
        <Button
          variant="secondary"
          onClick={() => {
            reset();
            toast("Configuration reset to defaults");
          }}
        >
          <RotateCcw /> <span className="hidden sm:inline">Reset</span>
        </Button>
        <Button variant="primary" onClick={() => setShareOpen(true)}>
          <Link2 /> <span className="hidden sm:inline">Share</span>
        </Button>
      </div>
      <ShareDialog open={shareOpen} onOpenChange={setShareOpen} />
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </header>
  );
}
