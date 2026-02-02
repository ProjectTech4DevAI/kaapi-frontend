import { NextResponse } from 'next/server';

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

// GET /api/collections/[collection_id] - Get a specific collection
export async function GET(
  request: Request,
  { params }: { params: Promise<{ collection_id: string }> }
) {
  const { collection_id } = await params;
  const apiKey = request.headers.get('X-API-KEY');

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Missing X-API-KEY header' },
      { status: 401 }
    );
  }

  try {
    const response = await fetch(
      `${backendUrl}/api/v1/collections/${collection_id}?include_docs=true`,
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

// DELETE /api/collection/[collection_id] - Delete a collection
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ collection_id: string }> }
) {
  const { collection_id } = await params;
  const apiKey = request.headers.get('X-API-KEY');

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Missing X-API-KEY header' },
      { status: 401 }
    );
  }

  try {
    const response = await fetch(
      `${backendUrl}/api/v1/collections/${collection_id}`,
      {
        method: 'DELETE',
        headers: {
          'X-API-KEY': apiKey,
        },
      }
    );

    const text = await response.text();
    const data = text ? JSON.parse(text) : { success: true };

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
