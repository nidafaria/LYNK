// Centralized QIE blockchain provider layer for LYNK.
// This keeps RPC, signer, and connection concerns in one place.
// Future: multiple contracts, escrow deployments, multisig support.

import { ethers } from "ethers";

// --- Env Validation ---
const QIE_RPC_URL = process.env.QIE_RPC_URL;
const QIE_PRIVATE_KEY = process.env.QIE_PRIVATE_KEY;

function assertEnv(): void {
	if (!QIE_RPC_URL) {
		throw new Error("QIE_RPC_URL is not set");
	}
	if (!QIE_PRIVATE_KEY) {
		throw new Error("QIE_PRIVATE_KEY is not set");
	}
}

// --- Provider + Signer ---
// Provider handles all RPC communication with QIE.
// Signer is the wallet used to sign escrow transactions.
assertEnv();

export const provider = new ethers.JsonRpcProvider(QIE_RPC_URL);
export const signer = new ethers.Wallet(QIE_PRIVATE_KEY, provider);

console.log("[QIE] Provider initialized", { rpcUrl: QIE_RPC_URL });
console.log("[QIE] Signer wallet loaded");

// --- Helpers ---
export async function getWalletAddress(): Promise<string> {
	const address = await signer.getAddress();
	console.log("[QIE] Wallet address", { address });
	return address;
}

export async function getNativeBalance(address: string): Promise<string> {
	try {
		const balance = await provider.getBalance(address);
		const formatted = ethers.formatEther(balance);
		console.log("[QIE] Balance", { address, balance: formatted });
		return formatted;
	} catch (error: any) {
		console.error("[QIE] Balance check failed", error?.message || error);
		throw new Error("Failed to fetch balance");
	}
}

export async function testConnection(): Promise<number> {
	try {
		const blockNumber = await provider.getBlockNumber();
		console.log("[QIE] Connection OK", { blockNumber });
		return blockNumber;
	} catch (error: any) {
		console.error("[QIE] RPC connection failed", error?.message || error);
		throw new Error("Failed to connect to QIE RPC");
	}
}

// Contract helper for future escrow interactions.
export function getContract<T extends ethers.BaseContract>(
	address: string,
	abi: ethers.InterfaceAbi,
	withSigner = true
): T {
	const runner = withSigner ? signer : provider;
	return new ethers.Contract(address, abi, runner) as T;
}
