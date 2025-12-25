/**
 * Speech-to-Text CSV Parsing API Route
 *
 * POST: Parse CSV file with audio_url, ground_truth columns
 * Downloads audio files and returns base64 encoded data
 */

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('X-API-KEY');

    if (!apiKey) {
      console.error('[STT Parse CSV] Missing API key');
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    console.log('[STT Parse CSV] Forwarding request to backend...');

    // Forward the request to the backend
    const response = await fetch(`${BACKEND_URL}/api/v1/evaluations/stt/dataset`, {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
      },
      body: formData,
    });

    console.log('[STT Parse CSV] Backend response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('[STT Parse CSV] Backend error:', errorData);
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json();
    console.log('[STT Parse CSV] Successfully parsed CSV, rows:', data.data?.success?.length || 0, 'errors:', data.data?.errors?.length || 0);

    // Transform the response to match frontend expectations
    const transformedData = {
      rows: [
        ...(data.data?.success || []),
        ...(data.data?.errors || []).map((err: { row: number; audio_url: string; error: string }) => ({
          status: 'error',
          row: err.row,
          audio_url: err.audio_url,
          error: err.error,
        })),
      ].sort((a, b) => a.row - b.row),
    };

    console.log('[STT Parse CSV] Transformed data:', transformedData.rows.length, 'total rows');
    return NextResponse.json(transformedData);
  } catch (error) {
    console.error('[STT Parse CSV] Error:', error);
    return NextResponse.json(
      { error: 'Failed to parse CSV file' },
      { status: 500 }
    );
  }
}
