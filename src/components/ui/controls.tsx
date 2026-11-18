"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import * as ToggleGroup from "@radix-ui/react-toggle-group";
import { Minus, Plus, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip } from "./tooltip";

export function Label({
  children,
  htmlFor,
  hint,
  className,
  aside,
}: {
  children: React.ReactNode;
  htmlFor?: string;
  hint?: React.ReactNode;
  className?: string;
  aside?: React.ReactNode;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-2", className)}>
      <label htmlFor={htmlFor} className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
        {children}
        {hint && (
          <Tooltip content={hint}>
            <button type="button" aria-label="More information" className="text-subtle-foreground hover:text-foreground">
              <Info className="size-3" />
            </button>
          </Tooltip>
        )}
      </label>
      {aside}
    </div>
  );
}

export const inputClass =
  "h-8 w-full rounded-md border border-border bg-surface px-2.5 text-[13px] text-foreground placeholder:text-subtle-foreground transition-colors hover:border-border-strong focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30";

export const TextInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={cn(inputClass, className)} {...props} />,
);
TextInput.displayName = "TextInput";

/**
 * Numeric input that commits on blur/Enter, supports arrow keys (Shift = ×10)
 * and optional stepper buttons. Keeps a local draft so typing is never fought.
 */
export function NumberInput({
  value,
  onChange,
  min = -Infinity,
  max = Infinity,
  step = 1,
  suffix,
  id,
  label,
  stepper,
  className,
  placeholder,
  allowEmpty,
  digits = 2,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  id?: string;
  label: string;
  stepper?: boolean;
  className?: string;
  placeholder?: string;
  allowEmpty?: boolean;
  digits?: number;
}) {
  const display = value == null ? "" : String(Number(value.toFixed(digits)));
  const [draft, setDraft] = React.useState(display);
  const [focused, setFocused] = React.useState(false);
  React.useEffect(() => {
    if (!focused) setDraft(display);
  }, [display, focused]);

  const clampValue = (n: number) => Math.min(max, Math.max(min, n));
  const commit = (raw: string) => {
    if (raw.trim() === "") {
      if (allowEmpty) onChange(null);
      else setDraft(display);
      return;
    }
    const n = Number(raw);
    if (!Number.isFinite(n)) {
      setDraft(display);
      return;
    }
    const v = clampValue(n);
    onChange(v);
    setDraft(String(Number(v.toFixed(digits))));
  };
  const nudge = (dir: 1 | -1, big = false) => {
    const base = value ?? (Number.isFinite(min) ? min : 0);
    const v = clampValue(Number((base + dir * step * (big ? 10 : 1)).toFixed(6)));
    onChange(v);
    setDraft(String(Number(v.toFixed(digits))));
  };

  return (
    <div className={cn("relative flex items-center", className)}>
      {stepper && (
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          onClick={(e) => nudge(-1, e.shiftKey)}
          className="flex h-8 w-7 shrink-0 items-center justify-center rounded-l-md border border-r-0 border-border bg-surface text-muted-foreground hover:bg-surface-hover hover:text-foreground"
        >
          <Minus className="size-3" />
        </button>
      )}
      <input
        id={id}
        aria-label={label}
        inputMode="decimal"
        placeholder={placeholder}
        className={cn(inputClass, "num", stepper && "rounded-none text-center", suffix && "pr-8")}
        value={draft}
        onFocus={() => setFocused(true)}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={(e) => {
          setFocused(false);
          commit(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit((e.target as HTMLInputElement).value);
          if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            e.preventDefault();
            nudge(e.key === "ArrowUp" ? 1 : -1, e.shiftKey);
          }
        }}
      />
      {suffix && (
        <span
          className={cn(
            "num pointer-events-none absolute text-xs text-subtle-foreground",
            stepper ? "right-9" : "right-2.5",
          )}
        >
          {suffix}
        </span>
      )}
      {stepper && (
        <button
          type="button"
          aria-label={`Increase ${label}`}
          onClick={(e) => nudge(1, e.shiftKey)}
          className="flex h-8 w-7 shrink-0 items-center justify-center rounded-r-md border border-l-0 border-border bg-surface text-muted-foreground hover:bg-surface-hover hover:text-foreground"
        >
          <Plus className="size-3" />
        </button>
      )}
    </div>
  );
}

export function Slider({
  value,
  onChange,
  min,
  max,
  step = 1,
  label,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  label: string;
  className?: string;
}) {
  return (
    <SliderPrimitive.Root
      className={cn("relative flex h-5 w-full touch-none select-none items-center", className)}
      value={[value]}
      min={min}
      max={max}
      step={step}
      onValueChange={([v]) => onChange(v)}
    >
      <SliderPrimitive.Track className="relative h-1 grow overflow-hidden rounded-full bg-border">
        <SliderPrimitive.Range className="absolute h-full bg-accent" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        aria-label={label}
        className="block size-3.5 rounded-full border-2 border-accent bg-panel shadow-panel transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40"
      />
    </SliderPrimitive.Root>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  id,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  id?: string;
}) {
  return (
    <SwitchPrimitive.Root
      id={id}
      aria-label={label}
      checked={checked}
      onCheckedChange={onChange}
      className="relative inline-flex h-[18px] w-8 shrink-0 cursor-pointer items-center rounded-full border border-transparent bg-border-strong transition-colors data-[state=checked]:bg-accent"
    >
      <SwitchPrimitive.Thumb className="block size-3.5 translate-x-0.5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[15px]" />
    </SwitchPrimitive.Root>
  );
}

export function SwitchRow({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: React.ReactNode;
}) {
  const id = React.useId();
  return (
    <div className="flex items-center justify-between gap-3 py-0.5">
      <Label htmlFor={id} hint={hint}>
        {label}
      </Label>
      <Switch id={id} checked={checked} onChange={onChange} label={label} />
    </div>
  );
}

export interface SegmentOption<T extends string> {
  value: T;
  label: React.ReactNode;
  tooltip?: React.ReactNode;
  ariaLabel?: string;
}

/** Single-select segmented control (Radix toggle group, roving focus). */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  columns,
  size = "md",
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: SegmentOption<T>[];
  label: string;
  columns?: number;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <ToggleGroup.Root
      type="single"
      aria-label={label}
      value={value}
      onValueChange={(v) => v && onChange(v as T)}
      className={cn("grid gap-1.5", className)}
      style={{ gridTemplateColumns: `repeat(${columns ?? options.length}, minmax(0, 1fr))` }}
    >
      {options.map((o) => {
        const item = (
          <ToggleGroup.Item
            key={o.value}
            value={o.value}
            aria-label={o.ariaLabel}
            data-active={o.value === value || undefined}
            className={cn(
              "flex min-w-0 items-center justify-center gap-1 truncate rounded-md border px-1.5 tabular-nums transition-colors [&_svg]:shrink-0",
              // Styled from the value, not data-state: a Tooltip trigger overwrites data-state.
              o.value === value
                ? "border-accent bg-accent-soft text-accent-text"
                : "border-border bg-surface text-muted-foreground hover:border-border-strong hover:text-foreground",
              size === "sm" ? "h-7 text-[11px]" : "h-8 text-xs",
            )}
          >
            {o.label}
          </ToggleGroup.Item>
        );
        return o.tooltip ? (
          <Tooltip key={o.value} content={o.tooltip}>
            {item}
          </Tooltip>
        ) : (
          item
        );
      })}
    </ToggleGroup.Root>
  );
}

export function NativeSelect<T extends string>({
  value,
  onChange,
  options,
  label,
  id,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string; group?: string }>;
  label: string;
  id?: string;
  className?: string;
}) {
  const groups = new Map<string | undefined, typeof options>();
  for (const o of options) groups.set(o.group, [...(groups.get(o.group) ?? []), o]);
  return (
    <div className={cn("relative", className)}>
      <select
        id={id}
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className={cn(inputClass, "cursor-pointer appearance-none pr-8")}
      >
        {[...groups.entries()].map(([group, opts]) =>
          group ? (
            <optgroup key={group} label={group}>
              {opts.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </optgroup>
          ) : (
            opts.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))
          ),
        )}
      </select>
      <svg
        aria-hidden
        viewBox="0 0 16 16"
        className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-subtle-foreground"
      >
        <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    </div>
  );
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="num inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-surface px-1 text-[10px] text-muted-foreground">
      {children}
    </kbd>
  );
}
