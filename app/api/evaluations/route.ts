import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/evaluations
 * Fetches all evaluation jobs
 */
export async function GET(request: NextRequest) {
  try {
    const apiKey = request.headers.get('X-API-KEY');
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing X-API-KEY' }, { status: 401 });
    }

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

    const response = await fetch(`${backendUrl}/api/v1/evaluations`, {
      method: 'GET',
      headers: {
        'X-API-KEY': apiKey,
      },
    });

    const data = await response.json();

    // Log the structure to help debug score visibility issues - only for text type evaluations
    //TODO Fix it later
    let items = [];
    if (data && Array.isArray(data)) {
      items = data.filter((item: any) => item.type === 'text');
    } else if (data && data.data && Array.isArray(data.data)) {
      items = data.data.filter((item: any) => item.type === 'text');
    }

    if (items.length > 0) {
      console.log('[GET /api/evaluations] Sample text evaluation structure:', {
        firstItem: {
          id: items[0].id,
          type: items[0].type,
          hasScore: !!items[0].score,
          hasScores: !!items[0].scores,
          scoreKeys: items[0].score ? Object.keys(items[0].score) : [],
          scoresKeys: items[0].scores ? Object.keys(items[0].scores) : []
        }
      });
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch evaluations', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/evaluations
 * Creates a new evaluation job
 */
export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('X-API-KEY');
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing X-API-KEY' }, { status: 401 });
    }

    const body = await request.json();
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

    const response = await fetch(`${backendUrl}/api/v1/evaluations`, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to forward request', details: error.message },
      { status: 500 }
    );
  }
}