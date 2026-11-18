import { describe, expect, it } from "vitest";
import { createDefaultConfig } from "@/lib/configuration/defaults";
import {
  assetResolution,
  closedFormOptimalRatio,
  evaluateRatio,
  recommendForBreakpoints,
  sampleWidths,
  searchOptimalRatio,
} from "@/lib/optimization/aspect-ratio-optimizer";
import { planAssets } from "@/lib/optimization/asset-planner";

const original = { width: 2400, height: 1600 };

describe("aspect ratio optimizer", () => {
  it("closed form matches the spec example (≈0.821:1)", () => {
    expect(closedFormOptimalRatio(createDefaultConfig(), 360, 767)).toBeCloseTo(0.821, 3);
  });
  it("numeric search agrees with the closed form", () => {
    const cfg = createDefaultConfig();
    const widths = sampleWidths({ min: 360, max: 767 });
    const r = searchOptimalRatio(cfg, original, widths, "worst-case", 390);
    expect(r.ratio).toBeCloseTo(0.821, 2);
    const e = evaluateRatio(cfg, original, 0.8211, widths, 390);
    expect(e.max).toBeLessThan(evaluateRatio(cfg, original, 9 / 16, widths, 390).max);
  });
  it("closed form is not used for non-fixed heights", () => {
    const cfg = createDefaultConfig();
    cfg.container.heightMode = "aspect";
    expect(closedFormOptimalRatio(cfg, 360, 767)).toBeNull();
  });
  it("recommends a standard ratio per breakpoint", () => {
    const recs = recommendForBreakpoints(createDefaultConfig(), original);
    expect(recs).toHaveLength(4);
    expect(recs[0].closedForm).toBe(true);
    // 5:6 → worst 32.5% (at 360px) beats 4:5 → worst 33.25% (at 767px).
    expect(recs[0].standard.label).toBe("5:6");
    expect(recs[0].standard.max).toBeLessThanOrEqual(recs[0].current.max);
  });
  it("asset resolution covers max rendered size × DPR", () => {
    const s = assetResolution({ width: 767, height: 958.75 }, 0.8, 2);
    expect(s.width).toBeGreaterThanOrEqual(1534);
    expect(s.height).toBeGreaterThanOrEqual(1917.5);
    expect(s.width / s.height).toBeCloseTo(0.8, 2);
  });
});

describe("asset planner", () => {
  it("uses more assets for tighter tolerances", () => {
    const cfg = createDefaultConfig();
    cfg.analysis.maxCropTolerance = 50;
    const loose = planAssets(cfg, original);
    cfg.analysis.maxCropTolerance = 15;
    cfg.analysis.maxVariants = 6;
    const tight = planAssets(cfg, original);
    expect(tight.assets.length).toBeGreaterThanOrEqual(loose.assets.length);
    expect(loose.toleranceMet).toBe(true);
  });
  it("warns when tolerance cannot be met", () => {
    const cfg = createDefaultConfig();
    cfg.analysis.maxCropTolerance = 1;
    cfg.analysis.maxVariants = 1;
    const plan = planAssets(cfg, original);
    expect(plan.toleranceMet).toBe(false);
    expect(plan.warnings[0]).toMatch(/cannot be achieved/);
  });
  it("covers the full range contiguously", () => {
    const plan = planAssets(createDefaultConfig(), original);
    expect(plan.assets[0].min).toBe(360);
    expect(plan.assets[plan.assets.length - 1].max).toBe(1535);
    for (let i = 1; i < plan.assets.length; i++) expect(plan.assets[i].min).toBe(plan.assets[i - 1].max + 1);
  });
});
