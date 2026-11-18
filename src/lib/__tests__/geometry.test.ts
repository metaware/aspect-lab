import { describe, expect, it } from "vitest";
import { computeCropMetrics } from "@/lib/geometry/cropping";
import { computeFit } from "@/lib/geometry/object-fit";
import { resolveContainer, gridSpanWidth } from "@/lib/geometry/resolve-container";
import { computeEffectiveSource, cropPositionForFocalPoint } from "@/lib/geometry/effective-source";
import { positionForFocalPoint } from "@/lib/geometry/focal-point";
import { simulate } from "@/lib/geometry/simulate";
import { computeSafeZone } from "@/lib/geometry/safe-zone";
import { parseRatio } from "@/lib/assets/aspect-ratios";
import { createDefaultConfig } from "@/lib/configuration/defaults";
import type { ObjectFit, SimulatorConfig } from "@/types/simulator";

const TOL = 2; // decimal places → ±0.005

function ratioSize(ratio: string, longEdge = 2400) {
  const r = parseRatio(ratio)!.value;
  return r >= 1 ? { w: longEdge, h: longEdge / r } : { w: longEdge * r, h: longEdge };
}

describe("acceptance: cropping table", () => {
  const cases: Array<[string, number, number, ObjectFit, number]> = [
    ["9:16", 360, 640, "cover", 0],
    ["9:16", 430, 640, "cover", 16.28],
    ["9:16", 767, 640, "cover", 53.06],
    ["9:16", 1535, 640, "cover", 76.55],
    ["4:5", 360, 640, "cover", 29.69],
    ["4:5", 512, 640, "cover", 0],
    ["4:5", 767, 640, "cover", 33.25],
    ["1:1", 640, 640, "cover", 0],
    ["16:9", 1280, 720, "cover", 0],
    ["9:16", 767, 640, "contain", 0],
    ["9:16", 767, 640, "fill", 0],
  ];
  it.each(cases)("%s in %d×%d (%s) crops %f%%", (ratio, cw, ch, fit, expected) => {
    const { w, h } = ratioSize(ratio);
    const m = computeCropMetrics(w, h, cw, ch, fit);
    expect(m.imageCroppedPercentage).toBeCloseTo(expected, TOL);
  });

  it("fill distorts (unequal axis scales)", () => {
    const { w, h } = ratioSize("9:16");
    const f = computeFit(w, h, 767, 640, "fill");
    expect(Math.abs(f.scaleX - f.scaleY)).toBeGreaterThan(0.01);
  });
});

describe("object-fit invariants", () => {
  const sizes = [
    [1600, 900],
    [900, 1600],
    [1000, 1000],
  ];
  const containers = [
    [360, 640],
    [1280, 400],
    [500, 500],
  ];
  it("cover never leaves empty space", () => {
    for (const [iw, ih] of sizes)
      for (const [cw, ch] of containers)
        for (const p of [0, 0.25, 0.5, 1])
          expect(computeCropMetrics(iw, ih, cw, ch, "cover", p, p).emptySpacePercentage).toBeCloseTo(0, 6);
  });
  it("contain never crops", () => {
    for (const [iw, ih] of sizes)
      for (const [cw, ch] of containers)
        for (const p of [0, 0.3, 1])
          expect(computeCropMetrics(iw, ih, cw, ch, "contain", p, 1 - p).imageCroppedPercentage).toBeCloseTo(0, 6);
  });
  it("object position redistributes crop but keeps total", () => {
    const base = computeCropMetrics(1600, 900, 360, 640, "cover", 0.5, 0.5);
    for (const p of [0, 0.25, 0.75, 1]) {
      const m = computeCropMetrics(1600, 900, 360, 640, "cover", p, 0.5);
      expect(m.imageCroppedPercentage).toBeCloseTo(base.imageCroppedPercentage, 8);
      expect(m.crop.left + m.crop.right).toBeCloseTo(base.crop.left + base.crop.right, 8);
    }
    const left = computeCropMetrics(1600, 900, 360, 640, "cover", 0, 0.5);
    expect(left.crop.left).toBe(0);
  });
  it("scale-down never upscales", () => {
    expect(computeCropMetrics(200, 100, 800, 800, "scale-down").renderedWidth).toBe(200);
    expect(computeCropMetrics(2000, 1000, 800, 800, "scale-down").renderedWidth).toBe(800);
  });
  it("none uses intrinsic size and crops when larger", () => {
    const m = computeCropMetrics(1000, 1000, 500, 500, "none");
    expect(m.imageCroppedPercentage).toBeCloseTo(75, 6);
    expect(m.sourceCrop.left).toBeCloseTo(250, 6);
  });
  it("source crop converts via scale", () => {
    const m = computeCropMetrics(1080, 1920, 767, 640, "cover");
    expect(m.sourceCrop.top * m.scaleY).toBeCloseTo(m.crop.top, 8);
    expect(m.visibleSourceRect.width).toBeCloseTo(1080, 6);
  });
  it("rejects invalid dimensions", () => {
    expect(() => computeFit(0, 10, 10, 10, "cover")).toThrow(RangeError);
    expect(() => computeFit(10, NaN, 10, 10, "cover")).toThrow(RangeError);
    expect(() => computeFit(10, 10, Infinity, 10, "cover")).toThrow(RangeError);
  });
});

describe("container resolution", () => {
  const vp = (width: number, height = 844) => ({ width, height, browserChrome: 0 });
  const base = () => createDefaultConfig().container;

  it("fixed height is constant across widths", () => {
    const c = base();
    for (const w of [360, 767, 1535]) expect(resolveContainer(c, vp(w), 1).resolved).toEqual({ width: w, height: 640 });
  });
  it("aspect ratio height scales with width", () => {
    const c = { ...base(), heightMode: "aspect" as const, aspectRatio: "16:9" };
    expect(resolveContainer(c, vp(1600), 1).resolved.height).toBeCloseTo(900, 8);
    expect(resolveContainer(c, vp(800), 1).resolved.height).toBeCloseTo(450, 8);
  });
  it("auto height preserves image ratio", () => {
    const c = { ...base(), heightMode: "auto" as const };
    expect(resolveContainer(c, vp(900), 9 / 16).resolved.height).toBeCloseTo(1600, 8);
  });
  it("viewport units use the simulated viewport", () => {
    const c = { ...base(), heightMode: "viewport" as const, viewportHeightValue: 50, viewportUnit: "svh" as const };
    const viewport = { width: 390, height: 844, browserChrome: 100 };
    expect(resolveContainer(c, viewport, 1).resolved.height).toBe(372);
    expect(resolveContainer({ ...c, viewportUnit: "lvh" }, viewport, 1).resolved.height).toBe(422);
  });
  it("fluid height clamps", () => {
    const c = { ...base(), heightMode: "fluid" as const, fluidMin: 320, fluidPreferredVw: 50, fluidMax: 640 };
    expect(resolveContainer(c, vp(400), 1).resolved.height).toBe(320);
    expect(resolveContainer(c, vp(1000), 1).resolved.height).toBe(500);
    expect(resolveContainer(c, vp(2000), 1).resolved.height).toBe(640);
  });
  it("width modes and gutters", () => {
    expect(resolveContainer({ ...base(), horizontalGutter: 16 }, vp(390), 1).resolved.width).toBe(358);
    expect(resolveContainer({ ...base(), widthMode: "percent", widthPercent: 50 }, vp(1000), 1).resolved.width).toBe(500);
    expect(resolveContainer({ ...base(), widthMode: "max", maxWidth: 1200 }, vp(1920), 1).resolved.width).toBe(1200);
    expect(resolveContainer({ ...base(), widthMode: "max", maxWidth: 1200 }, vp(800), 1).resolved.width).toBe(800);
    expect(gridSpanWidth(1200, 12, 3, 24)).toBeCloseTo(282, 8);
  });
  it("constraints report requested and resolved separately", () => {
    const c = { ...base(), maxHeight: 500, minWidth: 400 };
    const r = resolveContainer(c, vp(360), 1);
    expect(r.requested).toEqual({ width: 360, height: 640 });
    expect(r.resolved).toEqual({ width: 400, height: 500 });
  });
});

describe("effective source", () => {
  it("crop strategy crops the original, reported separately", () => {
    const e = computeEffectiveSource(2400, 1600, 9 / 16, "crop");
    expect(e.height).toBe(1600);
    expect(e.width).toBeCloseTo(900, 8);
    expect(e.sourceRect.x).toBeCloseTo(750, 8);
    expect(e.sourceCroppedPercentage).toBeCloseTo(62.5, 8);
    expect(e.distorted).toBe(false);
  });
  it("crop position chooses which part of the original becomes the asset", () => {
    // 1920×1072 → 1:1 leaves 848px of horizontal slack.
    const left = computeEffectiveSource(1920, 1072, 1, "crop", { x: 0, y: 0.5 });
    const right = computeEffectiveSource(1920, 1072, 1, "crop", { x: 1, y: 0.5 });
    const mid = computeEffectiveSource(1920, 1072, 1, "crop", { x: 0.25, y: 0.5 });
    expect(left.sourceRect).toEqual({ x: 0, y: 0, width: 1072, height: 1072 });
    expect(right.sourceRect.x).toBeCloseTo(848, 8);
    expect(mid.sourceRect.x).toBeCloseTo(212, 8);
    // Position doesn't change size or the amount removed.
    expect(right.sourceCroppedPercentage).toBeCloseTo(left.sourceCroppedPercentage, 10);
    // Out-of-range positions clamp inside the image.
    expect(computeEffectiveSource(1920, 1072, 1, "crop", { x: 2, y: -1 }).sourceRect.x).toBeCloseTo(848, 8);
  });
  it("aligns the crop box to a focal point, clamped to the image", () => {
    expect(cropPositionForFocalPoint({ x: 0.5, y: 0.5 }, 1920, 1072, 1)).toEqual({ x: 0.5, y: 0.5 });
    const p = cropPositionForFocalPoint({ x: 0.3, y: 0.5 }, 1920, 1072, 1);
    // Box center (x + 536) lands on the focal point at 576px.
    expect(p.x * 848 + 536).toBeCloseTo(576, 8);
    expect(cropPositionForFocalPoint({ x: 0.02, y: 0.5 }, 1920, 1072, 1).x).toBe(0);
  });
  it("simulate applies the configured crop position", () => {
    const cfg = createDefaultConfig();
    cfg.image.aspectRatio = "1:1";
    cfg.image.sourceCropX = 0;
    const s = simulate(cfg, { width: 1920, height: 1072 });
    expect(s.effective.sourceRect.x).toBe(0);
    expect(s.effective.width).toBeCloseTo(1072, 8);
  });
  it("distort keeps the full frame and flags distortion", () => {
    const e = computeEffectiveSource(2400, 1600, 9 / 16, "distort");
    expect(e.width / e.height).toBeCloseTo(9 / 16, 8);
    expect(e.distorted).toBe(true);
    expect(e.sourceCroppedPercentage).toBe(0);
  });
  it("simulate reports source crop and component crop independently", () => {
    const cfg = createDefaultConfig();
    const s = simulate({ ...cfg, viewport: { ...cfg.viewport, width: 430 } }, { width: 2400, height: 1600 });
    expect(s.effective.sourceCroppedPercentage).toBeCloseTo(62.5, 6);
    expect(s.metrics.imageCroppedPercentage).toBeCloseTo(16.28, 2);
  });
});

describe("focal point", () => {
  it("centers focal point when possible and clamps otherwise", () => {
    expect(positionForFocalPoint({ x: 0.5, y: 0.5 }, 1000, 640, 400, 640).x).toBeCloseTo(0.5, 8);
    expect(positionForFocalPoint({ x: 0.05, y: 0.5 }, 1000, 640, 400, 640).x).toBe(0);
  });
  it("keepFocalCentered drives object-position in simulate", () => {
    const cfg: SimulatorConfig = createDefaultConfig();
    cfg.image.aspectRatio = "native";
    cfg.image.focalPoint = { x: 0.7, y: 0.5 };
    cfg.image.keepFocalCentered = true;
    const s = simulate(cfg, { width: 2400, height: 1600 });
    const m = s.metrics;
    expect(m.offsetX + 0.7 * m.renderedWidth).toBeCloseTo(m.containerWidth / 2, 6);
    expect(s.focalVisible).toBe(true);
  });
});

describe("safe zone", () => {
  it("is the intersection of visible regions across the range", () => {
    const cfg = createDefaultConfig();
    cfg.image.aspectRatio = "native";
    const original = { width: 2400, height: 1600 };
    const z = computeSafeZone(cfg, original, 360, 1535);
    const narrow = simulate(cfg, original, { viewportWidth: 360 }).metrics.visibleSourceRect;
    const wide = simulate(cfg, original, { viewportWidth: 1535 }).metrics.visibleSourceRect;
    expect(z.rect!.width).toBeCloseTo(narrow.width, 6);
    expect(z.rect!.height).toBeCloseTo(wide.height, 6);
    expect(z.safePercentage).toBeGreaterThan(0);
  });
});
