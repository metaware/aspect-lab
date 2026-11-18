"use client";

import { useEffect } from "react";
import { useSimulatorStore } from "@/store/simulator-store";
import { parseConfig } from "@/lib/configuration/schema";
import { buildShareUrl, deserializeConfig } from "@/lib/configuration/serialization";
import { loadRemoteImage } from "./use-image-metadata";

const STORAGE_KEY = "aspectlab:config:v1";

function readStorage(): unknown {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Hydrates configuration from the URL (shared link) or localStorage, then
 * keeps both in sync. Serialization is debounced; the preview is not.
 */
export function useSharedConfiguration() {
  const hydrated = useSimulatorStore((s) => s.hydrated);

  useEffect(() => {
    const { setConfig, setHydrated, toast } = useSimulatorStore.getState();
    const fromUrl = deserializeConfig(new URLSearchParams(window.location.search));
    if (fromUrl) {
      setConfig(fromUrl.config);
      if (fromUrl.errors.length) toast(fromUrl.errors[0], "warning");
      if (fromUrl.config.image.source === "upload")
        toast("This link uses a local image. Upload your own copy to reproduce it.", "warning");
    } else {
      const stored = readStorage();
      if (stored) setConfig(parseConfig(stored).config);
    }
    setHydrated();
  }, []);

  // Persist + URL sync.
  useEffect(() => {
    if (!hydrated) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsub = useSimulatorStore.subscribe((state, prev) => {
      if (state.config === prev.config) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(state.config));
        } catch {}
        const next = buildShareUrl(state.config, window.location.href);
        window.history.replaceState(null, "", next);
      }, 350);
    });
    return () => {
      clearTimeout(timer);
      unsub();
    };
  }, [hydrated]);

  // Load remote images whenever the URL source changes.
  const source = useSimulatorStore((s) => s.config.image.source);
  const url = useSimulatorStore((s) => s.config.image.url);
  useEffect(() => {
    if (source !== "url" || !url) return;
    const { remote, setRemote } = useSimulatorStore.getState();
    if (remote?.url === url && remote.status !== "error") return;
    let valid = false;
    try {
      valid = new URL(url).protocol === "https:";
    } catch {}
    if (!valid) {
      setRemote({ url, status: "error", meta: null, corsSafe: false, error: "Enter a valid HTTPS image URL." });
      return;
    }
    let cancelled = false;
    setRemote({ url, status: "loading", meta: null, corsSafe: false });
    loadRemoteImage(url)
      .then(({ meta, corsSafe }) => !cancelled && setRemote({ url, status: "ready", meta, corsSafe }))
      .catch(
        () =>
          !cancelled &&
          setRemote({ url, status: "error", meta: null, corsSafe: false, error: "The image could not be loaded. Check the URL." }),
      );
    return () => {
      cancelled = true;
    };
  }, [source, url]);
}

export function copyShareLink(): Promise<string> {
  const { config } = useSimulatorStore.getState();
  const link = buildShareUrl(config, window.location.href);
  return navigator.clipboard.writeText(link).then(() => link);
}
