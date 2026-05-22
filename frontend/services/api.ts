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

export async function fetchBackendHealth(): Promise<BackendHealthResponse> {
	if (!BASE_URL) {
		return { success: false, error: "Missing NEXT_PUBLIC_BACKEND_URL" };
	}
	const res = await axios.get<BackendHealthResponse>(`${BASE_URL}/api/health`);
	return res.data;
}
