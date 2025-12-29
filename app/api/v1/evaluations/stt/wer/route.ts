/**
 * WER (Word Error Rate) Evaluation API Route
 *
 * POST: Calculate WER between ground truth and hypothesis transcriptions
 *
 * Request body:
 * {
 *   "items": [
 *     {
 *       "id": "unique_id",
 *       "ground_truth": "reference text",
 *       "hypothesis": "transcribed text",
 *       "model": "provider/model-name"
 *     }
 *   ],
 *   "mode": "both" // "strict", "lenient", or "both"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "results": [...per item WER results...],
 *     "summary": { strict: {...}, lenient: {...} },
 *     "total_items": 2,
 *     "processed": 2
 *   }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

interface WerItem {
  id: string;
  ground_truth: string;
  hypothesis: string;
  model?: string;
}

interface WerRequest {
  items: WerItem[];
  mode?: 'strict' | 'lenient' | 'both';
}

interface WerMetrics {
  wer: number;
  substitutions: number;
  deletions: number;
  insertions: number;
  semantic_errors: number;
  reference_word_count: number;
  hypothesis_word_count: number;
}

interface WerResult {
  id: string;
  ground_truth: string;
  hypothesis: string;
  strict: WerMetrics;
  lenient: WerMetrics;
}

interface WerSummary {
  avg_wer: number;
  min_wer: number;
  max_wer: number;
  avg_substitutions: number;
  avg_deletions: number;
  avg_insertions: number;
  avg_semantic_errors: number;
  total_reference_words: number;
  total_hypothesis_words: number;
}

interface WerResponse {
  success: boolean;
  data: {
    results: WerResult[];
    summary: {
      strict: WerSummary;
      lenient: WerSummary;
    };
    total_items: number;
    processed: number;
  };
  error: string | null;
  metadata: Record<string, unknown> | null;
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('X-API-KEY');

    if (!apiKey) {
      console.error('[WER Evaluation] Missing API key');
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

    const body: WerRequest = await request.json();

    // Validate request body
    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'At least one item is required',
          data: null,
          metadata: null
        },
        { status: 400 }
      );
    }

    // Validate each item has required fields
    for (const item of body.items) {
      if (!item.id || item.ground_truth === undefined || item.hypothesis === undefined) {
        return NextResponse.json(
          {
            success: false,
            error: 'Each item must have id, ground_truth, and hypothesis',
            data: null,
            metadata: null
          },
          { status: 400 }
        );
      }
    }

    console.log('[WER Evaluation] Processing request:', {
      itemCount: body.items.length,
    });

    // Forward the request to the backend
    const response = await fetch(`${BACKEND_URL}/api/v1/evaluations/stt/wer`, {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    console.log('[WER Evaluation] Backend response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('[WER Evaluation] Backend error:', errorData);
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

    const data: WerResponse = await response.json();

    console.log('[WER Evaluation] Success:', {
      totalItems: data.data?.total_items,
      processed: data.data?.processed,
      avgStrictWer: data.data?.summary?.strict?.avg_wer,
      avgLenientWer: data.data?.summary?.lenient?.avg_wer,
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('[WER Evaluation] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process WER evaluation request',
        data: null,
        metadata: null
      },
      { status: 500 }
    );
  }
}
