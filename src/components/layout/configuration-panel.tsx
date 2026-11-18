"use client";

import { Section } from "@/components/ui/overlays";
import { InfoButton } from "@/components/docs/info-button";
import { ImageSourcePicker } from "@/components/configuration/image-source-picker";
import { AspectRatioPicker } from "@/components/configuration/aspect-ratio-picker";
import { ViewportControls } from "@/components/configuration/viewport-controls";
import { ContainerBackground, ContainerHeightControls, ContainerWidthControls } from "@/components/configuration/container-controls";
import { FocalPointControl, ObjectFitSelector, ObjectPositionControl, OverlayControls } from "@/components/configuration/rendering-controls";

export function ConfigurationPanel() {
  return (
    <div className="px-4 pb-8 pt-4">
      <h2 className="mb-1 text-[15px] font-semibold">Configuration</h2>
      <Section title="Source image" aside={<InfoButton topic="source-image" />}>
        <ImageSourcePicker />
      </Section>
      <Section title="Aspect ratio" aside={<InfoButton topic="aspect-ratio" />}>
        <AspectRatioPicker />
      </Section>
      <Section title="Viewport" aside={<InfoButton topic="viewport" />}>
        <ViewportControls />
      </Section>
      <Section title="Container width" aside={<InfoButton topic="container-width" />}>
        <ContainerWidthControls />
      </Section>
      <Section title="Container height" aside={<InfoButton topic="container-height" />}>
        <ContainerHeightControls />
      </Section>
      <Section title="Object fit" aside={<InfoButton topic="object-fit" />}>
        <ObjectFitSelector />
        <ContainerBackground />
      </Section>
      <Section title="Position" aside={<InfoButton topic="position" />}>
        <ObjectPositionControl />
      </Section>
      <Section title="Focal point" defaultOpen={false} aside={<InfoButton topic="focal-point" />}>
        <FocalPointControl />
      </Section>
      <Section title="Content overlay" defaultOpen={false} aside={<InfoButton topic="overlay" />}>
        <OverlayControls />
      </Section>
    </div>
  );
}
