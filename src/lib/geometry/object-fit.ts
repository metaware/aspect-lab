import type { FitResult, ObjectFit } from "@/types/simulator";
import { assertDimension } from "./validate";

/**
 * Replicates CSS `object-fit` + percentage `object-position`.
 * Iw/Ih: effective source size, Cw/Ch: container size, Px/Py: position 0–1.
 */
export function computeFit(
  Iw: number,
  Ih: number,
  Cw: number,
  Ch: number,
  fit: ObjectFit,
  Px = 0.5,
  Py = 0.5,
): FitResult {
  assertDimension(Iw, "image width");
  assertDimension(Ih, "image height");
  assertDimension(Cw, "container width");
  assertDimension(Ch, "container height");

  let Rw: number;
  let Rh: number;

  switch (fit) {
    case "cover": {
      const scale = Math.max(Cw / Iw, Ch / Ih);
      Rw = Iw * scale;
      Rh = Ih * scale;
      break;
    }
    case "contain": {
      const scale = Math.min(Cw / Iw, Ch / Ih);
      Rw = Iw * scale;
      Rh = Ih * scale;
      break;
    }
    case "fill":
      Rw = Cw;
      Rh = Ch;
      break;
    case "none":
      Rw = Iw;
      Rh = Ih;
      break;
    case "scale-down": {
      const scale = Math.min(1, Cw / Iw, Ch / Ih);
      Rw = Iw * scale;
      Rh = Ih * scale;
      break;
    }
  }

  return {
    renderedWidth: Rw,
    renderedHeight: Rh,
    scaleX: Rw / Iw,
    scaleY: Rh / Ih,
    offsetX: (Cw - Rw) * Px,
    offsetY: (Ch - Rh) * Py,
  };
}

export const OBJECT_FIT_DESCRIPTIONS: Record<ObjectFit, string> = {
  cover: "Fills the container while preserving aspect ratio, potentially cropping the image.",
  contain: "Preserves the entire image but may introduce empty space.",
  fill: "Stretches the image to the container dimensions, distorting it.",
  none: "Uses the intrinsic image dimensions without scaling.",
  "scale-down": "Uses whichever rendered size is smaller between none and contain.",
};
