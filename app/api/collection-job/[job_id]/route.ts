import { NextResponse } from 'next/server';

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

// GET /api/collection/collection_job/[collection_job_id] - Get collection job status
export async function GET(
  request: Request,
  { params }: { params: Promise<{ collection_job_id: string }> }
) {
  const { collection_job_id } = await params;
  const apiKey = request.headers.get('X-API-KEY');

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Missing X-API-KEY header' },
      { status: 401 }
    );
  }

  try {
    const response = await fetch(
      `${backendUrl}/api/v1/collection_jobs/${collection_job_id}`,
      {
        headers: {
          'X-API-KEY': apiKey,
        },
      }
    );

    const text = await response.text();
    const data = text ? JSON.parse(text) : {};

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message, data: null },
      { status: 500 }
    );
  }
}
