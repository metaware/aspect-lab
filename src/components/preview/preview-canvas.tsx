"use client";

import { useRef, useState } from "react";
import { Grid3x3, Hand, Ruler, MoveDiagonal, ShieldCheck, Square, Crosshair, Scan, Columns2, Image as ImageIcon, Frame } from "lucide-react";
import { usePreviewModel } from "@/hooks/use-preview-model";
import { useCanvasZoom, useSpacePan } from "@/hooks/use-canvas-zoom";
import { useSafeZone } from "@/hooks/use-safe-zone";
import { useSimulatorStore } from "@/store/simulator-store";
import { Segmented, Kbd } from "@/components/ui/controls";
import { Tooltip } from "@/components/ui/tooltip";
import { cn, fmt } from "@/lib/utils";
import type { PreviewView } from "@/types/simulator";
import { ComponentPreview } from "./component-preview";
import { DimensionGuides, Rulers } from "./dimension-guides";
import { ZoomControl } from "./zoom-toolbar";
import { InfoButton } from "@/components/docs/info-button";
import { SourceImagePreview, CropLegend } from "./source-image-preview";

const PADDING = 88;
/** Extra bottom padding so the floating toolbar never covers the component. */
const TOOLBAR_INSET = 40;

const HEIGHT_LABELS: Record<string, string> = {
  fixed: "Fixed",
  aspect: "Aspect ratio",
  auto: "Auto",
  viewport: "Viewport",
  fluid: "Fluid",
  content: "Content",
};

/** Horizontal placement of the container inside the simulated viewport. */
function containerLeft(widthMode: string, viewport: number, container: number, gutter: number) {
  if (widthMode === "max") return (viewport - container) / 2;
  return gutter;
}

export function PreviewCanvas() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const model = usePreviewModel();
  const { config, sim, source } = model;
  const ws = config.workspace;
  const patch = useSimulatorStore((s) => s.patch);
  const Cw = sim.metrics.containerWidth;
  const Ch = sim.metrics.containerHeight;
  const vw = config.viewport.width;
  const stageWidth = Math.max(vw, Cw);

  const { zoom, zoomMode, setZoom, setFit, stepZoom, box } = useCanvasZoom(
    scrollerRef,
    { width: ws.view === "split" ? stageWidth * 2.1 : stageWidth, height: Ch },
    PADDING,
    ws.view,
    // Anchor on the component alone only when it is the only thing on the canvas.
    ws.view === "component" ? stageRef : undefined,
    TOOLBAR_INSET,
  );
  // In split view the cropping card takes whatever width is left beside the
  // component (gap-16 = 64px between them), within a readable range.
  const splitCardWidth = Math.min(520, Math.max(240, box.width - stageWidth * zoom - PADDING * 2 - 64));
  const [panMode, setPanMode] = useState(false);
  const { panActive, panning } = useSpacePan(scrollerRef, panMode);
  const safeZone = useSafeZone(ws.showSafeZone);

  const toggle = (key: keyof typeof ws) => patch("workspace", { [key]: !ws[key] } as Partial<typeof ws>);
  const center = () => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({
      left: (el.scrollWidth - el.clientWidth) / 2,
      top: (el.scrollHeight - el.clientHeight) / 2,
      behavior: "smooth",
    });
  };

  const bp = config.analysis.breakpoints.find((b) => vw >= Math.min(b.min, b.max) && vw <= Math.max(b.min, b.max));
  const left = containerLeft(config.container.widthMode, vw, Cw, config.container.horizontalGutter);
  const showViewportFrame = Math.abs(vw - Cw) > 0.5 || left > 0.5;
  const rangeLabel = `${config.analysis.minViewport}–${config.analysis.maxViewport}px`;

  const stage = (
    <div ref={stageRef} className="relative shrink-0" style={{ width: stageWidth * zoom, height: Ch * zoom }}>
      {showViewportFrame && (
        <div
          className="pointer-events-none absolute top-0 border-y border-dashed border-accent/50"
          style={{ left: Math.min(0, left) * zoom, width: vw * zoom, height: Ch * zoom }}
          aria-hidden
        >
          <span className="num absolute -bottom-5 left-0 whitespace-nowrap text-[10px] text-accent-text">
            Viewport {vw}px
          </span>
        </div>
      )}
      <div className="absolute top-0" style={{ left: Math.max(0, left) * zoom }}>
        {ws.showRulers && <Rulers width={Cw} height={Ch} zoom={zoom} />}
        {ws.showDimensions && (
          <DimensionGuides
            width={Cw}
            height={Ch}
            zoom={zoom}
            heightLabel={HEIGHT_LABELS[config.container.heightMode]}
          />
        )}
        <ComponentPreview
          model={model}
          zoom={zoom}
          interactive={!panActive}
          showGhost={ws.showCropOverlay}
          showOutline={ws.showOutline}
          safeZone={safeZone}
        />
      </div>
    </div>
  );

  const sourceView = (
    <div className="flex w-full max-w-[min(100%,720px)] flex-col gap-3 rounded-lg border border-border bg-panel p-3 shadow-panel">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[13px] font-medium">Cropping preview</h3>
        <span className="text-[11px] text-muted-foreground">Which parts of the source are lost</span>
      </div>
      <SourceImagePreview sim={sim} src={source.src} safeZone={safeZone} maxHeight="56vh" rangeLabel={rangeLabel} />
      <CropLegend sourceCropped={sim.effective.sourceCroppedPercentage > 0.01} />
    </div>
  );

  return (
    <section className="flex h-full min-h-0 flex-col" aria-label="Preview workspace">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-panel px-3 py-2">
        <div className="flex items-center gap-3">
          <h2 className="text-[13px] font-medium">
            {ws.view === "source" ? "Cropping preview" : ws.view === "split" ? "Split view" : "Component preview"}
          </h2>
          <InfoButton topic="canvas" className="-ml-2" />
          <Segmented<PreviewView>
            label="Preview mode"
            size="sm"
            value={ws.view}
            onChange={(view) => patch("workspace", { view })}
            className="w-[276px]"
            options={[
              { value: "component", label: <><Frame className="size-3" aria-hidden />Component</>, tooltip: "What users see in the actual component" },
              { value: "source", label: <><ImageIcon className="size-3" aria-hidden />Cropping</>, tooltip: "Which parts of the source image are lost" },
              { value: "split", label: <><Columns2 className="size-3" aria-hidden />Split</>, tooltip: "Both side by side" },
            ]}
          />
        </div>
        <ZoomControl zoom={zoom} zoomMode={zoomMode} setZoom={setZoom} setFit={setFit} stepZoom={stepZoom} />
      </div>

      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollerRef}
          className={cn(
            "absolute inset-0 overflow-auto scrollbar-thin",
            ws.showGrid ? "canvas-dots" : "bg-canvas",
            panActive && (panning ? "cursor-grabbing" : "cursor-grab"),
          )}
          data-testid="canvas-scroller"
        >
          <div
            className="flex min-h-full min-w-full w-max items-center justify-center gap-16"
            style={{ padding: PADDING, paddingBottom: PADDING + TOOLBAR_INSET }}
          >
            {ws.view !== "source" && stage}
            {ws.view !== "component" && (ws.view === "split" ? <div style={{ width: splitCardWidth }}>{sourceView}</div> : sourceView)}
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center px-3">
          <div
            className="pointer-events-auto flex items-center gap-0.5 rounded-lg border border-border bg-panel/95 p-1 shadow-panel backdrop-blur"
            role="toolbar"
            aria-label="Canvas tools"
          >
            <ToolButton
              icon={Hand}
              label="Pan"
              shortcut="Space"
              active={panActive}
              onClick={() => setPanMode((v) => !v)}
              disabledNote="Pan (or hold Space and drag)"
            />
            <ToolButton icon={Grid3x3} label="Grid" shortcut="G" active={ws.showGrid} onClick={() => toggle("showGrid")} />
            <ToolButton icon={Ruler} label="Rulers" shortcut="R" active={ws.showRulers} onClick={() => toggle("showRulers")} />
            <ToolButton icon={MoveDiagonal} label="Dimensions" shortcut="D" active={ws.showDimensions} onClick={() => toggle("showDimensions")} />
            <ToolButton icon={Scan} label="Cropped area" shortcut="C" active={ws.showCropOverlay} onClick={() => toggle("showCropOverlay")} />
            <ToolButton icon={Square} label="Outline" shortcut="O" active={ws.showOutline} onClick={() => toggle("showOutline")} />
            <ToolButton icon={ShieldCheck} label="Safe zone" shortcut="S" active={ws.showSafeZone} onClick={() => toggle("showSafeZone")} />
            <div className="mx-1 h-5 w-px bg-border" aria-hidden />
            <ToolButton icon={Crosshair} label="Center canvas" onClick={center} />
            <button
              type="button"
              onClick={setFit}
              aria-pressed={zoomMode === "fit"}
              className={cn(
                "h-7 rounded-md px-2.5 text-xs font-medium transition-colors",
                zoomMode === "fit" ? "bg-accent-soft text-accent-text" : "text-muted-foreground hover:bg-surface-hover hover:text-foreground",
              )}
            >
              Fit
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-border bg-panel px-3 py-1.5 text-[11px] text-muted-foreground">
        <span className="num">
          Viewport {vw} × {config.viewport.height} · Container {fmt(Cw)} × {fmt(Ch)}
          {bp ? ` · ${Math.min(bp.min, bp.max)}–${Math.max(bp.min, bp.max)}px range` : ""}
        </span>
        <span className="hidden items-center gap-1.5 sm:flex">
          {zoomMode === "fit" ? "Auto-fit" : "Constant scale"} · <Kbd>Space</Kbd> pan · <Kbd>⌘</Kbd>+scroll zoom · drag image to reposition
        </span>
      </div>
    </section>
  );
}

function ToolButton({
  icon: Icon,
  label,
  shortcut,
  active,
  onClick,
  disabledNote,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  shortcut?: string;
  active?: boolean;
  onClick: () => void;
  disabledNote?: string;
}) {
  return (
    <Tooltip
      content={
        <span className="flex items-center gap-2">
          {disabledNote ?? label}
          {shortcut && <Kbd>{shortcut}</Kbd>}
        </span>
      }
    >
      <button
        type="button"
        aria-label={label}
        aria-pressed={active}
        onClick={onClick}
        className={cn(
          "flex h-7 items-center gap-1.5 rounded-md px-2 text-xs transition-colors [&_svg]:size-3.5",
          active ? "bg-accent-soft text-accent-text" : "text-muted-foreground hover:bg-surface-hover hover:text-foreground",
        )}
      >
        <Icon />
        <span className="hidden whitespace-nowrap 2xl:inline">{label}</span>
      </button>
    </Tooltip>
  );
}
