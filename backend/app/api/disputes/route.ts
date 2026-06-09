import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db/supabase';

// ─── Types ────────────────────────────────────────────────────────────────

interface DisputeRecord {
  dealId: string;
  buyer: number;
  seller: number | null;
  amount: string;
  status: string;
  disputeRuling: string | null;
  disputeConfidence: number | null;
  disputeReasoning: string | null;
  resolvedAt: string | null;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface DisputesResponse {
  success: boolean;
  data: DisputeRecord[];
  pagination: PaginationMeta;
}

interface ErrorResponse {
  success: false;
  error: string;
}

type ApiResponse = DisputesResponse | ErrorResponse;

// ─── CORS ──────────────────────────────────────────────────────────────────

const DEV_FRONTEND_ORIGIN = 'http://localhost:3001';
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': DEV_FRONTEND_ORIGIN,
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// ─── Helpers ───────────────────────────────────────────────────────────────

function parseQueryParam(
  value: string | null,
  fallback: number,
  min: number,
  max: number
): number {
  if (!value) return fallback;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed < min) return min;
  if (parsed > max) return max;
  return parsed;
}

function mapDisputeRow(row: Record<string, unknown>): DisputeRecord {
  return {
    dealId: row.deal_id as string,
    buyer: row.buyer_telegram_id as number,
    seller: row.seller_telegram_id as number | null,
    amount: row.amount as string,
    status: row.status as string,
    disputeRuling: (row.dispute_ruling as string) ?? null,
    disputeConfidence: (row.dispute_confidence as number) ?? null,
    disputeReasoning: (row.dispute_reasoning as string) ?? null,
    resolvedAt: (row.resolved_at as string) ?? null,
  };
}

// ─── Route Handler ─────────────────────────────────────────────────────────

export async function GET(request: Request): Promise<NextResponse<ApiResponse>> {
  console.log('[API] /api/disputes hit');

  try {
    const url = new URL(request.url);
    const page = parseQueryParam(url.searchParams.get('page'), 1, 1, 10_000);
    const limit = parseQueryParam(url.searchParams.get('limit'), 20, 1, 100);
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Count total dispute records (deals with a ruling)
    const { count: total, error: countError } = await supabase
      .from('deals')
      .select('*', { count: 'exact', head: true })
      .not('dispute_ruling', 'is', null);

    if (countError) {
      console.error('[API] Dispute count error:', countError);
      return NextResponse.json(
        { success: false as const, error: `Failed to count disputes: ${countError.message}` },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    const totalCount = total ?? 0;

    // Fetch paginated disputes sorted by resolved_at descending
    const { data: rows, error: fetchError } = await supabase
      .from('deals')
      .select('*')
      .not('dispute_ruling', 'is', null)
      .order('resolved_at', { ascending: false, nullsFirst: false })
      .order('updated_at', { ascending: false })
      .range(from, to);

    if (fetchError) {
      console.error('[API] Dispute fetch error:', fetchError);
      return NextResponse.json(
        { success: false as const, error: `Failed to fetch disputes: ${fetchError.message}` },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    const data = (rows || []).map(mapDisputeRow);

    const pagination: PaginationMeta = {
      page,
      limit,
      total: totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / limit)),
    };

    console.log(`[API] Disputes returned: ${data.length} rows (page ${page}/${pagination.totalPages})`);

    return NextResponse.json(
      { success: true, data, pagination },
      { headers: CORS_HEADERS }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API] Disputes unexpected error:', message);
    return NextResponse.json(
      { success: false as const, error: message },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}
