"use client";

import { useMemo, useRef, useState } from "react";
import { Copy, Check, Download, Upload, AlertTriangle } from "lucide-react";
import { useSimulatorStore } from "@/store/simulator-store";
import { buildShareUrl } from "@/lib/configuration/serialization";
import { parseConfig } from "@/lib/configuration/schema";
import { Dialog, DialogContent } from "@/components/ui/overlays";
import { Button } from "@/components/ui/button";
import { downloadText } from "@/lib/utils";

export function ShareDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const config = useSimulatorStore((s) => s.config);
  const setConfig = useSimulatorStore((s) => s.setConfig);
  const toast = useSimulatorStore((s) => s.toast);
  const [copied, setCopied] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const link = useMemo(() => (open && typeof window !== "undefined" ? buildShareUrl(config, window.location.href) : ""), [open, config]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast("Couldn't access the clipboard. Copy the link manually.", "warning");
    }
  };

  const importJson = async (file: File | undefined) => {
    if (!file) return;
    try {
      const { config: next, errors } = parseConfig(JSON.parse(await file.text()));
      setConfig(next);
      toast(errors.length ? `Imported with fixes: ${errors[0]}` : "Configuration imported", errors.length ? "warning" : "success");
      onOpenChange(false);
    } catch {
      toast("That file isn't valid AspectLab JSON.", "error");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Share configuration" description="Anyone with the link sees the same simulator setup.">
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              readOnly
              value={link}
              aria-label="Share link"
              onFocus={(e) => e.currentTarget.select()}
              className="num h-8 min-w-0 flex-1 rounded-md border border-border bg-surface px-2.5 text-xs text-muted-foreground"
            />
            <Button variant="primary" onClick={copy}>
              {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          {config.image.source === "upload" && (
            <p className="flex gap-2 rounded-md bg-warning-soft px-3 py-2 text-[12px] leading-snug text-warning-text">
              <AlertTriangle className="mt-px size-3.5 shrink-0" aria-hidden />
              This configuration uses a local uploaded image. It is never embedded in the link — the recipient will need
              to upload their own copy.
            </p>
          )}
          <div className="grid grid-cols-2 gap-2 border-t border-border pt-4">
            <Button onClick={() => downloadText(JSON.stringify(config, null, 2), "aspectlab-config.json", "application/json")}>
              <Download /> Export JSON
            </Button>
            <Button onClick={() => fileInput.current?.click()}>
              <Upload /> Import JSON
            </Button>
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              aria-label="Import configuration JSON"
              onChange={(e) => {
                void importJson(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Configurations are versioned (v{config.version}) so links keep working as AspectLab evolves. Your latest setup
            is also saved in this browser.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
