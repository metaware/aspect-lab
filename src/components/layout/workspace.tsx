"use client";

import { useState } from "react";
import { SlidersHorizontal, ChevronDown } from "lucide-react";
import { useSharedConfiguration } from "@/hooks/use-shared-configuration";
import { useSimulatorStore } from "@/store/simulator-store";
import { PreviewCanvas } from "@/components/preview/preview-canvas";
import { AnalyticsSection } from "@/components/analytics/analytics-section";
import { AppHeader } from "./app-header";
import { ConfigurationPanel } from "./configuration-panel";
import { InspectorPanel } from "@/components/inspector/inspector-panel";
import { LiveAnnouncer, Toaster } from "./feedback";
import { CreditsFooter } from "./credits";
import { useKeyboardShortcuts } from "./shortcuts";
import { cn } from "@/lib/utils";

export function Workspace() {
  useSharedConfiguration();
  useKeyboardShortcuts();
  const hydrated = useSimulatorStore((s) => s.hydrated);
  const [configOpen, setConfigOpen] = useState(false);

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#workspace" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-panel focus:px-3 focus:py-2">
        Skip to workspace
      </a>
      <AppHeader />
      <main
        id="workspace"
        className={cn(
          "grid flex-1 grid-cols-[minmax(0,1fr)] transition-opacity duration-200",
          // Desktop: three stationary-height columns that scroll independently.
          // flex-none lets the explicit height win over flex-basis, and the
          // minmax(0,1fr) row stops zoomed canvas content from stretching it.
          "lg:h-[calc(100dvh-3.5rem)] lg:min-h-[640px] lg:flex-none lg:grid-rows-[minmax(0,1fr)] lg:grid-cols-[296px_minmax(0,1fr)_288px] xl:grid-cols-[312px_minmax(0,1fr)_300px]",
          hydrated ? "opacity-100" : "opacity-0",
        )}
      >
        <aside aria-label="Configuration" className="border-b border-border bg-panel lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:border-b-0 lg:border-r scrollbar-thin">
          <button
            type="button"
            className="flex w-full items-center justify-between px-4 py-3 text-[13px] font-medium lg:hidden"
            aria-expanded={configOpen}
            aria-controls="configuration-panel"
            onClick={() => setConfigOpen((o) => !o)}
          >
            <span className="flex items-center gap-2">
              <SlidersHorizontal className="size-4" aria-hidden /> Configuration
            </span>
            <ChevronDown className={cn("size-4 transition-transform", configOpen && "rotate-180")} aria-hidden />
          </button>
          <div id="configuration-panel" className={cn(configOpen ? "block" : "hidden", "lg:block")}>
            <ConfigurationPanel />
          </div>
        </aside>
        <div className="h-[72dvh] min-h-[480px] min-w-0 lg:h-auto lg:min-h-0">
          <PreviewCanvas />
        </div>
        <aside aria-label="Inspector" className="border-t border-border bg-panel lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:border-l lg:border-t-0 scrollbar-thin">
          <InspectorPanel />
        </aside>
      </main>
      <AnalyticsSection />
      <CreditsFooter />
      <Toaster />
      <LiveAnnouncer />
    </div>
  );
}
