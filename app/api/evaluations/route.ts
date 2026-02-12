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

    // Log the structure to help debug score visibility issues
    //TODO Fix it later
    if (data && Array.isArray(data)) {
      console.log('[GET /api/evaluations] Sample evaluation structure:', {
        firstItem: data[0] ? {
          id: data[0].id,
          hasScore: !!data[0].score,
          hasScores: !!data[0].scores,
          scoreKeys: data[0].score ? Object.keys(data[0].score) : [],
          scoresKeys: data[0].scores ? Object.keys(data[0].scores) : []
        } : 'No items'
      });
    } else if (data && data.data && Array.isArray(data.data)) {
      console.log('[GET /api/evaluations] Sample evaluation structure (nested):', {
        firstItem: data.data[0] ? {
          id: data.data[0].id,
          hasScore: !!data.data[0].score,
          hasScores: !!data.data[0].scores,
          scoreKeys: data.data[0].score ? Object.keys(data.data[0].score) : [],
          scoresKeys: data.data[0].scores ? Object.keys(data.data[0].scores) : []
        } : 'No items'
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