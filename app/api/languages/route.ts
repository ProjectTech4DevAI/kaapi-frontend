import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
  const apiKey = request.headers.get('X-API-KEY');

  try {
    const response = await fetch(`${backendUrl}/api/v1/languages`, {
      headers: {
        'X-API-KEY': apiKey || '',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error, data: null },
      { status: 500 }
    );
  }
}
