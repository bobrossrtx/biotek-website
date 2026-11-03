import type { MetadataRoute } from "next";
import { site } from "@/lib/content";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/about/", "/events/", "/music/", "/gallery/", "/booking/"];
  return routes.map((route) => ({
    url: `${site.url}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "/events/" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.7,
  }));
}
