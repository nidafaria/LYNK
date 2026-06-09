import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db/supabase';

interface DealRecord {
  dealId: string;
  buyerTelegramId: number;
  sellerTelegramId: number | null;
  amount: string;
  status: string;
  contractAddress: string | null;
  trackingNumber: string | null;
  createdAt: string | null;
}

interface DealsResponse {
  success: boolean;
  data: DealRecord[];
}

interface ErrorResponse {
  success: false;
  error: string;
}

type ApiResponse = DealsResponse | ErrorResponse;

const DEV_FRONTEND_ORIGIN = 'http://localhost:3001';
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': DEV_FRONTEND_ORIGIN,
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function GET(): Promise<NextResponse<ApiResponse>> {
  console.log('[API] /api/deals hit');

  try {
    const { data: rows, error } = await supabase
      .from('deals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('[API] Deals fetch error:', error);
      return NextResponse.json(
        { success: false, error: `Failed to fetch deals: ${error.message}` },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    const data: DealRecord[] = (rows || []).map(row => ({
      dealId: row.deal_id as string,
      buyerTelegramId: row.buyer_telegram_id as number,
      sellerTelegramId: (row.seller_telegram_id as number | null) ?? null,
      amount: row.amount as string,
      status: row.status as string,
      contractAddress: (row.contract_address as string | null) ?? null,
      trackingNumber: (row.tracking_number as string | null) ?? null,
      createdAt: (row.created_at as string | null) ?? null,
    }));

    console.log(`[API] Deals returned: ${data.length} rows`);

    return NextResponse.json(
      { success: true, data },
      { headers: CORS_HEADERS }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API] Deals unexpected error:', message);
    return NextResponse.json(
      { success: false, error: message },
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
