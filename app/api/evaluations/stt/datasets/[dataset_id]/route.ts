import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ dataset_id: string }> }
) {
  const { dataset_id } = await params;
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
  const apiKey = request.headers.get('X-API-KEY');

  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: Missing API key', data: null },
      { status: 401 }
    );
  }

  try {
    // Get query parameters from the request
    const { searchParams } = new URL(request.url);
    const includeSamples = searchParams.get('include_samples');
    const includeAudio = searchParams.get('include_audio');

    // Build backend URL with query parameters
    const backendParams = new URLSearchParams();
    if (includeSamples) backendParams.append('include_samples', includeSamples);
    if (includeAudio) backendParams.append('include_audio', includeAudio);

    const backendUrlWithParams = `${backendUrl}/api/v1/evaluations/stt/datasets/${dataset_id}${backendParams.toString() ? `?${backendParams.toString()}` : ''
      }`;

    const response = await fetch(backendUrlWithParams, {
      headers: {
        'X-API-KEY': apiKey,
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dataset', data: null },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ dataset_id: string }> }
) {
  const { dataset_id } = await params;
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
  const apiKey = request.headers.get('X-API-KEY');

  if (!apiKey) {
    return NextResponse.json({ success: false, error: 'Unauthorized: Missing API key' }, { status: 401 });
  }

  try {
    const response = await fetch(`${backendUrl}/api/v1/evaluations/stt/datasets/${dataset_id}`, {
      method: 'DELETE',
      headers: { 'X-API-KEY': apiKey },
    });
    let data;
    try { data = await response.json(); } catch { data = { success: true }; }
    return NextResponse.json(data, { status: response.ok ? 200 : response.status });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'Failed to delete dataset', details: error.message }, { status: 500 });
  }
}