import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const apiKey = request.headers.get('X-API-KEY');
  if (!apiKey) {
    return NextResponse.json({ error: 'Missing X-API-KEY header' }, { status: 401 });
  }

  const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
  const response = await fetch(`${backendUrl}/api/v1/assessment/events`, {
    method: 'GET',
    headers: {
      'X-API-KEY': apiKey,
      Accept: 'text/event-stream',
    },
    cache: 'no-store',
  });

  if (!response.ok || !response.body) {
    const text = await response.text();
    return NextResponse.json(
      { error: 'Failed to connect assessment event stream', details: text },
      { status: response.status || 500 }
    );
  }

  return new Response(response.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
