"use client";

import { useState } from "react";
import { Download, FileImage, FileSpreadsheet, FileJson, FileCode2, Images, Crop, Loader2 } from "lucide-react";
import { useSimulatorStore } from "@/store/simulator-store";
import { useSourceImage } from "@/hooks/use-image-metadata";
import { simulate } from "@/lib/geometry/simulate";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/overlays";
import { Button } from "@/components/ui/button";
import { renderComparisonPng, renderComponentPng, renderCropOverlayPng, ExportBlockedError } from "@/lib/export/render-png";
import { seriesToCsv } from "@/lib/analytics/series";
import { recommendForBreakpoints } from "@/lib/optimization/aspect-ratio-optimizer";
import { planAssets } from "@/lib/optimization/asset-planner";
import { generateCode, CODE_FORMAT_LABELS } from "@/lib/codegen/generate-code";
import { downloadBlob, downloadText } from "@/lib/utils";
import type { CodeFormat } from "@/types/simulator";

export function ExportDialog() {
  const source = useSourceImage();
  const toast = useSimulatorStore((s) => s.toast);
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (key: string, fn: () => Promise<void> | void) => {
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      toast(e instanceof ExportBlockedError ? e.message : `Export failed: ${(e as Error).message}`, "error");
    } finally {
      setBusy(null);
    }
  };

  const pngGuard = () => {
    if (!source.src) throw new Error("No image loaded");
    if (!source.pixelsReadable) throw new ExportBlockedError();
    return source.src;
  };

  const cfg = () => useSimulatorStore.getState().config;
  const cors = () => cfg().image.source === "url";

  const items: Array<{ key: string; icon: React.ComponentType<{ className?: string }>; title: string; detail: string; action: () => Promise<void> | void; png?: boolean }> = [
    {
      key: "component",
      icon: FileImage,
      title: "Component preview",
      detail: "PNG at configured size × DPR",
      png: true,
      action: async () => {
        const c = cfg();
        const sim = simulate(c, source.original);
        const blob = await renderComponentPng(sim, pngGuard(), c.container.background, c.analysis.devicePixelRatio, cors());
        downloadBlob(blob, `aspectlab-component-${Math.round(sim.metrics.containerWidth)}x${Math.round(sim.metrics.containerHeight)}@${c.analysis.devicePixelRatio}x.png`);
      },
    },
    {
      key: "crop",
      icon: Crop,
      title: "Original with crop overlay",
      detail: "PNG at original resolution",
      png: true,
      action: async () => {
        const sim = simulate(cfg(), source.original);
        downloadBlob(await renderCropOverlayPng(sim, pngGuard(), cors()), "aspectlab-crop-overlay.png");
      },
    },
    {
      key: "comparison",
      icon: Images,
      title: "Comparison previews",
      detail: "PNG strip of comparison widths",
      png: true,
      action: async () => {
        const c = cfg();
        const items =
          c.analysis.comparisonMode === "ratios"
            ? c.analysis.comparisonRatios.map((r) => ({ sim: simulate(c, source.original, { aspectRatio: r }), label: `${r} @ ${c.viewport.width}px` }))
            : c.analysis.comparisonWidths.map((w) => ({ sim: simulate(c, source.original, { viewportWidth: w }), label: `${w}px` }));
        downloadBlob(await renderComparisonPng(items, pngGuard(), c.container.background, 0.5, cors()), "aspectlab-comparison.png");
      },
    },
    {
      key: "csv",
      icon: FileSpreadsheet,
      title: "Cropping analysis",
      detail: "CSV, every viewport px in range",
      action: () => {
        const c = cfg();
        const ratios = [...new Set([c.image.aspectRatio, ...c.analysis.compareRatios])];
        downloadText(seriesToCsv(c, source.original, ratios), "aspectlab-cropping.csv", "text/csv");
      },
    },
    {
      key: "json",
      icon: FileJson,
      title: "Responsive recommendations",
      detail: "JSON: breakpoints + asset plan",
      action: () => {
        const c = cfg();
        const recs = recommendForBreakpoints(c, source.original);
        const plan = planAssets(c, source.original);
        const payload = {
          generatedBy: "AspectLab",
          configVersion: c.version,
          devicePixelRatio: c.analysis.devicePixelRatio,
          strategy: c.analysis.strategy,
          breakpoints: recs.map((r) => ({
            range: [r.range.min, r.range.max],
            currentRatioCropping: { min: r.current.min, max: r.current.max, average: r.current.average },
            mathematicalOptimum: { ratio: r.optimal.ratio, worstCaseCrop: r.optimal.max, averageCrop: r.optimal.average, closedForm: r.closedForm },
            recommendedStandard: { ratio: r.standard.label, worstCaseCrop: r.standard.max, averageCrop: r.standard.average },
            suggestedAsset: r.assetSize,
          })),
          assetPlan: plan,
          note: "Mathematical recommendations minimize cropping; they cannot guarantee important subjects remain visible.",
        };
        downloadText(JSON.stringify(payload, null, 2), "aspectlab-recommendations.json", "application/json");
      },
    },
    {
      key: "code",
      icon: FileCode2,
      title: "Implementation code",
      detail: "All formats in one file",
      action: () => {
        const c = cfg();
        const sim = simulate(c, source.original);
        const plan = planAssets(c, source.original);
        const formats = Object.keys(CODE_FORMAT_LABELS) as CodeFormat[];
        const text = formats
          .map((f) => `/* ===== ${CODE_FORMAT_LABELS[f]} ===== */\n\n${generateCode(f, { config: c, sim, plan, imageSrc: "/images/hero.webp", alt: "Descriptive alternative text" })}`)
          .join("\n\n");
        downloadText(text, "aspectlab-implementation.txt");
      },
    },
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary" aria-label="Export">
          <Download /> <span className="hidden lg:inline">Export</span>
        </Button>
      </DialogTrigger>
      <DialogContent title="Export" description="Images export at the configured resolution, not the on-screen zoom.">
        <div className="grid gap-1.5">
          {items.map(({ key, icon: Icon, title, detail, action, png }) => (
            <button
              key={key}
              type="button"
              disabled={busy != null}
              onClick={() => run(key, action)}
              className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-left transition-colors hover:border-border-strong hover:bg-surface disabled:opacity-60"
            >
              <span className="flex size-8 items-center justify-center rounded-md bg-surface text-muted-foreground">
                {busy === key ? <Loader2 className="size-4 animate-spin" /> : <Icon className="size-4" />}
              </span>
              <span className="flex-1">
                <span className="block text-[13px] font-medium">{title}</span>
                <span className="block text-[11px] text-muted-foreground">
                  {detail}
                  {png && !source.pixelsReadable && source.src ? " · unavailable for this remote image (CORS)" : ""}
                </span>
              </span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
