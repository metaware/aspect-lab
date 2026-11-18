"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";
import { useSimulatorStore } from "@/store/simulator-store";
import { useSimulation, useDebouncedValue } from "@/hooks/use-simulator";
import { cn } from "@/lib/utils";

const ICONS = { default: Info, success: CheckCircle2, warning: AlertTriangle, error: XCircle };
const TONES = {
  default: "text-foreground",
  success: "text-visible-text",
  warning: "text-warning-text",
  error: "text-danger-text",
};

export function Toaster() {
  const toasts = useSimulatorStore((s) => s.toasts);
  const dismiss = useSimulatorStore((s) => s.dismissToast);
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2" role="status" aria-live="polite">
      {toasts.map((t) => {
        const Icon = ICONS[t.tone];
        return (
          <div key={t.id} className="pointer-events-auto flex items-start gap-2.5 rounded-lg border border-border bg-panel px-3 py-2.5 text-[13px] shadow-xl">
            <Icon className={cn("mt-0.5 size-4 shrink-0", TONES[t.tone])} aria-hidden />
            <p className="flex-1 leading-snug">{t.message}</p>
            <button type="button" aria-label="Dismiss" onClick={() => dismiss(t.id)} className="text-subtle-foreground hover:text-foreground">
              <X className="size-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Announces meaningful changes to screen readers, debounced so dragging a
 * slider produces one summary instead of a flood.
 */
export function LiveAnnouncer() {
  const sim = useSimulation();
  const fit = useSimulatorStore((s) => s.config.rendering.objectFit);
  const vw = useSimulatorStore((s) => s.config.viewport.width);
  const summary = `Viewport ${vw} pixels. Container ${Math.round(sim.metrics.containerWidth)} by ${Math.round(sim.metrics.containerHeight)}. Object fit ${fit}. ${sim.metrics.imageCroppedPercentage.toFixed(1)} percent of the image cropped${sim.metrics.emptySpacePercentage > 0.1 ? `, ${sim.metrics.emptySpacePercentage.toFixed(1)} percent of the container empty` : ""}.`;
  const debounced = useDebouncedValue(summary, 900);
  const [text, setText] = useState("");
  useEffect(() => setText(debounced), [debounced]);
  return (
    <div className="sr-only" aria-live="polite" aria-atomic="true">
      {text}
    </div>
  );
}
