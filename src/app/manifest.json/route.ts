import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'

export async function GET() {
  try {
    // Read the manifest.json file from public directory
    const filePath = join(process.cwd(), 'public', 'manifest.json')
    const fileContents = await readFile(filePath, 'utf-8')
    const manifest = JSON.parse(fileContents)
    
    return NextResponse.json(manifest, {
      headers: {
        'Content-Type': 'application/manifest+json',
        'Cache-Control': 'public, max-age=3600',
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
      headers: {
        'Content-Type': 'application/manifest+json',
      },
    })
  }
}

