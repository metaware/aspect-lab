/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState } from "react";
import { Upload, Link2, Grid2x2, Images, Loader2, AlertCircle, Check } from "lucide-react";
import { useSimulatorStore } from "@/store/simulator-store";
import { SAMPLE_IMAGES } from "@/lib/assets/sample-images";
import { useSourceImage, readLocalImage, ACCEPTED_TYPES } from "@/hooks/use-image-metadata";
import { Segmented, TextInput } from "@/components/ui/controls";
import { Button } from "@/components/ui/button";
import { cn, fmtBytes } from "@/lib/utils";
import type { ImageSourceKind } from "@/types/simulator";

export function ImageSourcePicker() {
  const image = useSimulatorStore((s) => s.config.image);
  const patch = useSimulatorStore((s) => s.patch);
  const source = useSourceImage();

  return (
    <div className="space-y-3">
      <SourcePreviewTile />
      <Segmented<ImageSourceKind>
        label="Image source"
        size="sm"
        value={image.source}
        onChange={(src) => patch("image", { source: src, focalPoint: null, keepFocalCentered: false })}
        options={[
          { value: "sample", label: <Images className="size-3.5" />, ariaLabel: "Sample library", tooltip: "Sample library" },
          { value: "upload", label: <Upload className="size-3.5" />, ariaLabel: "Upload image", tooltip: "Upload (stays in your browser)" },
          { value: "url", label: <Link2 className="size-3.5" />, ariaLabel: "Remote URL", tooltip: "Remote HTTPS URL" },
          { value: "test", label: <Grid2x2 className="size-3.5" />, ariaLabel: "Technical test image", tooltip: "Technical test image" },
        ]}
      />
      {image.source === "sample" && <SampleGrid />}
      {image.source === "upload" && <UploadZone />}
      {image.source === "url" && <RemoteUrlInput />}
      {image.source === "test" && (
        <p className="text-xs leading-relaxed text-muted-foreground">
          Generated natively at the selected aspect ratio with a numbered grid, centerlines, edge labels and safe-zone
          rings—ideal for verifying exact crops.
        </p>
      )}
      {source.status === "ready" && (
        <dl className="num grid grid-cols-3 gap-2 text-[11px]">
          <Meta label="Size" value={`${source.meta.width}×${source.meta.height}`} />
          <Meta label="Format" value={source.meta.format ?? "—"} />
          <Meta label="File" value={fmtBytes(source.meta.fileSize)} />
        </dl>
      )}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md bg-surface px-2 py-1.5">
      <dt className="text-[10px] uppercase tracking-wide text-subtle-foreground">{label}</dt>
      <dd className="truncate text-foreground">{value}</dd>
    </div>
  );
}

function SourcePreviewTile() {
  const source = useSourceImage();
  return (
    <div className="checkerboard relative flex aspect-[16/9] items-center justify-center overflow-hidden rounded-lg border border-border">
      {source.src ? (
        <img src={source.src} alt="" className="size-full object-contain" />
      ) : (
        <span className="text-xs text-subtle-foreground">
          {source.status === "loading" ? "Loading…" : source.status === "error" ? "Image unavailable" : "No image yet"}
        </span>
      )}
      <span className="absolute bottom-1.5 left-1.5 max-w-[85%] truncate rounded bg-black/55 px-1.5 py-0.5 text-[11px] text-white backdrop-blur">
        {source.label}
      </span>
    </div>
  );
}

function SampleGrid() {
  const sampleId = useSimulatorStore((s) => s.config.image.sampleId);
  const patch = useSimulatorStore((s) => s.patch);
  return (
    <div role="radiogroup" aria-label="Sample images" className="grid grid-cols-5 gap-1.5">
      {SAMPLE_IMAGES.map((s) => {
        const active = s.id === sampleId;
        return (
          <button
            key={s.id}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`${s.name}: ${s.purpose}`}
            title={`${s.name} — ${s.purpose}`}
            onClick={() => patch("image", { sampleId: s.id, focalPoint: null, keepFocalCentered: false })}
            className={cn(
              "relative aspect-square overflow-hidden rounded-md border transition-colors",
              active ? "border-accent ring-2 ring-accent/40" : "border-border hover:border-border-strong",
            )}
          >
            {s.generated ? (
              <span className="flex size-full items-center justify-center bg-surface text-muted-foreground">
                <Grid2x2 className="size-4" aria-hidden />
              </span>
            ) : (
              <img src={s.thumb} alt="" loading="lazy" className="size-full object-cover" />
            )}
            {active && (
              <span className="absolute right-0.5 top-0.5 rounded-full bg-accent p-0.5 text-accent-foreground">
                <Check className="size-2.5" aria-hidden />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function UploadZone() {
  const upload = useSimulatorStore((s) => s.upload);
  const setUpload = useSimulatorStore((s) => s.setUpload);
  const patch = useSimulatorStore((s) => s.patch);
  const toast = useSimulatorStore((s) => s.toast);
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);

  const accept = async (file: File | undefined | null) => {
    if (!file) return;
    setBusy(true);
    try {
      const img = await readLocalImage(file);
      setUpload(img);
      patch("image", { source: "upload", focalPoint: null, keepFocalCentered: false });
      toast(`Loaded ${file.name} locally — it never leaves your browser`, "success");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  // Clipboard paste anywhere on the page.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const item = [...(e.clipboardData?.items ?? [])].find((i) => i.type.startsWith("image/"));
      if (item) {
        e.preventDefault();
        void accept(item.getAsFile());
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          void accept(e.dataTransfer.files[0]);
        }}
        className={cn(
          "flex w-full flex-col items-center gap-1.5 rounded-lg border border-dashed px-3 py-5 text-center transition-colors",
          over ? "border-accent bg-accent-soft" : "border-border-strong hover:border-accent hover:bg-surface",
        )}
      >
        {busy ? <Loader2 className="size-5 animate-spin text-muted-foreground" /> : <Upload className="size-5 text-muted-foreground" />}
        <span className="text-[13px] font-medium">Drop, paste or browse</span>
        <span className="text-[11px] text-muted-foreground">JPEG, PNG, WebP, AVIF or GIF (first frame)</span>
      </button>
      <input
        ref={input}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        className="sr-only"
        aria-label="Choose image file"
        onChange={(e) => {
          void accept(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {!upload && (
        <p className="flex gap-1.5 text-[11px] leading-relaxed text-warning-text">
          <AlertCircle className="mt-0.5 size-3 shrink-0" aria-hidden />
          Uploaded images are never embedded in share links. Recipients need to supply the image separately.
        </p>
      )}
    </div>
  );
}

function RemoteUrlInput() {
  const url = useSimulatorStore((s) => s.config.image.url);
  const remote = useSimulatorStore((s) => s.remote);
  const patch = useSimulatorStore((s) => s.patch);
  const [draft, setDraft] = useState(url);
  const [invalid, setInvalid] = useState<string | null>(null);

  const submit = () => {
    const value = draft.trim();
    try {
      const u = new URL(value);
      if (u.protocol !== "https:") throw new Error();
      setInvalid(null);
      patch("image", { url: value, focalPoint: null, keepFocalCentered: false });
    } catch {
      setInvalid("Enter a valid HTTPS URL (https://…).");
    }
  };

  const status = remote?.url === url ? remote : null;
  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="flex gap-1.5">
        <TextInput
          type="url"
          inputMode="url"
          placeholder="https://example.com/photo.jpg"
          aria-label="Image URL"
          aria-invalid={!!invalid}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <Button type="submit" size="md" variant="secondary">
          Load
        </Button>
      </div>
      {invalid && <p className="text-[11px] text-danger-text">{invalid}</p>}
      {status?.status === "loading" && (
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Loader2 className="size-3 animate-spin" /> Loading image…
        </p>
      )}
      {status?.status === "error" && <p className="text-[11px] text-danger-text">{status.error}</p>}
      {status?.status === "ready" && !status.corsSafe && (
        <p className="text-[11px] leading-relaxed text-warning-text">
          This server blocks pixel access (CORS). Previews still work; PNG exports and generated crop assets are
          unavailable for this image.
        </p>
      )}
    </form>
  );
}
