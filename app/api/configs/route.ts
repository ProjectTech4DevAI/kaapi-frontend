import { NextResponse, NextRequest } from 'next/server';

export async function GET(request: Request) {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
  const apiKey = request.headers.get('X-API-KEY');

  try {
    const response = await fetch(`${backendUrl}/api/v1/configs/`, {
      headers: {
        'X-API-KEY': apiKey || '',
      },
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message, data: null },
      { status: 500 }
    );
  }
}


export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('X-API-KEY');
    if (!apiKey) {
      return NextResponse.json({
        error: 'Missing X-API-KEY. Either generate an API Key. Contact Kaapi team for more details'
      },
        {
          status: 401
        }

      )
    }
    const body=await request.json();
    const backendUrl=process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

    const response=await fetch(`${backendUrl}/api/v1/configs/`, {
      method:'POST',
      body:JSON.stringify(body),
      headers:{
        'X-API-KEY':apiKey,
        'Content-Type':'application/json'
      },
    });
    const data=await response.json();
    return NextResponse.json(data, {status:response.status})



  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      {error:'Failed to forward request', details:error.message},
      {status:500}
    );
  }

}