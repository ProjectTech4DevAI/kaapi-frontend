import { NextRequest, NextResponse } from 'next/server';



const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8001';

export async function POST(request: NextRequest) {
  try {
    // Get the guardrails token from environment variable
    const guardrailsToken = process.env.GUARDRAILS_TOKEN;
    if (!guardrailsToken) {
      return NextResponse.json(
        { error: 'Missing GUARDRAILS_TOKEN environment variable' },
        { status: 500 }
      );
    }

    const authHeader = `Bearer ${guardrailsToken}`;

    // Get the JSON body from the request
    const body = await request.json();

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organization_id');
    const projectId = searchParams.get('project_id');

    // Build query string
    const queryParams = new URLSearchParams();
    if (organizationId) queryParams.append('organization_id', organizationId);
    if (projectId) queryParams.append('project_id', projectId);

    const queryString = queryParams.toString();
    const url = `${backendUrl}/api/v1/guardrails/validators/configs${queryString ? `?${queryString}` : ''}`;

    console.log('[POST /api/guardrails/validators/configs] Forwarding to:', url);
    console.log('[POST /api/guardrails/validators/configs] Body:', JSON.stringify(body, null, 2));

    // Forward the request to the actual backend
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    });

    console.log('[POST /api/guardrails/validators/configs] Backend response status:', response.status, response.statusText);

    // Handle empty responses (204 No Content, etc.)
    const text = await response.text();
    const data = text ? JSON.parse(text) : { success: true };

    console.log('[POST /api/guardrails/validators/configs] Backend response data:', JSON.stringify(data, null, 2));

    // Return the response with the same status code
    if (!response.ok) {
      console.error('[POST /api/guardrails/validators/configs] Backend error:', response.status, data);
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to forward request to backend', details: error.message },
      { status: 500 }
    );
  }
}