"use client";

import { Minus, Plus, ChevronDown, Maximize } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/overlays";
import { ZOOM_PRESETS } from "@/hooks/use-canvas-zoom";
import { Tooltip } from "@/components/ui/tooltip";
import { Kbd } from "@/components/ui/controls";
import { cn } from "@/lib/utils";

export function ZoomControl({
  zoom,
  zoomMode,
  setZoom,
  setFit,
  stepZoom,
}: {
  zoom: number;
  zoomMode: "manual" | "fit";
  setZoom: (z: number) => void;
  setFit: () => void;
  stepZoom: (dir: 1 | -1) => void;
}) {
  return (
    <div className="flex items-center rounded-md border border-border bg-surface" role="group" aria-label="Zoom">
      <Tooltip content={<span className="flex items-center gap-2">Zoom out <Kbd>−</Kbd></span>}>
        <button
          type="button"
          aria-label="Zoom out"
          onClick={() => stepZoom(-1)}
          className="flex size-7 items-center justify-center text-muted-foreground hover:text-foreground"
        >
          <Minus className="size-3.5" />
        </button>
      </Tooltip>
      <Popover>
        <PopoverTrigger
          className="num flex h-7 min-w-[66px] items-center justify-center gap-1 border-x border-border px-2 text-xs text-foreground hover:bg-surface-hover"
          aria-label={`Zoom level ${Math.round(zoom * 100)}%${zoomMode === "fit" ? ", fit to workspace" : ""}`}
        >
          {zoomMode === "fit" && <Maximize className="size-3 text-accent-text" aria-hidden />}
          {Math.round(zoom * 100)}%
          <ChevronDown className="size-3 text-subtle-foreground" aria-hidden />
        </PopoverTrigger>
        <PopoverContent align="end" className="w-44 p-1">
          <div role="menu" aria-label="Zoom presets" className="flex flex-col">
            {ZOOM_PRESETS.map((p) => (
              <button
                key={p}
                role="menuitemradio"
                aria-checked={zoomMode === "manual" && Math.abs(zoom - p) < 1e-3}
                type="button"
                onClick={() => setZoom(p)}
                className={cn(
                  "num flex h-7 items-center justify-between rounded px-2 text-left text-xs hover:bg-surface-hover",
                  zoomMode === "manual" && Math.abs(zoom - p) < 1e-3 && "text-accent-text",
                )}
              >
                {p * 100}%{p === 1 && <Kbd>0</Kbd>}
              </button>
            ))}
            <div className="my-1 h-px bg-border" />
            <button
              type="button"
              role="menuitemradio"
              aria-checked={zoomMode === "fit"}
              onClick={setFit}
              className={cn(
                "flex h-7 items-center justify-between rounded px-2 text-left text-xs hover:bg-surface-hover",
                zoomMode === "fit" && "text-accent-text",
              )}
            >
              Fit to workspace <Kbd>F</Kbd>
            </button>
          </div>
        </PopoverContent>
      </Popover>
      <Tooltip content={<span className="flex items-center gap-2">Zoom in <Kbd>+</Kbd></span>}>
        <button
          type="button"
          aria-label="Zoom in"
          onClick={() => stepZoom(1)}
          className="flex size-7 items-center justify-center text-muted-foreground hover:text-foreground"
        >
          <Plus className="size-3.5" />
        </button>
      </Tooltip>
    </div>
  );
}
