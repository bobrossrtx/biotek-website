import type { Metadata } from "next";
import { site } from "@/lib/content";

const title = `${site.name} — ${site.tagline}`;
const description = site.heroTagline;

export function pageMetadata(overrides: Partial<Metadata> & { title?: string; description?: string; path?: string }): Metadata {
  const pageTitle = overrides.title
    ? `${overrides.title} — ${site.name}`
    : title;
  const pageDesc = overrides.description ?? description;
  const url = overrides.path ? `${site.url}${overrides.path}` : site.url;
  return {
    title: pageTitle,
    description: pageDesc,
    alternates: { canonical: url },
    openGraph: {
      title: pageTitle,
      description: pageDesc,
      url,
      siteName: site.name,
      type: "website",
      images: [{ url: "/images/og.png", width: 1200, height: 630, alt: site.name }],
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description: pageDesc,
      images: ["/images/og.png"],
    },
  };
}
