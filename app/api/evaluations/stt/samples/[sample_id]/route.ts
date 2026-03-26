import { NextResponse } from 'next/server';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ sample_id: string }> }
) {
  const { sample_id } = await params;
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
  const apiKey = request.headers.get('X-API-KEY');

  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: Missing API key' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();

    const response = await fetch(
      `${backendUrl}/api/v1/evaluations/stt/samples/${sample_id}`,
      {
        method: 'PATCH',
        headers: {
          'X-API-KEY': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    let data;
    try {
      data = await response.json();
    } catch {
      data = { success: response.ok };
    }
    return NextResponse.json(data, { status: response.status });
  } catch (error: unknown) {
    console.error('Sample update error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update sample', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
