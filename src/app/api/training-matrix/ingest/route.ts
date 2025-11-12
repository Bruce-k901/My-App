import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (!body?.course_id || !body?.learner?.full_name) {
    return NextResponse.json({ ok: false, error: 'bad payload' }, { status: 400 });
  }

  console.log('Training matrix ingest payload', body);
  // TODO: validate payload against schema and persist to database.
  return NextResponse.json({ ok: true });
}
