import { NextResponse, NextRequest } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ config_id: string }> }
) {
  const { config_id } = await params;
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
  const apiKey = request.headers.get('X-API-KEY');

  try {
    const response = await fetch(`${backendUrl}/api/v1/configs/${config_id}/versions`, {
      headers: {
        'X-API-KEY': apiKey || '',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch versions', data: null },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ config_id: string }> }
) {
  const { config_id } = await params;
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
  const apiKey = request.headers.get('X-API-KEY');

  try {
    const body = await request.json();

    const response = await fetch(`${backendUrl}/api/v1/configs/${config_id}/versions`, {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to create version', data: null },
      { status: 500 }
    );
  }
}
