"use client";

import { Section } from "@/components/ui/overlays";
import { ImageSourcePicker } from "@/components/configuration/image-source-picker";
import { AspectRatioPicker } from "@/components/configuration/aspect-ratio-picker";
import { ViewportControls } from "@/components/configuration/viewport-controls";
import { ContainerBackground, ContainerHeightControls, ContainerWidthControls } from "@/components/configuration/container-controls";
import { FocalPointControl, ObjectFitSelector, ObjectPositionControl, OverlayControls } from "@/components/configuration/rendering-controls";

export function ConfigurationPanel() {
  return (
    <div className="px-4 pb-8 pt-4">
      <h2 className="mb-1 text-[15px] font-semibold">Configuration</h2>
      <Section title="Source image">
        <ImageSourcePicker />
      </Section>
      <Section title="Aspect ratio">
        <AspectRatioPicker />
      </Section>
      <Section title="Viewport">
        <ViewportControls />
      </Section>
      <Section title="Container width">
        <ContainerWidthControls />
      </Section>
      <Section title="Container height">
        <ContainerHeightControls />
      </Section>
      <Section title="Object fit">
        <ObjectFitSelector />
        <ContainerBackground />
      </Section>
      <Section title="Position">
        <ObjectPositionControl />
      </Section>
      <Section title="Focal point" defaultOpen={false}>
        <FocalPointControl />
      </Section>
      <Section title="Content overlay" defaultOpen={false}>
        <OverlayControls />
      </Section>
    </div>
  );
}
