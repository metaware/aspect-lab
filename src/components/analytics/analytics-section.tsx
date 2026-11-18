"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { LineChart, Columns3, Target, Layers, Code2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/overlays";

function Loading() {
  return <div className="h-[320px] animate-pulse rounded-lg bg-surface" aria-busy="true" aria-label="Loading" />;
}

// Advanced analytics are code-split and only load when their tab is opened.
const CroppingChart = dynamic(() => import("./cropping-chart").then((m) => m.CroppingChart), { ssr: false, loading: Loading });
const ViewportComparison = dynamic(() => import("@/components/preview/viewport-comparison").then((m) => m.ViewportComparison), { ssr: false, loading: Loading });
const AspectRatioOptimizer = dynamic(() => import("./aspect-ratio-optimizer").then((m) => m.AspectRatioOptimizer), { ssr: false, loading: Loading });
const AssetRecommendations = dynamic(() => import("./asset-recommendations").then((m) => m.AssetRecommendations), { ssr: false, loading: Loading });
const CodeGenerator = dynamic(() => import("@/components/export/code-generator").then((m) => m.CodeGenerator), { ssr: false, loading: Loading });

const TABS = [
  { value: "cropping", label: "Cropping analysis", icon: LineChart, blurb: "How cropping changes as the viewport grows, per source ratio." },
  { value: "compare", label: "Compare", icon: Columns3, blurb: "The same component across widths or ratios, at one shared scale." },
  { value: "optimizer", label: "Breakpoint optimizer", icon: Target, blurb: "Best source ratios per breakpoint range." },
  { value: "assets", label: "Asset planner", icon: Layers, blurb: "How many image variants you need, and at what resolution." },
  { value: "code", label: "Code", icon: Code2, blurb: "Implementation for the current configuration." },
];

export function AnalyticsSection() {
  const [tab, setTab] = useState("cropping");
  const active = TABS.find((t) => t.value === tab)!;
  return (
    <section aria-labelledby="analytics-heading" className="border-t border-border bg-background">
      <Tabs value={tab} onValueChange={setTab} className="mx-auto max-w-[1600px] px-4 py-6 md:px-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="analytics-heading" className="text-[15px] font-semibold">
              Analysis
            </h2>
            <p className="mt-0.5 text-[13px] text-muted-foreground">{active.blurb}</p>
          </div>
          <TabsList label="Analysis views">
            {TABS.map(({ value, label, icon: Icon }) => (
              <TabsTrigger key={value} value={value}>
                <Icon aria-hidden /> {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <div className="rounded-xl border border-border bg-panel p-4 md:p-5">
          <TabsContent value="cropping">
            <CroppingChart />
          </TabsContent>
          <TabsContent value="compare">
            <ViewportComparison />
          </TabsContent>
          <TabsContent value="optimizer">
            <AspectRatioOptimizer />
          </TabsContent>
          <TabsContent value="assets">
            <AssetRecommendations />
          </TabsContent>
          <TabsContent value="code">
            <CodeGenerator />
          </TabsContent>
        </div>
      </Tabs>
    </section>
  );
}
