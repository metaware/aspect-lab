/* eslint-disable @next/next/no-img-element */
"use client";

import type { CSSProperties } from "react";
import type { ObjectFit, Size } from "@/types/simulator";
import type { Simulation } from "@/lib/geometry/simulate";
import { ImageOff } from "lucide-react";

/**
 * Renders the image inside a container box of exactly Cw × Ch CSS pixels.
 * With an asset URL it uses the browser's own object-fit/object-position;
 * otherwise it emulates the identical geometry from the calculation engine.
 */
export function RenderedImage({
  sim,
  asset,
  originalSrc,
  fit,
  alt,
  draggable,
}: {
  sim: Simulation;
  asset: string | null;
  originalSrc: string | null;
  fit: ObjectFit;
  alt: string;
  draggable?: boolean;
}) {
  const { position } = sim;

  if (!originalSrc) {
    return (
      <div className="flex size-full flex-col items-center justify-center gap-2 text-subtle-foreground">
        <ImageOff className="size-8" aria-hidden />
        <span className="text-sm">No image loaded</span>
      </div>
    );
  }

  if (asset) {
    return (
      <img
        src={asset}
        alt={alt}
        draggable={draggable ?? false}
        className="block size-full select-none"
        style={{
          objectFit: fit,
          objectPosition: `${position.x * 100}% ${position.y * 100}%`,
        }}
      />
    );
  }

  return <EmulatedImage sim={sim} src={originalSrc} alt={alt} />;
}

/** Positions the original so its source rect maps onto the rendered image rect. */
export function EmulatedImage({
  sim,
  src,
  alt,
  style,
}: {
  sim: Simulation;
  src: string;
  alt: string;
  style?: CSSProperties;
}) {
  const { metrics, effective, original } = sim;
  return (
    <div
      className="absolute overflow-hidden"
      style={{
        left: metrics.offsetX,
        top: metrics.offsetY,
        width: metrics.renderedWidth,
        height: metrics.renderedHeight,
        ...style,
      }}
    >
      <img src={src} alt={alt} draggable={false} className="absolute max-w-none select-none" style={emulatedInnerStyle(original, effective.sourceRect, metrics.renderedWidth, metrics.renderedHeight)} />
    </div>
  );
}

export function emulatedInnerStyle(
  original: Size,
  rect: { x: number; y: number; width: number; height: number },
  Rw: number,
  Rh: number,
): CSSProperties {
  const sx = Rw / rect.width;
  const sy = Rh / rect.height;
  return {
    width: original.width * sx,
    height: original.height * sy,
    left: -rect.x * sx,
    top: -rect.y * sy,
  };
}
