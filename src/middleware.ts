import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Everything except static files, images, icons, the manifest and the service worker.
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|icons/|manifest.webmanifest|sw.js|robots.txt|sitemap.xml|opengraph-image|.*\\.(?:png|jpg|jpeg|gif|webp|avif|svg|woff2?)$).*)",
  ],
};
