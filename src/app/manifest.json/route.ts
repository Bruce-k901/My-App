import { NextResponse } from 'next/server';

// Make this route public - no authentication required
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Export route config to ensure it's public
export const runtime = 'nodejs';

export async function GET() {
  // Return immediately - no auth checks needed
  const manifest = {
    name: "Checkly - Compliance Management",
    short_name: "Checkly",
    description: "Health & safety, food safety, and operational compliance for hospitality venues",
    start_url: "/",
    display: "standalone",
    background_color: "#0B0D13",
    theme_color: "#10B981",
    orientation: "portrait-primary",
    scope: "/",
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable"
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable"
      },
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any"
      }
    ],
    categories: ["business", "productivity"],
    shortcuts: [
      {
        name: "New Task",
        short_name: "Task",
        description: "Create a new task",
        url: "/dashboard/tasks/new",
        icons: [{ src: "/icon-192x192.png", sizes: "192x192" }]
      },
      {
        name: "New Incident",
        short_name: "Incident",
        description: "Report an incident",
        url: "/dashboard/incidents/new",
        icons: [{ src: "/icon-192x192.png", sizes: "192x192" }]
      },
      {
        name: "Notifications",
        short_name: "Alerts",
        description: "View notifications",
        url: "/notifications",
        icons: [{ src: "/icon-192x192.png", sizes: "192x192" }]
      }
    ],
    screenshots: [],
    prefer_related_applications: false
  };

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

