import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'

// This route MUST be public - no authentication checks
// It's called by browsers automatically for PWA functionality
export async function GET() {
  try {
    // Read the manifest.json file from public directory
    const filePath = join(process.cwd(), 'public', 'manifest.json')
    const fileContents = await readFile(filePath, 'utf-8')
    const manifest = JSON.parse(fileContents)
    
    // Return with explicit public headers - no auth required
    return NextResponse.json(manifest, {
      status: 200,
      headers: {
        'Content-Type': 'application/manifest+json',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        // Explicitly mark as public - no authentication
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error: any) {
    console.error('Error reading manifest.json:', error)
    // Return a basic manifest if file read fails - still public
    return NextResponse.json({
      name: 'Checkly',
      short_name: 'Checkly',
      start_url: '/',
      display: 'standalone',
      icons: [
        {
          src: '/icon-192x192.png',
          sizes: '192x192',
          type: 'image/png',
        },
      ],
    }, {
      status: 200,
      headers: {
        'Content-Type': 'application/manifest+json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

