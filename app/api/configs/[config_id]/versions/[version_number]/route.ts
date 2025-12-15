import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ config_id: string; version_number: string }> }
) {
  const { config_id, version_number } = await params;
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
  const apiKey = request.headers.get('X-API-KEY');

  try {
    const response = await fetch(
      `${backendUrl}/api/v1/configs/${config_id}/versions/${version_number}`,
      {
        headers: {
          'X-API-KEY': apiKey || '',
        },
      }
    );

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch version', data: null },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ config_id: string; version_number: string }> }
) {
  const { config_id, version_number } = await params;
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
  const apiKey = request.headers.get('X-API-KEY');

  try {
    const response = await fetch(
      `${backendUrl}/api/v1/configs/${config_id}/versions/${version_number}`,
      {
        method: 'DELETE',
        headers: {
          'X-API-KEY': apiKey || '',
        },
      }
    );

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to delete version', data: null },
      { status: 500 }
    );
  }
}
