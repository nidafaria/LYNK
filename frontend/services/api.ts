import axios from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

if (!BASE_URL) {
	console.warn("[frontend] NEXT_PUBLIC_BACKEND_URL is not set");
}

export interface BackendHealthResponse {
	success: boolean;
	blockNumber?: number;
	walletAddress?: string;
	balance?: string;
	error?: string;
}

// ─── Telegram Telemetry Types (single source of truth) ───────

export interface TelegramTelemetry {
	lastCommand: string | null;
	lastMessage: string | null;
	lastUser: string | null;
	lastTimestamp: number | null;
	webhookConnected: boolean;
	botReachable: boolean;
	totalMessages: number;
}

export interface TelegramStatusResponse {
	success: boolean;
	telemetry?: TelegramTelemetry;
	error?: string;
}

// ─── Deal Types ───────────────────────────────────────────────

export interface DealRecord {
  dealId: string;
  buyerTelegramId: number;
  sellerTelegramId: number | null;
  amount: string;
  status: string;
  contractAddress: string | null;
  trackingNumber: string | null;
  createdAt: string | null;
}

export interface DealsResponse {
  success: boolean;
  data: DealRecord[];
}

// ─── Dispute Types (mirrors backend DisputeRecord) ────────────

export interface DisputeRecord {
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

export interface DisputesResponse {
  success: boolean;
  data: DisputeRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function fetchBackendHealth(): Promise<BackendHealthResponse> {
	if (!BASE_URL) {
		return { success: false, error: "Missing NEXT_PUBLIC_BACKEND_URL" };
	}
	const res = await axios.get<BackendHealthResponse>(`${BASE_URL}/api/health`);
	return res.data;
}
