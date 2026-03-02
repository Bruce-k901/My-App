/**
 * Manual Sync API Route
 * Triggers sync for iOS Safari (no Background Sync API support)
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // This endpoint is called by the client-side polling mechanism
    // The actual sync logic runs in the service worker
    // This just acknowledges the sync request

    return NextResponse.json({
      success: true,
      message: 'Sync triggered'
    });
  } catch (error: any) {
    console.error('[Sync API] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    );
  }
}
