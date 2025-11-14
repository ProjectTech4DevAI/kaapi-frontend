import { NextRequest, NextResponse } from 'next/server';

/**
 * DELETE /api/evaluations/datasets/:dataset_id
 *
 * Proxy endpoint to delete a dataset from the backend.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ dataset_id: string }> }
) {
  try {
    // Get the API key from request headers
    const apiKey = request.headers.get('X-API-KEY');

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing X-API-KEY header' },
        { status: 401 }
      );
    }

    const { dataset_id } = await params;

    // Get backend URL from environment variable
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

    // Forward the request to the actual backend
    const response = await fetch(`${backendUrl}/api/v1/evaluations/datasets/${dataset_id}`, {
      method: 'DELETE',
      headers: {
        'X-API-KEY': apiKey,
      },
    });

    // Get the response data
    let data;
    try {
      data = await response.json();
    } catch (e) {
      // If response is not JSON, just return success
      data = { success: true };
    }

    // Return the response with the same status code
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to forward request to backend', details: error.message },
      { status: 500 }
    );
  }
}
