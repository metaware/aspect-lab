"use client";

import { useMemo } from "react";
import { useSimulatorStore } from "@/store/simulator-store";
import { simulate, type SimulationOverrides } from "@/lib/geometry/simulate";
import { useSourceImage } from "./use-image-metadata";
import { useEffectiveAsset } from "./use-effective-asset";

/** Source image + simulation + renderable asset for one preview. */
export function usePreviewModel(overrides: SimulationOverrides = {}) {
  const config = useSimulatorStore((s) => s.config);
  const source = useSourceImage();
  const { viewportWidth, aspectRatio } = overrides;
  const sim = useMemo(
    () => simulate(config, source.original, { viewportWidth, aspectRatio }),
    [config, source.original, viewportWidth, aspectRatio],
  );
  const asset = useEffectiveAsset(
    source.src,
    sim.original,
    sim.effective,
    source.pixelsReadable,
    config.image.source === "url",
  );
  return { config, source, sim, asset };
}

export type PreviewModel = ReturnType<typeof usePreviewModel>;
