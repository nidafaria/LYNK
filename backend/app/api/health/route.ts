import { NextResponse } from "next/server";
import {
	provider,
	signer,
	getWalletAddress,
	getNativeBalance,
} from "@/lib/blockchain/provider";

const CORS_HEADERS = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET,POST,OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
	return NextResponse.json({}, { headers: CORS_HEADERS });
}

export async function GET() {
	try {
		const blockNumber = await provider.getBlockNumber();
		const network = await provider.getNetwork();

		const walletAddress = await getWalletAddress();

		const balance = await getNativeBalance(walletAddress);

		return NextResponse.json(
			{
			success: true,
			blockNumber,
			chainId: Number(network.chainId),
			walletAddress,
			balance,
			},
			{
				headers: CORS_HEADERS,
			}
		);
	} catch (error) {
		console.error(error);

		return NextResponse.json(
			{
				success: false,
				error: String(error),
			},
			{
				headers: CORS_HEADERS,
			}
		);
	}
}
