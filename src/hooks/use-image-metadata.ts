"use client";

import { useEffect, useMemo } from "react";
import type { ImageMetadata, Size } from "@/types/simulator";
import { useSimulatorStore } from "@/store/simulator-store";
import { getSample } from "@/lib/assets/sample-images";
import { testImageDataUrl } from "@/lib/assets/test-image";
import { testImageSize } from "@/lib/geometry/simulate";
import { parseRatio } from "@/lib/assets/aspect-ratios";

export interface SourceImage {
  /** URL of the original image, or null when unavailable (e.g. missing upload). */
  src: string | null;
  original: Size;
  meta: ImageMetadata;
  status: "ready" | "loading" | "missing" | "error";
  /** Pixels can be read (canvas export / crop asset generation). */
  pixelsReadable: boolean;
  label: string;
  /** Generated test image: regenerated natively per ratio. */
  generated: boolean;
}

const PLACEHOLDER: Size = { width: 2400, height: 1600 };

/** Resolves the currently selected original image and its intrinsic metadata. */
export function useSourceImage(): SourceImage {
  const image = useSimulatorStore((s) => s.config.image);
  const upload = useSimulatorStore((s) => s.upload);
  const remote = useSimulatorStore((s) => s.remote);
  const sampleBytes = useSimulatorStore((s) => s.sampleBytes);
  const setSampleBytes = useSimulatorStore((s) => s.setSampleBytes);

  const result = useMemo<SourceImage>(() => {
    if (image.source === "test" || (image.source === "sample" && getSample(image.sampleId).generated)) {
      const ratio = image.source === "test" && image.aspectRatio !== "native" ? (parseRatio(image.aspectRatio)?.value ?? null) : null;
      const size = ratio != null ? testImageSize(ratio) : PLACEHOLDER;
      return {
        src: testImageDataUrl(size.width, size.height),
        original: size,
        meta: { ...size, format: "SVG (generated)", fileSize: null, name: "Calibration grid" },
        status: "ready",
        pixelsReadable: true,
        label: image.source === "test" ? "Technical test image" : "Calibration grid",
        generated: true,
      };
    }
    if (image.source === "sample") {
      const s = getSample(image.sampleId);
      return {
        src: s.src,
        original: { width: s.width, height: s.height },
        meta: { width: s.width, height: s.height, format: "WebP", fileSize: sampleBytes[s.src] ?? null, name: s.name },
        status: "ready",
        pixelsReadable: true,
        label: s.name,
        generated: false,
      };
    }
    if (image.source === "upload") {
      if (!upload)
        return {
          src: null,
          original: PLACEHOLDER,
          meta: { ...PLACEHOLDER, format: null, fileSize: null, name: null },
          status: "missing",
          pixelsReadable: false,
          label: "Uploaded image",
          generated: false,
        };
      return {
        src: upload.src,
        original: { width: upload.meta.width, height: upload.meta.height },
        meta: upload.meta,
        status: "ready",
        pixelsReadable: true,
        label: upload.meta.name ?? "Uploaded image",
        generated: false,
      };
    }
    // Remote URL
    if (!remote || remote.url !== image.url || remote.status !== "ready" || !remote.meta) {
      return {
        src: null,
        original: PLACEHOLDER,
        meta: { ...PLACEHOLDER, format: null, fileSize: null, name: null },
        status: remote?.status === "error" ? "error" : image.url ? "loading" : "missing",
        pixelsReadable: false,
        label: "Remote image",
        generated: false,
      };
    }
    return {
      src: remote.url,
      original: { width: remote.meta.width, height: remote.meta.height },
      meta: remote.meta,
      status: "ready",
      pixelsReadable: remote.corsSafe,
      label: remote.meta.name ?? "Remote image",
      generated: false,
    };
  }, [image, upload, remote, sampleBytes]);

  // Measure built-in sample transfer size from the resource timing entry.
  useEffect(() => {
    if (image.source !== "sample" || !result.src || result.generated || sampleBytes[result.src] != null) return;
    const src = result.src;
    const probe = () => {
      const abs = new URL(src, window.location.href).href;
      const entry = performance.getEntriesByName(abs)[0] as PerformanceResourceTiming | undefined;
      const bytes = entry?.encodedBodySize || entry?.decodedBodySize;
      if (bytes) setSampleBytes(src, bytes);
      return Boolean(bytes);
    };
    if (probe()) return;
    const t = setInterval(() => probe() && clearInterval(t), 500);
    const stop = setTimeout(() => clearInterval(t), 8000);
    return () => {
      clearInterval(t);
      clearTimeout(stop);
    };
  }, [image.source, result.src, result.generated, sampleBytes, setSampleBytes]);

  return result;
}

const MIME_LABELS: Record<string, string> = {
  "image/jpeg": "JPEG",
  "image/png": "PNG",
  "image/webp": "WebP",
  "image/avif": "AVIF",
  "image/gif": "GIF",
  "image/svg+xml": "SVG",
};

export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];

export function formatLabel(mime: string | null | undefined): string | null {
  if (!mime) return null;
  return MIME_LABELS[mime] ?? mime.replace("image/", "").toUpperCase();
}

function decodeSize(src: string, crossOrigin?: "anonymous"): Promise<Size> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (crossOrigin) img.crossOrigin = crossOrigin;
    img.decoding = "async";
    img.onload = () =>
      img.naturalWidth > 0 ? resolve({ width: img.naturalWidth, height: img.naturalHeight }) : reject(new Error("Image has no dimensions"));
    img.onerror = () => reject(new Error("Image could not be loaded"));
    img.src = src;
  });
}

/** Reads a local file into an object URL. The file never leaves the browser. */
export async function readLocalImage(file: File): Promise<{ src: string; meta: ImageMetadata }> {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    throw new Error(`Unsupported format${file.type ? ` (${file.type})` : ""}. Use JPEG, PNG, WebP, AVIF or GIF.`);
  }
  const src = URL.createObjectURL(file);
  try {
    const size = await decodeSize(src);
    return { src, meta: { ...size, format: formatLabel(file.type), fileSize: file.size, name: file.name } };
  } catch (e) {
    URL.revokeObjectURL(src);
    throw e;
  }
}

/** Loads a remote image, preferring CORS so pixels stay readable. */
export async function loadRemoteImage(url: string): Promise<{ meta: ImageMetadata; corsSafe: boolean }> {
  const name = decodeURIComponent(new URL(url).pathname.split("/").pop() || "") || null;
  const ext = name?.split(".").pop()?.toLowerCase();
  const format = ext && ["jpg", "jpeg", "png", "webp", "avif", "gif", "svg"].includes(ext) ? (ext === "jpg" ? "JPEG" : ext.toUpperCase()) : null;
  const bytesFromTiming = () => {
    const e = performance.getEntriesByName(url)[0] as PerformanceResourceTiming | undefined;
    return e?.encodedBodySize || null;
  };
  try {
    const size = await decodeSize(url, "anonymous");
    return { meta: { ...size, format, fileSize: bytesFromTiming(), name }, corsSafe: true };
  } catch {
    const size = await decodeSize(url);
    return { meta: { ...size, format, fileSize: null, name }, corsSafe: false };
  }
}
