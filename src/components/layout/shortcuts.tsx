"use client";

import { useEffect } from "react";
import { useSimulatorStore } from "@/store/simulator-store";
import { Dialog, DialogContent } from "@/components/ui/overlays";
import { Kbd } from "@/components/ui/controls";
import { ZOOM_PRESETS } from "@/hooks/use-canvas-zoom";
import { VIEWPORT_MAX, VIEWPORT_MIN } from "@/lib/configuration/defaults";

const SHORTCUTS: Array<[string[], string]> = [
  [["[", "]"], "Viewport width −/+ 1px (Shift: 10px)"],
  [["+", "−"], "Zoom in / out"],
  [["0"], "Zoom to 100%"],
  [["F"], "Fit to workspace"],
  [["G"], "Toggle grid"],
  [["R"], "Toggle rulers"],
  [["D"], "Toggle dimensions"],
  [["C"], "Toggle cropped area"],
  [["S"], "Toggle safe zone"],
  [["1", "2", "3"], "Component / cropping / split view"],
  [["Space"], "Hold and drag to pan"],
  [["⌘", "scroll"], "Zoom canvas"],
  [["?"], "Show shortcuts"],
];

function isEditable(t: EventTarget | null) {
  const el = t as HTMLElement | null;
  return !!el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) || el.getAttribute("role") === "slider");
}

/** Global keyboard shortcuts (ignored while typing). */
export function useKeyboardShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isEditable(e.target)) return;
      const { config, patch } = useSimulatorStore.getState();
      const ws = config.workspace;
      const toggle = (k: keyof typeof ws) => patch("workspace", { [k]: !ws[k] } as Partial<typeof ws>);
      const zoomTo = (z: number) => patch("workspace", { zoom: z, zoomMode: "manual" });
      const step = e.shiftKey ? 10 : 1;
      switch (e.key) {
        case "[":
        case "{":
          patch("viewport", { width: Math.max(VIEWPORT_MIN, config.viewport.width - step) });
          break;
        case "]":
        case "}":
          patch("viewport", { width: Math.min(VIEWPORT_MAX, config.viewport.width + step) });
          break;
        case "+":
        case "=":
          zoomTo(ZOOM_PRESETS.find((p) => p > ws.zoom + 1e-3) ?? Math.min(4, ws.zoom * 1.25));
          break;
        case "-":
        case "_":
          zoomTo([...ZOOM_PRESETS].reverse().find((p) => p < ws.zoom - 1e-3) ?? Math.max(0.05, ws.zoom / 1.25));
          break;
        case "0":
          zoomTo(1);
          break;
        case "f":
          patch("workspace", { zoomMode: "fit" });
          break;
        case "g":
          toggle("showGrid");
          break;
        case "r":
          toggle("showRulers");
          break;
        case "d":
          toggle("showDimensions");
          break;
        case "c":
          toggle("showCropOverlay");
          break;
        case "s":
          toggle("showSafeZone");
          break;
        case "o":
          toggle("showOutline");
          break;
        case "1":
          patch("workspace", { view: "component" });
          break;
        case "2":
          patch("workspace", { view: "source" });
          break;
        case "3":
          patch("workspace", { view: "split" });
          break;
        case "?":
          window.dispatchEvent(new Event("aspectlab:shortcuts"));
          break;
        case "Escape":
          useSimulatorStore.getState().setFocalPicking(false);
          return;
        default:
          return;
      }
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

export function ShortcutsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Keyboard shortcuts" description="Shortcuts are disabled while typing in a field.">
        <dl className="divide-y divide-border">
          {SHORTCUTS.map(([keys, label]) => (
            <div key={label} className="flex items-center justify-between py-2 text-[13px]">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="flex gap-1">
                {keys.map((k) => (
                  <Kbd key={k}>{k}</Kbd>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      </DialogContent>
    </Dialog>
  );
}
