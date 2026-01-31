import { NextRequest, NextResponse } from 'next/server';


export async function GET(request: Request,
    { params }: { params: Promise<{ document_id: string }> }
) {

  const { document_id } = await params;
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
  const apiKey = request.headers.get('X-API-KEY');

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Missing X-API-KEY header' },
      { status: 401 }
    );
  }

  try {
    const response = await fetch(`${backendUrl}/api/v1/documents/${document_id}?include_url=true`, {
      headers: {
        'X-API-KEY': apiKey,
      },
    });

    // Handle empty responses (204 No Content, etc.)
    const text = await response.text();
    const data = text ? JSON.parse(text) : {};

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message, data: null },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request,
    { params }: { params: Promise<{ document_id: string }> }
) {
  const { document_id } = await params;
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
  const apiKey = request.headers.get('X-API-KEY');

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Missing X-API-KEY header' },
      { status: 401 }
    );
  }

  try {
    const response = await fetch(`${backendUrl}/api/v1/documents/${document_id}`, {
      method: 'DELETE',
      headers: {
        'X-API-KEY': apiKey,
      },
    });

    // Handle empty responses (204 No Content, etc.)
    const text = await response.text();
    const data = text ? JSON.parse(text) : { success: true };

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete document', details: error.message },
      { status: 500 }
    );
  }
}
