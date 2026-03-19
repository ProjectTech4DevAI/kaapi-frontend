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
    // Forward query parameters to the backend
    const { searchParams } = new URL(request.url);
    const backendParams = new URLSearchParams();
    for (const [key, value] of searchParams.entries()) {
      backendParams.append(key, value);
    }
    const queryString = backendParams.toString() ? `?${backendParams.toString()}` : '';

    const response = await fetch(`${backendUrl}/api/v1/evaluations/tts/datasets/${dataset_id}${queryString}`, {
      headers: {
        'X-API-KEY': apiKey,
      },
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    // If fetch_content=true, download the CSV from the signed URL and return it
    const fetchContent = new URL(request.url).searchParams.get('fetch_content');
    if (fetchContent === 'true') {
      const signedUrl = data?.data?.signed_url || data?.signed_url;
      if (!signedUrl) {
        return NextResponse.json({ error: 'No signed URL available' }, { status: 404 });
      }
      const csvResponse = await fetch(signedUrl);
      if (!csvResponse.ok) {
        return NextResponse.json({ error: 'Failed to fetch CSV file' }, { status: 502 });
      }
      const csvText = await csvResponse.text();
      return NextResponse.json({ ...data, csv_content: csvText }, { status: 200 });
    }

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
    const response = await fetch(`${backendUrl}/api/v1/evaluations/tts/datasets/${dataset_id}`, {
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
