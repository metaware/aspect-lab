"use client";

import { useEffect, useMemo, useState } from "react";
import type { SimulatorConfig } from "@/types/simulator";
import { useSimulatorStore } from "@/store/simulator-store";
import { simulate, type Simulation, type SimulationOverrides } from "@/lib/geometry/simulate";
import { useSourceImage } from "./use-image-metadata";

/** Primary preview simulation — never debounced. */
export function useSimulation(overrides?: SimulationOverrides): Simulation {
  const config = useSimulatorStore((s) => s.config);
  const { original } = useSourceImage();
  const vw = overrides?.viewportWidth;
  const ar = overrides?.aspectRatio;
  return useMemo(() => simulate(config, original, { viewportWidth: vw, aspectRatio: ar }), [config, original, vw, ar]);
}

export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/** Config snapshot for expensive analytics, debounced so sliders stay smooth. */
export function useAnalyticsConfig(delay = 160): SimulatorConfig {
  const config = useSimulatorStore((s) => s.config);
  return useDebouncedValue(config, delay);
}
