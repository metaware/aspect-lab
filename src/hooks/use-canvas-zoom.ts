"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
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
  /** Anything else that changes the canvas layout (e.g. the view mode). */
  layoutKey = "",
  /** The scaled component stage, used as the zoom anchor. */
  stageRef?: RefObject<HTMLElement | null>,
  /** Space reserved at the bottom of the canvas (floating toolbar). */
  bottomInset = 0,
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

  const zoomRef = useRef(effectiveZoom);
  zoomRef.current = effectiveZoom;

  // Point (in scroller viewport px) that should stay put across the next resize.
  // Null means "keep the view centered".
  const anchorRef = useRef<{ x: number; y: number } | null>(null);
  // Last known stage box, relative to the scroller viewport.
  const lastStageRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);

  const measureStage = useCallback(() => {
    const el = scrollerRef.current;
    const stage = stageRef?.current;
    if (!el || !stage) return null;
    const s = el.getBoundingClientRect();
    const r = stage.getBoundingClientRect();
    return { x: r.left - s.left, y: r.top - s.top, w: r.width, h: r.height };
  }, [scrollerRef, stageRef]);

  // Ctrl/Cmd + wheel (and trackpad pinch) zoom around the pointer.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) {
        // Plain scroll pans the canvas when it can scroll on that axis, and
        // never chains to the page mid-gesture. A canvas that fits lets the
        // page scroll normally.
        const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? el.clientHeight : 1;
        const dx = (e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX) * unit;
        const dy = (e.shiftKey && !e.deltaX ? 0 : e.deltaY) * unit;
        const canX = el.scrollWidth - el.clientWidth > 1;
        const canY = el.scrollHeight - el.clientHeight > 1;
        if (Math.abs(dy) >= Math.abs(dx) ? !canY : !canX) return;
        e.preventDefault();
        el.scrollLeft += dx;
        el.scrollTop += dy;
        return;
      }
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      anchorRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      setZoom(zoomRef.current * Math.exp(-e.deltaY * 0.0025));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [scrollerRef, setZoom]);

  // Track where the stage sits as the user scrolls.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const record = () => {
      lastStageRef.current = measureStage();
    };
    el.addEventListener("scroll", record, { passive: true });
    return () => el.removeEventListener("scroll", record);
  }, [scrollerRef, measureStage]);

  /**
   * Keeps the same fraction of the stage under the anchor (the pointer for
   * wheel/pinch zoom, otherwise the viewport center) whenever zoom or layout
   * changes, so the component never drifts out of view. First layout centers.
   */
  const contentKey = `${effectiveZoom}|${content.width}|${content.height}|${box.width}|${box.height}|${layoutKey}`;
  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const last = lastStageRef.current;
    const now = measureStage();
    const pointer = anchorRef.current;
    anchorRef.current = null;
    // Center of the visible canvas, above the floating toolbar.
    const ax = pointer?.x ?? el.clientWidth / 2;
    const ay = pointer?.y ?? (el.clientHeight - bottomInset) / 2;
    if (last && now && last.w > 0 && last.h > 0) {
      // A component that was fully in view stays centered; otherwise keep
      // whatever part of it sat under the anchor.
      const wasInView =
        !pointer && last.x >= 0 && last.y >= 0 && last.x + last.w <= el.clientWidth && last.y + last.h <= el.clientHeight;
      const fx = wasInView ? 0.5 : (ax - last.x) / last.w;
      const fy = wasInView ? 0.5 : (ay - last.y) / last.h;
      el.scrollLeft += now.x - (ax - fx * now.w);
      el.scrollTop += now.y - (ay - fy * now.h);
    } else {
      el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
      el.scrollTop = (el.scrollHeight - el.clientHeight) / 2;
    }
    lastStageRef.current = measureStage();
  }, [scrollerRef, contentKey, measureStage, bottomInset]);

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
