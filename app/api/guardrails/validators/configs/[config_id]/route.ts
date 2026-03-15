import { NextResponse } from 'next/server';

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8001';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ config_id: string }> }
) {
  const { config_id } = await params;
  const authHeader = request.headers.get('Authorization');

  if (!authHeader) {
    return NextResponse.json(
      { error: 'Missing Authorization header' },
      { status: 401 }
    );
  }

  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organization_id');
    const projectId = searchParams.get('project_id');

    // Build query string
    const queryParams = new URLSearchParams();
    if (organizationId) queryParams.append('organization_id', organizationId);
    if (projectId) queryParams.append('project_id', projectId);

    const queryString = queryParams.toString();
    const url = `${backendUrl}/api/v1/guardrails/validators/configs/${config_id}${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    });

    // Handle empty responses (204 No Content, etc.)
    const text = await response.text();
    const data = text ? JSON.parse(text) : {};

    if (!response.ok) {
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


export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ config_id: string }> }
) {
  const { config_id } = await params;
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8001';
  const authHeader = request.headers.get('Authorization');

  if (!authHeader) {
    return NextResponse.json(
      { error: 'Missing Authorization header' },
      { status: 401 }
    );
  }

  try {
      // Get query parameters
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organization_id');
    const projectId = searchParams.get('project_id');

    // Build query string
    const queryParams = new URLSearchParams();
    if (organizationId) queryParams.append('organization_id', organizationId);
    if (projectId) queryParams.append('project_id', projectId);

    const queryString = queryParams.toString();
    const url = `${backendUrl}/api/v1/guardrails/validators/configs/${config_id}${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to delete config', data: null },
      { status: 500 }
    );
  }
}
