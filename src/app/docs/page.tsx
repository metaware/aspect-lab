import type { Metadata } from "next";
import { DocsPage } from "@/components/docs/docs-page";

export const metadata: Metadata = {
  title: "Documentation · AspectLab",
  description: "How every AspectLab option works, with illustrated examples and usage ideas.",
};

export default function Docs() {
  return <DocsPage />;
}
