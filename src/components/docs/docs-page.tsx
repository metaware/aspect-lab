"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/layout/app-header";
import { CreditsFooter } from "@/components/layout/credits";
import { TOPICS, type Topic } from "./topics";
import { TopicView } from "./topic-view";

const GROUPS: Topic["group"][] = ["Configure", "Workspace", "Analyze", "Share"];

export function DocsPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border bg-panel px-4">
        <div className="flex items-center gap-3">
          <Logo />
          <div className="flex items-baseline gap-2">
            <span className="text-[15px] font-semibold tracking-tight">AspectLab</span>
            <span className="text-[13px] text-muted-foreground">/ Documentation</span>
          </div>
        </div>
        <Link
          href="/"
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-[13px] font-medium hover:bg-surface-hover"
        >
          <ArrowLeft className="size-3.5" aria-hidden /> Back to simulator
        </Link>
      </header>

      <div className="mx-auto grid w-full max-w-[1200px] flex-1 gap-10 px-4 py-10 md:grid-cols-[220px_minmax(0,1fr)] md:px-6">
        <nav aria-label="Documentation topics" className="md:sticky md:top-24 md:h-[calc(100dvh-8rem)] md:overflow-y-auto scrollbar-thin">
          {GROUPS.map((g) => (
            <div key={g} className="mb-5">
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-subtle-foreground">{g}</div>
              <ul className="space-y-0.5">
                {TOPICS.filter((t) => t.group === g).map((t) => (
                  <li key={t.id}>
                    <a
                      href={`#${t.id}`}
                      className="block rounded-md px-2 py-1 text-[13px] text-muted-foreground hover:bg-surface-hover hover:text-foreground"
                    >
                      {t.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <main className="min-w-0">
          <div className="mb-10 max-w-2xl">
            <h1 className="text-[28px] font-semibold tracking-tight">How AspectLab works</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
              AspectLab simulates how an image is sized, cropped and positioned inside a responsive component. Pipeline:
              source image → source asset (aspect ratio and crop area) → container (viewport, width and height) → object-fit and
              position → what users see. Every diagram below is drawn with the same geometry engine as the simulator.
            </p>
            <p className="mt-3 text-[13px] text-subtle-foreground">
              Tip: every section in the simulator has an ⓘ button that opens its topic from this guide.
            </p>
          </div>

          <div className="space-y-14">
            {GROUPS.map((g) => (
              <section key={g} aria-labelledby={`group-${g}`} className="space-y-12">
                <h2 id={`group-${g}`} className="border-b border-border pb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-subtle-foreground">
                  {g}
                </h2>
                {TOPICS.filter((t) => t.group === g).map((t) => (
                  <article key={t.id} id={t.id} className="scroll-mt-24 space-y-4">
                    <h2 className="text-[20px] font-semibold tracking-tight">
                      <a href={`#${t.id}`} className="hover:underline">
                        {t.title}
                      </a>
                    </h2>
                    <TopicView topic={t} headingLevel={2} />
                  </article>
                ))}
              </section>
            ))}
          </div>
        </main>
      </div>
      <CreditsFooter />
    </div>
  );
}
