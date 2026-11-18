"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import * as Collapsible from "@radix-ui/react-collapsible";
import { ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] data-[state=open]:animate-in" />
      <DialogPrimitive.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-panel p-5 shadow-xl",
          className,
        )}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <DialogPrimitive.Title className="text-[15px] font-semibold">{title}</DialogPrimitive.Title>
            {description && (
              <DialogPrimitive.Description className="mt-1 text-[13px] text-muted-foreground">
                {description}
              </DialogPrimitive.Description>
            )}
          </div>
          <DialogPrimitive.Close
            aria-label="Close"
            className="rounded-md p-1 text-muted-foreground hover:bg-surface-hover hover:text-foreground"
          >
            <X className="size-4" />
          </DialogPrimitive.Close>
        </div>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;

export function PopoverContent({
  children,
  className,
  align = "start",
  side,
}: {
  children: React.ReactNode;
  className?: string;
  align?: "start" | "center" | "end";
  side?: "top" | "bottom" | "left" | "right";
}) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        align={align}
        side={side}
        sideOffset={6}
        collisionPadding={12}
        className={cn("z-50 rounded-lg border border-border bg-panel p-3 shadow-xl outline-none", className)}
      >
        {children}
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  );
}

export const Tabs = TabsPrimitive.Root;
export const TabsContent = TabsPrimitive.Content;

export function TabsList({ children, className, label }: { children: React.ReactNode; className?: string; label: string }) {
  return (
    <TabsPrimitive.List aria-label={label} className={cn("flex items-center gap-1 overflow-x-auto scrollbar-thin", className)}>
      {children}
    </TabsPrimitive.List>
  );
}

export function TabsTrigger({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) {
  return (
    <TabsPrimitive.Trigger
      value={value}
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground data-[state=active]:bg-surface data-[state=active]:text-foreground data-[state=active]:shadow-[inset_0_0_0_1px_var(--border)] [&_svg]:size-3.5",
        className,
      )}
    >
      {children}
    </TabsPrimitive.Trigger>
  );
}

/** Collapsible configuration section with a quiet uppercase heading. */
export function Section({
  title,
  children,
  defaultOpen = true,
  aside,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  aside?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <Collapsible.Root open={open} onOpenChange={setOpen} className="border-b border-border py-4 last:border-b-0">
      <div className="flex items-center justify-between gap-2">
        <Collapsible.Trigger className="group flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-subtle-foreground hover:text-foreground">
          <ChevronRight className="size-3 transition-transform group-data-[state=open]:rotate-90" />
          {title}
        </Collapsible.Trigger>
        {aside}
      </div>
      <Collapsible.Content className="mt-3 space-y-3">{children}</Collapsible.Content>
    </Collapsible.Root>
  );
}
