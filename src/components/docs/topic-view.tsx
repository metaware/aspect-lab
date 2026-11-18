"use client";

import Link from "next/link";
import { Lightbulb } from "lucide-react";
import { Figure, FigureGrid } from "./illustrations";
import { TOPIC_MAP, type Topic } from "./topics";

/** Renders one documentation topic. Shared by the info modal and the docs page. */
export function TopicView({ topic, headingLevel = 3, onNavigate }: { topic: Topic; headingLevel?: 2 | 3; onNavigate?: () => void }) {
  const H = headingLevel === 2 ? "h3" : "h4";
  return (
    <div className="space-y-5 text-[13.5px] leading-relaxed text-foreground">
      <p className="text-muted-foreground">{topic.summary}</p>

      {topic.figure && <Figure caption={topic.figureCaption}>{topic.figure}</Figure>}

      {topic.options && (
        <section className="space-y-3">
          <H className="text-[11px] font-semibold uppercase tracking-[0.08em] text-subtle-foreground">Options</H>
          {topic.options.some((o) => o.figure) ? (
            <FigureGrid columns={topic.optionColumns ?? 3}>
              {topic.options.map((o) => (
                <Figure
                  key={o.name}
                  caption={
                    <>
                      <span className="block font-medium text-foreground">{o.name}</span>
                      {o.description}
                    </>
                  }
                >
                  {o.figure}
                </Figure>
              ))}
            </FigureGrid>
          ) : (
            <dl className="divide-y divide-border rounded-lg border border-border">
              {topic.options.map((o) => (
                <div key={o.name} className="grid gap-1 px-3 py-2.5 sm:grid-cols-[160px_1fr]">
                  <dt className="font-medium">{o.name}</dt>
                  <dd className="text-muted-foreground">{o.description}</dd>
                </div>
              ))}
            </dl>
          )}
        </section>
      )}

      {topic.details && <div className="text-muted-foreground [&_b]:font-medium [&_b]:text-foreground">{topic.details}</div>}

      {topic.tips.length > 0 && (
        <section className="rounded-lg border border-border bg-surface p-3.5">
          <H className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-accent-text">
            <Lightbulb className="size-3.5" aria-hidden /> Usage ideas
          </H>
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
            {topic.tips.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </section>
      )}

      {topic.related && topic.related.length > 0 && (
        <p className="text-[12px] text-muted-foreground">
          Related:{" "}
          {topic.related.map((id, i) => (
            <span key={id}>
              {i > 0 && " · "}
              <Link href={`/docs#${id}`} onClick={onNavigate} className="text-accent-text underline-offset-2 hover:underline">
                {TOPIC_MAP[id].title}
              </Link>
            </span>
          ))}
        </p>
      )}
    </div>
  );
}
