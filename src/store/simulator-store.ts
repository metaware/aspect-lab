"use client";

import { create } from "zustand";
import type { ImageMetadata, SimulatorConfig } from "@/types/simulator";
import { createDefaultConfig } from "@/lib/configuration/defaults";

export interface LocalImage {
  src: string;
  meta: ImageMetadata;
}

export interface RemoteImage {
  url: string;
  status: "loading" | "ready" | "error";
  meta: ImageMetadata | null;
  /** True when loaded with CORS so pixels can be read for exports/cropping. */
  corsSafe: boolean;
  error?: string;
}

export interface Toast {
  id: number;
  message: string;
  tone: "default" | "success" | "warning" | "error";
}

interface SimulatorState {
  /** User-defined, serializable configuration — the single source of truth. */
  config: SimulatorConfig;
  hydrated: boolean;
  /** Runtime-only image state (never serialized). */
  upload: LocalImage | null;
  remote: RemoteImage | null;
  /** Measured file sizes for built-in samples, keyed by src. */
  sampleBytes: Record<string, number>;
  focalPicking: boolean;
  toasts: Toast[];

  setConfig: (config: SimulatorConfig) => void;
  patch: <K extends Exclude<keyof SimulatorConfig, "version">>(
    section: K,
    partial: Partial<SimulatorConfig[K]>,
  ) => void;
  reset: () => void;
  setHydrated: () => void;
  setUpload: (upload: LocalImage | null) => void;
  setRemote: (remote: RemoteImage | null) => void;
  setSampleBytes: (src: string, bytes: number) => void;
  setFocalPicking: (on: boolean) => void;
  toast: (message: string, tone?: Toast["tone"]) => void;
  dismissToast: (id: number) => void;
}

let toastId = 0;

export const useSimulatorStore = create<SimulatorState>()((set, get) => ({
  config: createDefaultConfig(),
  hydrated: false,
  upload: null,
  remote: null,
  sampleBytes: {},
  focalPicking: false,
  toasts: [],

  setConfig: (config) => set({ config }),
  patch: (section, partial) =>
    set((s) => ({ config: { ...s.config, [section]: { ...s.config[section], ...partial } } })),
  reset: () => set({ config: createDefaultConfig(), focalPicking: false }),
  setHydrated: () => set({ hydrated: true }),
  setUpload: (upload) => {
    const prev = get().upload;
    // Object URLs are revoked as soon as they are replaced.
    if (prev && prev.src !== upload?.src) URL.revokeObjectURL(prev.src);
    set({ upload });
  },
  setRemote: (remote) => set({ remote }),
  setSampleBytes: (src, bytes) => set((s) => ({ sampleBytes: { ...s.sampleBytes, [src]: bytes } })),
  setFocalPicking: (focalPicking) => set({ focalPicking }),
  toast: (message, tone = "default") => {
    const id = ++toastId;
    set((s) => ({ toasts: [...s.toasts.slice(-3), { id, message, tone }] }));
    setTimeout(() => get().dismissToast(id), 3600);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Convenience selector hooks to avoid broad subscriptions. */
export const useConfig = () => useSimulatorStore((s) => s.config);
export const usePatch = () => useSimulatorStore((s) => s.patch);
export const useToast = () => useSimulatorStore((s) => s.toast);
