"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";
import { useSimulatorStore } from "@/store/simulator-store";

export const ZOOM_PRESETS = [0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];
export const ZOOM_MIN = 0.05;
export const ZOOM_MAX = 4;

const clampZoom = (z: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));

/**
 * Workspace zoom. Manual zoom is constant until the user changes it; "fit" is
 * an explicit mode that tracks the workspace size and never activates silently.
 */
export function useCanvasZoom(
  scrollerRef: RefObject<HTMLElement | null>,
  content: { width: number; height: number },
  padding: number,
) {
  const zoom = useSimulatorStore((s) => s.config.workspace.zoom);
  const zoomMode = useSimulatorStore((s) => s.config.workspace.zoomMode);
  const patch = useSimulatorStore((s) => s.patch);
  const [box, setBox] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setBox({ width: e.contentRect.width, height: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [scrollerRef]);

  const fitZoom =
    box.width > 0 && content.width > 0
      ? clampZoom(Math.min((box.width - padding * 2) / content.width, (box.height - padding * 2) / content.height))
      : zoom;
  const effectiveZoom = zoomMode === "fit" ? fitZoom : zoom;

  const setZoom = useCallback(
    (z: number) => patch("workspace", { zoom: Math.round(clampZoom(z) * 1000) / 1000, zoomMode: "manual" }),
    [patch],
  );
  const setFit = useCallback(() => patch("workspace", { zoomMode: "fit" }), [patch]);
  const stepZoom = useCallback(
    (dir: 1 | -1) => {
      const current = effectiveZoom;
      const next =
        dir > 0
          ? (ZOOM_PRESETS.find((p) => p > current + 1e-3) ?? clampZoom(current * 1.25))
          : ([...ZOOM_PRESETS].reverse().find((p) => p < current - 1e-3) ?? clampZoom(current / 1.25));
      setZoom(next);
    },
    [effectiveZoom, setZoom],
  );

  // Ctrl/Cmd + wheel zoom (non-passive so the page doesn't zoom).
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const factor = Math.exp(-e.deltaY * 0.0025);
      setZoom(effectiveZoom * factor);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [scrollerRef, effectiveZoom, setZoom]);

  return { zoom: effectiveZoom, zoomMode, setZoom, setFit, stepZoom, box };
}

function isEditable(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return !!el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));
}

/** Space + drag panning for a scroll container. */
export function useSpacePan(scrollerRef: RefObject<HTMLElement | null>, enabled: boolean) {
  const [spaceDown, setSpaceDown] = useState(false);
  const [panning, setPanning] = useState(false);
  const active = spaceDown || enabled;

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "Space" && !isEditable(e.target) && !(e.target as HTMLElement)?.closest?.("button,[role=slider]")) {
        e.preventDefault();
        setSpaceDown(true);
      }
    };
    const up = (e: KeyboardEvent) => e.code === "Space" && setSpaceDown(false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", () => setSpaceDown(false));
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useEffect(() => {
    document.body.dataset.panning = active ? "true" : "false";
  }, [active]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || !active) return;
    let start: { x: number; y: number; l: number; t: number } | null = null;
    const onDown = (e: PointerEvent) => {
      start = { x: e.clientX, y: e.clientY, l: el.scrollLeft, t: el.scrollTop };
      el.setPointerCapture(e.pointerId);
      setPanning(true);
      e.preventDefault();
      e.stopPropagation();
    };
    const onMove = (e: PointerEvent) => {
      if (!start) return;
      el.scrollLeft = start.l - (e.clientX - start.x);
      el.scrollTop = start.t - (e.clientY - start.y);
    };
    const onUp = () => {
      start = null;
      setPanning(false);
    };
    el.addEventListener("pointerdown", onDown, { capture: true });
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown, { capture: true });
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
    };
  }, [scrollerRef, active]);

  return { panActive: active, panning };
}
