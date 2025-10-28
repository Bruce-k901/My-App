import { NextRequest, NextResponse } from 'next/server';

// Mock compliance templates data - Empty array (templates now handled by TemperatureCheckTemplate component)
const COMPLIANCE_TEMPLATES = [];

export async function GET(request: NextRequest) {
  try {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return NextResponse.json({
      success: true,
      data: COMPLIANCE_TEMPLATES,
      count: COMPLIANCE_TEMPLATES.length
    });
  } catch (error) {
    console.error('Error fetching compliance templates:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch compliance templates',
        data: []
      },
      { status: 500 }
    );
  }
}