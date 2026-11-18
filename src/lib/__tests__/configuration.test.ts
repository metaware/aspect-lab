import { describe, expect, it } from "vitest";
import { createDefaultConfig } from "@/lib/configuration/defaults";
import { parseConfig } from "@/lib/configuration/schema";
import { buildShareUrl, deserializeConfig, serializeConfig } from "@/lib/configuration/serialization";
import { normalizeRatio, parseRatio, invertRatio } from "@/lib/assets/aspect-ratios";

describe("configuration", () => {
  it("defaults validate", () => {
    expect(parseConfig(createDefaultConfig()).errors).toEqual([]);
  });
  it("round-trips through the URL", () => {
    const cfg = createDefaultConfig();
    cfg.viewport.width = 430;
    cfg.image.aspectRatio = "4:5";
    cfg.image.focalPoint = { x: 0.25, y: 0.4 };
    cfg.image.sourceCropX = 0.15;
    cfg.image.sourceCropY = 1;
    cfg.container.heightMode = "fluid";
    cfg.container.minHeight = 200;
    cfg.rendering.objectFit = "contain";
    cfg.rendering.objectPositionX = 0.3;
    cfg.analysis.breakpoints = [
      { id: "bp-1", min: 360, max: 600 },
      { id: "bp-2", min: 601, max: 1200 },
    ];
    cfg.analysis.compareRatios = ["1:1", "2.35:1"];
    cfg.overlay.enabled = true;
    cfg.overlay.heading = "Hello, world & friends";
    const url = buildShareUrl(cfg, "https://aspectlab.dev/");
    const back = deserializeConfig(new URL(url).searchParams)!;
    expect(back.errors).toEqual([]);
    expect(back.config).toEqual(cfg);
  });
  it("produces readable URLs", () => {
    const p = serializeConfig({ ...createDefaultConfig(), viewport: { width: 430, height: 844, browserChrome: 0 } });
    expect(p.get("vw")).toBe("430");
    expect(p.get("mode")).toBe("fixed");
    expect(p.get("h")).toBe("640");
    expect(p.get("ar")).toBe("9:16");
    expect(p.get("x")).toBe("50");
  });
  it("never shares local upload URLs", () => {
    const cfg = createDefaultConfig();
    cfg.image.source = "upload";
    cfg.image.url = "blob:http://localhost/abc";
    expect(serializeConfig(cfg).has("url")).toBe(false);
  });
  it("repairs invalid sections instead of failing", () => {
    const { config, errors } = parseConfig({ version: 1, rendering: { objectFit: "stretch" }, viewport: { width: 500 } });
    expect(config.rendering.objectFit).toBe("cover");
    expect(config.viewport.width).toBe(500);
    expect(errors.length).toBe(1);
  });
});

describe("ratios", () => {
  it("parses and normalizes", () => {
    expect(parseRatio("2.35:1")!.value).toBeCloseTo(2.35);
    expect(parseRatio("9:19.5")!.value).toBeCloseTo(9 / 19.5);
    expect(parseRatio("0:1")).toBeNull();
    expect(normalizeRatio(1920, 1080)).toBe("16:9");
    expect(normalizeRatio(1408, 720)).toBe("88:45");
    expect(invertRatio("16:9")).toBe("9:16");
  });
});
