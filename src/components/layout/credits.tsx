import { MapPin } from "lucide-react";

const CREDITS = [
  {
    name: "Jasdeep Singh",
    role: "UI Architect",
    location: "Based in Toronto, Canada",
  },
];

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** Site footer: credits plus the privacy note. */
export function CreditsFooter() {
  return (
    <footer className="border-t border-border bg-panel" aria-labelledby="credits-heading">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-6 px-4 py-8 md:flex-row md:items-end md:justify-between md:px-6">
        <section>
          <h2 id="credits-heading" className="text-[11px] font-semibold uppercase tracking-[0.08em] text-subtle-foreground">
            Credits
          </h2>
          <ul className="mt-3 flex flex-wrap gap-6">
            {CREDITS.map((c) => (
              <li key={c.name} className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="flex size-10 items-center justify-center rounded-full bg-accent-soft text-[13px] font-semibold text-accent-text"
                >
                  {initials(c.name)}
                </span>
                <div>
                  <p className="text-[14px] font-medium text-foreground">{c.name}</p>
                  <p className="text-[12px] text-muted-foreground">{c.role}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-[12px] text-subtle-foreground">
                    <MapPin className="size-3" aria-hidden />
                    {c.location}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
        <p className="max-w-sm text-[11px] leading-relaxed text-muted-foreground md:text-right">
          AspectLab runs entirely in your browser. Uploaded images are never sent to a server.
        </p>
      </div>
    </footer>
  );
}
