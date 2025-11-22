import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'

// This route is public and should not require authentication
export async function GET() {
  try {
    // Read the manifest.json file from public directory
    const filePath = join(process.cwd(), 'public', 'manifest.json')
    const fileContents = await readFile(filePath, 'utf-8')
    const manifest = JSON.parse(fileContents)
    
    return NextResponse.json(manifest, {
      status: 200,
      headers: {
        'Content-Type': 'application/manifest+json',
        'Cache-Control': 'public, max-age=3600',
        // Ensure CORS headers for PWA
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
      },
    })
  } catch (error) {
    console.error('Error reading manifest.json:', error)
    // Return a basic manifest if file read fails
    return NextResponse.json({
      name: 'Checkly',
      short_name: 'Checkly',
      start_url: '/',
      display: 'standalone',
    }, {
      status: 200,
      headers: {
        'Content-Type': 'application/manifest+json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
      },
    })
  }
}

