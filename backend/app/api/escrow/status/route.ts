import { NextResponse } from "next/server";
import { ethers } from "ethers";
import { provider, signer } from "@/lib/blockchain/provider";

const ESCROW_ABI = [
	"function getEscrowDetails() view returns (address buyer, address seller, uint256 amount, bool released, bool disputed, uint256 createdAt)"
];

const DEV_FRONTEND_ORIGIN = "http://localhost:3001";
const CORS_HEADERS = {
	"Access-Control-Allow-Origin": DEV_FRONTEND_ORIGIN,
	"Access-Control-Allow-Methods": "GET,OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type, Authorization"
};

function toSafeNumberString(value: bigint): number | string {
	if (value <= BigInt(Number.MAX_SAFE_INTEGER)) {
		return Number(value);
	}
	return value.toString();
}

export async function GET() {
	console.log("[API] /api/escrow/status hit");

	try {
		const escrowAddress = process.env.QIE_ESCROW_CONTRACT;
		if (!escrowAddress) {
			throw new Error("QIE_ESCROW_CONTRACT is not set");
		}

		const runner = provider ?? signer;
		const contract = new ethers.Contract(escrowAddress, ESCROW_ABI, runner);

		const [buyer, seller, amount, released, disputed, createdAt] =
			await contract.getEscrowDetails();

		const escrow = {
			buyer,
			seller,
			amount: ethers.formatEther(amount as bigint),
			released: Boolean(released),
			disputed: Boolean(disputed),
			createdAt: toSafeNumberString(createdAt as bigint)
		};

		console.log("[API] Escrow read success", {
			contract: escrowAddress,
			buyer,
			seller
		});

		return NextResponse.json(
			{ success: true, escrow },
			{ headers: CORS_HEADERS }
		);
	} catch (error: any) {
		console.error(
			"[API] Escrow read failure",
			error?.message || error
		);
		return NextResponse.json(
			{
				success: false,
				error: error?.message || "Unknown error"
			},
			{ status: 500, headers: CORS_HEADERS }
		);
	}
}

export async function OPTIONS() {
	return new NextResponse(null, {
		status: 204,
		headers: CORS_HEADERS
	});
}
