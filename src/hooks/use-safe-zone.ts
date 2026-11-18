"use client";

import { useMemo } from "react";
import { computeSafeZone } from "@/lib/geometry/safe-zone";
import { useSourceImage } from "./use-image-metadata";
import { useAnalyticsConfig } from "./use-simulator";

/** Safe zone across the configured analysis range (debounced). */
export function useSafeZone(enabled = true) {
  const config = useAnalyticsConfig();
  const { original } = useSourceImage();
  return useMemo(
    () =>
      enabled ? computeSafeZone(config, original, config.analysis.minViewport, config.analysis.maxViewport) : null,
    [enabled, config, original],
  );
}
