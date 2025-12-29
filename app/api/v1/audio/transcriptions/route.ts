/**
 * Audio Transcriptions API Route
 *
 * POST: Transcribe audio files using multiple STT providers/models
 *
 * Request body:
 * {
 *   "files": [
 *     {
 *       "file_id": "abc123",
 *       "audio_base64": "base64_encoded_audio..."
 *     }
 *   ],
 *   "providers": [
 *     {"provider": "openai", "model": "gpt-4o-transcribe"},
 *     {"provider": "gemini", "model": "gemini-2.5-flash"}
 *   ]
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "success": [...transcription results...],
 *     "errors": [...failed transcriptions...],
 *     "total_tasks": 8,
 *     "processed": 8,
 *     "failed": 0
 *   }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

interface AudioFile {
  file_id: string;
  audio_base64: string;
}

interface Provider {
  provider: string;
  model: string;
}

interface TranscriptionRequest {
  files: AudioFile[];
  providers: Provider[];
}

interface TranscriptionResult {
  status: 'success' | 'error';
  file_id: string;
  ground_truth: string | null;
  provider: string;
  model: string;
  transcript?: string;
  error?: string;
}

interface TranscriptionResponse {
  success: boolean;
  data: {
    success: TranscriptionResult[];
    errors: TranscriptionResult[];
    total_tasks: number;
    processed: number;
    failed: number;
  };
  error: string | null;
  metadata: Record<string, unknown> | null;
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('X-API-KEY');

    if (!apiKey) {
      console.error('[Audio Transcriptions] Missing API key');
      return NextResponse.json(
        {
          success: false,
          error: 'API key is required',
          data: null,
          metadata: null
        },
        { status: 401 }
      );
    }

    const body: TranscriptionRequest = await request.json();

    // Validate request body
    if (!body.files || !Array.isArray(body.files) || body.files.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'At least one audio file is required',
          data: null,
          metadata: null
        },
        { status: 400 }
      );
    }

    if (!body.providers || !Array.isArray(body.providers) || body.providers.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'At least one provider/model is required',
          data: null,
          metadata: null
        },
        { status: 400 }
      );
    }

    // Validate each file has required fields
    for (const file of body.files) {
      if (!file.file_id || !file.audio_base64) {
        return NextResponse.json(
          {
            success: false,
            error: 'Each file must have file_id and audio_base64',
            data: null,
            metadata: null
          },
          { status: 400 }
        );
      }
    }

    // Validate each provider has required fields
    for (const provider of body.providers) {
      if (!provider.provider || !provider.model) {
        return NextResponse.json(
          {
            success: false,
            error: 'Each provider must have provider and model fields',
            data: null,
            metadata: null
          },
          { status: 400 }
        );
      }
    }

    console.log('[Audio Transcriptions] Processing request:', {
      fileCount: body.files.length,
      providerCount: body.providers.length,
      totalTasks: body.files.length * body.providers.length,
    });

    // Forward the request to the backend
    const response = await fetch(`${BACKEND_URL}/api/v1/audio/transcriptions`, {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    console.log('[Audio Transcriptions] Backend response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('[Audio Transcriptions] Backend error:', errorData);
      return NextResponse.json(
        {
          success: false,
          error: errorData.error || errorData.detail || 'Backend error',
          data: null,
          metadata: null
        },
        { status: response.status }
      );
    }

    const data: TranscriptionResponse = await response.json();

    console.log('[Audio Transcriptions] Success:', {
      totalTasks: data.data?.total_tasks,
      processed: data.data?.processed,
      failed: data.data?.failed,
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('[Audio Transcriptions] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process transcription request',
        data: null,
        metadata: null
      },
      { status: 500 }
    );
  }
}
