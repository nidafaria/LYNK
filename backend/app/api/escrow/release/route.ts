import { NextResponse } from "next/server";
import { ethers } from "ethers";
import { provider, signer } from "@/lib/blockchain/provider";

const ESCROW_ABI = [
  "function deposit() external payable",
  "function releaseFunds() external",
  "function openDispute() external",
];

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS });
}

export async function POST() {
  const contractAddress = process.env.QIE_ESCROW_CONTRACT;
  if (!contractAddress) {
    return NextResponse.json(
      { success: false, error: "QIE_ESCROW_CONTRACT is not set" },
      { status: 500, headers: CORS_HEADERS }
    );
  }

  try {
    console.log("[escrow:release] Starting release transaction");

    const contract = new ethers.Contract(contractAddress, ESCROW_ABI, signer);
    const tx = await contract.releaseFunds();

    console.log("[escrow:release] Submitted tx", tx.hash);
    const receipt = await tx.wait();
    console.log("[escrow:release] Confirmed tx", receipt?.hash);

    const blockNumber = await provider.getBlockNumber();

    return NextResponse.json({
      success: true,
      txHash: tx.hash,
      contract: contractAddress,
      blockNumber,
    }, { headers: CORS_HEADERS });
  } catch (error) {
    console.error("[escrow:release] Error", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
