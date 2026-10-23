import type { MetadataRoute } from "next";
import { LAUNCH_SCHOOL } from "@/lib/school";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Rumi — Roommate matching",
    short_name: "Rumi",
    description: `Free roommate matching for ${LAUNCH_SCHOOL.shortName} students — ranked by how well you'd live together.`,
    start_url: "/matches?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f7f5f0",
    theme_color: "#f7f5f0",
    categories: ["lifestyle", "social", "education"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Matches", url: "/matches", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Messages", url: "/messages", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
