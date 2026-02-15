import { NextResponse } from 'next/server';

// Make this route public - no authentication required
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Export route config to ensure it's public
export const runtime = 'nodejs';

export async function GET() {
  // Return immediately - no auth checks needed
  const manifest = {
    name: "Opsly",
    short_name: "Opsly",
    description: "Complete operations platform for hospitality, retail, and manufacturing businesses",
    start_url: "/",
    display: "standalone",
    background_color: "#110f0d",
    theme_color: "#D37E91",
    orientation: "portrait-primary",
    scope: "/",
    icons: [
      {
        src: "/web-app-manifest-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable"
      },
      {
        src: "/web-app-manifest-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable"
      }
    ],
    categories: ["business", "productivity"],
    shortcuts: [
      {
        name: "New Task",
        short_name: "Task",
        description: "Create a new task",
        url: "/dashboard/tasks/new",
        icons: [{ src: "/web-app-manifest-192x192.png", sizes: "192x192" }]
      },
      {
        name: "New Incident",
        short_name: "Incident",
        description: "Report an incident",
        url: "/dashboard/incidents/new",
        icons: [{ src: "/web-app-manifest-192x192.png", sizes: "192x192" }]
      },
      {
        name: "Notifications",
        short_name: "Alerts",
        description: "View notifications",
        url: "/notifications",
        icons: [{ src: "/web-app-manifest-192x192.png", sizes: "192x192" }]
      }
    ],
    screenshots: [],
    prefer_related_applications: false
  };

  return NextResponse.json(manifest, {
    status: 200,
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
    },
  });
}

