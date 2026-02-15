import { NextRequest, NextResponse } from 'next/server';
import { markInvitationAsUsed } from '@/lib/stockly/portalInvitationHelpers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    await markInvitationAsUsed(token);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error marking invitation as used:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to mark invitation as used' },
      { status: 500 }
    );
  }
}

