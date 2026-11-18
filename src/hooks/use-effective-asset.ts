"use client";

import { useEffect, useState } from "react";
import type { EffectiveSource } from "@/types/simulator";

/**
 * Produces the conceptual source asset (cropped or distorted original) as a
 * real image so the preview can use genuine CSS object-fit on it.
 * Assets are cached by signature; evicted object URLs are revoked.
 */

const imageCache = new Map<string, Promise<HTMLImageElement>>();
const assetCache = new Map<string, string>();
const MAX_ASSETS = 16;

export function loadImage(src: string, crossOrigin = false): Promise<HTMLImageElement> {
  const key = `${crossOrigin ? "cors:" : ""}${src}`;
  let p = imageCache.get(key);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image();
      if (crossOrigin) img.crossOrigin = "anonymous";
      img.decoding = "async";
      img.onload = () => resolve(img);
      img.onerror = () => {
        imageCache.delete(key);
        reject(new Error("Image failed to load"));
      };
      img.src = src;
    });
    imageCache.set(key, p);
    if (imageCache.size > 24) imageCache.delete(imageCache.keys().next().value!);
  }
  return p;
}

export function needsAsset(effective: EffectiveSource, original: { width: number; height: number }): boolean {
  const r = effective.sourceRect;
  return (
    effective.distorted ||
    r.x > 0.5 ||
    r.y > 0.5 ||
    Math.abs(r.width - original.width) > 0.5 ||
    Math.abs(r.height - original.height) > 0.5
  );
}

function signature(src: string, e: EffectiveSource): string {
  const r = e.sourceRect;
  return [src.length > 200 ? src.slice(0, 120) + src.length + src.slice(-60) : src, r.x, r.y, r.width, r.height, Math.round(e.width), Math.round(e.height)]
    .map((v) => (typeof v === "number" ? v.toFixed(2) : v))
    .join("|");
}

/** Draws the effective asset onto a canvas (used for preview assets and exports). */
export function drawEffectiveAsset(img: HTMLImageElement, e: EffectiveSource): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(e.width));
  canvas.height = Math.max(1, Math.round(e.height));
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  const r = e.sourceRect;
  ctx.drawImage(img, r.x, r.y, r.width, r.height, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/**
 * Returns an object URL for the effective asset, the original src when no
 * transformation is needed, or null while generating / when pixels are not
 * readable (callers then fall back to geometry-driven emulation).
 */
export function useEffectiveAsset(
  src: string | null,
  original: { width: number; height: number },
  effective: EffectiveSource,
  pixelsReadable: boolean,
  crossOrigin = false,
): string | null {
  const transform = src != null && needsAsset(effective, original);
  const key = src && transform ? signature(src, effective) : null;
  const [, force] = useState(0);

  useEffect(() => {
    if (!key || !src || !pixelsReadable || assetCache.has(key)) return;
    let cancelled = false;
    loadImage(src, crossOrigin)
      .then(
        (img) =>
          new Promise<Blob | null>((resolve) => {
            try {
              drawEffectiveAsset(img, effective).toBlob(resolve, "image/webp", 0.92);
            } catch {
              resolve(null);
            }
          }),
      )
      .then((blob) => {
        if (!blob) return;
        assetCache.set(key, URL.createObjectURL(blob));
        while (assetCache.size > MAX_ASSETS) {
          const [oldKey, oldUrl] = assetCache.entries().next().value!;
          assetCache.delete(oldKey);
          URL.revokeObjectURL(oldUrl);
        }
        if (!cancelled) force((n) => n + 1);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // effective is captured via key
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, src, pixelsReadable, crossOrigin]);

  if (!src) return null;
  if (!transform) return src;
  return (key && assetCache.get(key)) ?? null;
}
