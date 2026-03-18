import { apiClient } from '@/app/lib/apiClient';
import { NextResponse, NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ credential_id: string }> },
) {
  const { credential_id } = await params;
  try {
    const { status, data } = await apiClient(request, `/api/v1/credentials/${credential_id}`);
    return NextResponse.json(data, { status });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ credential_id: string }> },
) {
  const { credential_id } = await params;
  const body = await request.json();
  try {
    const { status, data } = await apiClient(request, `/api/v1/credentials/${credential_id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    return NextResponse.json(data, { status });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ credential_id: string }> },
) {
  const { credential_id } = await params;
  try {
    await apiClient(request, `/api/v1/credentials/${credential_id}`, { method: 'DELETE' });
    return new NextResponse(null, { status: 204 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

