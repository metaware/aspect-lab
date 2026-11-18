"use client";

import { useState } from "react";
import Link from "next/link";
import { Info, BookOpen } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/overlays";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { TOPIC_MAP, type TopicId } from "./topics";
import { TopicView } from "./topic-view";

/** ⓘ button that explains a section in a modal, with a link to the full guide. */
export function InfoButton({ topic, className }: { topic: TopicId; className?: string }) {
  const [open, setOpen] = useState(false);
  const t = TOPIC_MAP[topic];
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Tooltip content={`About ${t.title}`}>
        <DialogTrigger asChild>
          <button
            type="button"
            aria-label={`About ${t.title}`}
            data-testid={`info-${topic}`}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "inline-flex size-6 items-center justify-center rounded-md text-subtle-foreground transition-colors hover:bg-surface-hover hover:text-foreground",
              className,
            )}
          >
            <Info className="size-3.5" />
          </button>
        </DialogTrigger>
      </Tooltip>
      <DialogContent title={t.title} className="max-w-3xl">
        <TopicView topic={t} onNavigate={() => setOpen(false)} />
        <div className="mt-5 flex justify-end border-t border-border pt-4">
          <Link
            href={`/docs#${topic}`}
            onClick={() => setOpen(false)}
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-accent-text hover:underline"
          >
            <BookOpen className="size-3.5" aria-hidden /> Open in documentation
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
