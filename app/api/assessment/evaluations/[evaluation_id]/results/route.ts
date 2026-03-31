import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/assessment/evaluations/:evaluation_id/results
 *
 * Proxy for downloading a single evaluation run's results (JSON, CSV, XLSX).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ evaluation_id: string }> }
) {
  try {
    const apiKey = request.headers.get('X-API-KEY');
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing X-API-KEY header' }, { status: 401 });
    }

    const { evaluation_id } = await params;
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    const searchParams = request.nextUrl.searchParams.toString();
    const queryString = searchParams ? `?${searchParams}` : '';

    const response = await fetch(
      `${backendUrl}/api/v1/assessment/evaluations/${evaluation_id}/results${queryString}`,
      {
        method: 'GET',
        headers: { 'X-API-KEY': apiKey },
      }
    );

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/csv') || contentType.includes('spreadsheetml') || contentType.includes('octet-stream')) {
      const blob = await response.blob();
      const headers = new Headers();
      headers.set('Content-Type', contentType);
      const disposition = response.headers.get('content-disposition');
      if (disposition) headers.set('Content-Disposition', disposition);
      return new NextResponse(blob, { status: response.status, headers });
    }

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }
    return NextResponse.json(data, { status: 200 });
  } catch (error: unknown) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to forward request', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
