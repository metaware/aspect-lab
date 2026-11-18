/* eslint-disable @next/next/no-img-element */
"use client";

import { useRef } from "react";
import type { PreviewModel } from "@/hooks/use-preview-model";
import { useSimulatorStore } from "@/store/simulator-store";
import { cn } from "@/lib/utils";
import type { SafeZone } from "@/lib/geometry/safe-zone";
import { RenderedImage, EmulatedImage } from "./rendered-image";
import { ContentOverlay } from "./content-overlay";

/**
 * The component exactly as a browser would render it: a Cw × Ch box at true
 * CSS size, scaled by the workspace zoom. Optional ghost shows cropped parts
 * of the rendered image beyond the container edge.
 */
export function ComponentPreview({
  model,
  zoom,
  interactive,
  showGhost,
  showOutline,
  safeZone,
  showOverlay = true,
}: {
  model: PreviewModel;
  zoom: number;
  interactive?: boolean;
  showGhost?: boolean;
  showOutline?: boolean;
  safeZone?: SafeZone | null;
  showOverlay?: boolean;
}) {
  const { sim, asset, source, config } = model;
  const { metrics } = sim;
  const Cw = metrics.containerWidth;
  const Ch = metrics.containerHeight;
  const patch = useSimulatorStore((s) => s.patch);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  const slackX = Cw - metrics.renderedWidth;
  const slackY = Ch - metrics.renderedHeight;
  const canDrag = interactive && (Math.abs(slackX) > 0.5 || Math.abs(slackY) > 0.5);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!canDrag || e.button !== 0 || document.body.dataset.panning === "true") return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, px: sim.position.x, py: sim.position.y };
    if (config.image.keepFocalCentered) patch("image", { keepFocalCentered: false });
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    // Moving the image by dx CSS px changes offset = slack × P by dx.
    const dx = (e.clientX - d.x) / zoom;
    const dy = (e.clientY - d.y) / zoom;
    const nx = Math.abs(slackX) > 0.5 ? Math.min(1, Math.max(0, d.px + dx / slackX)) : d.px;
    const ny = Math.abs(slackY) > 0.5 ? Math.min(1, Math.max(0, d.py + dy / slackY)) : d.py;
    patch("rendering", { objectPositionX: Math.round(nx * 1000) / 1000, objectPositionY: Math.round(ny * 1000) / 1000 });
  };
  const endDrag = () => {
    drag.current = null;
  };

  const ghost = showGhost && source.src && metrics.imageCroppedPercentage > 0.01;
  const ghostRect = {
    left: metrics.offsetX * zoom,
    top: metrics.offsetY * zoom,
    width: metrics.renderedWidth * zoom,
    height: metrics.renderedHeight * zoom,
  };

  const sz = safeZone?.rect;

  return (
    <div className="relative" style={{ width: Cw * zoom, height: Ch * zoom }}>
      {ghost && (
        <>
          <div
            className="pointer-events-none absolute left-0 top-0 origin-top-left opacity-30"
            style={{ width: Cw, height: Ch, transform: `scale(${zoom})` }}
            aria-hidden
          >
            {asset ? (
              <img
                src={asset}
                alt=""
                draggable={false}
                className="absolute max-w-none select-none"
                style={{
                  left: metrics.offsetX,
                  top: metrics.offsetY,
                  width: metrics.renderedWidth,
                  height: metrics.renderedHeight,
                }}
              />
            ) : (
              <EmulatedImage sim={sim} src={source.src!} alt="" />
            )}
          </div>
          <div className="hatch pointer-events-none absolute border border-dashed border-guide/40" style={ghostRect} aria-hidden />
        </>
      )}

      <div
        className={cn("absolute left-0 top-0 origin-top-left overflow-hidden", canDrag && "cursor-grab active:cursor-grabbing")}
        style={{ width: Cw, height: Ch, transform: `scale(${zoom})`, background: config.container.background }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        role="img"
        aria-label={`Component preview, ${Math.round(Cw)} by ${Math.round(Ch)} pixels, ${metrics.imageCroppedPercentage.toFixed(1)}% of the image cropped`}
        data-testid="component-preview"
      >
        <RenderedImage sim={sim} asset={asset} originalSrc={source.src} fit={config.rendering.objectFit} alt={source.label} />
        {showOverlay && <ContentOverlay overlay={config.overlay} />}
      </div>

      {sz && (
        <div
          className="pointer-events-none absolute border-2 border-dashed border-warning"
          style={{
            left: (metrics.offsetX + sz.x * metrics.scaleX) * zoom,
            top: (metrics.offsetY + sz.y * metrics.scaleY) * zoom,
            width: sz.width * metrics.scaleX * zoom,
            height: sz.height * metrics.scaleY * zoom,
          }}
          aria-hidden
        >
          <span className="num absolute left-1 top-1 rounded bg-warning px-1 text-[10px] font-medium text-black/80">
            Safe zone
          </span>
        </div>
      )}

      {showOutline && (
        <div className="pointer-events-none absolute inset-0 rounded-[1px] ring-2 ring-accent" aria-hidden />
      )}
    </div>
  );
}
