// backend/lib/blockchain/contract.ts
import { ethers } from 'ethers';
import { provider } from './provider';

const DEMO_MODE = process.env.DEMO_MODE === 'true';

const ESCROW_ABI = [
  'function deposit() external payable',
  'function releaseFunds() external',
  'function openDispute() external',
];

const CONTRACT_ADDRESS = process.env.QIE_ESCROW_CONTRACT!;

export function getEscrowContract(signer?: ethers.Signer) {
  if (signer) {
    return new ethers.Contract(CONTRACT_ADDRESS, ESCROW_ABI, signer);
  }
  return new ethers.Contract(CONTRACT_ADDRESS, ESCROW_ABI, provider);
}

// BUY - Lock funds in escrow
export async function buyWithWallet(
  buyerWallet: ethers.Wallet | ethers.HDNodeWallet,
  amountInQIE: string
): Promise<{ txHash: string; blockNumber: number }>{
  
  // DEMO MODE: Mock transaction
  if (DEMO_MODE) {
    console.log(`[DEMO] BUY: ${amountInQIE} QIE from ${buyerWallet.address}`);
    return {
      txHash: `0xDEMO_BUY_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      blockNumber: 12345678,
    };
  }
  
  // REAL MODE: Actual blockchain transaction
  const contract = getEscrowContract(buyerWallet);
  const amountWei = ethers.parseEther(amountInQIE);
  const tx = await contract.deposit({ value: amountWei });
  const receipt = await tx.wait();
  
  return {
    txHash: tx.hash,
    blockNumber: receipt?.blockNumber ?? 0,
  };
}

// RELEASE - Release funds to seller
export async function releaseWithWallet(
  buyerWallet: ethers.Wallet | ethers.HDNodeWallet
): Promise<{ txHash: string; blockNumber: number }> {
  
  // DEMO MODE: Mock transaction
  if (DEMO_MODE) {
    console.log(`[DEMO] RELEASE from ${buyerWallet.address}`);
    return {
      txHash: `0xDEMO_RELEASE_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      blockNumber: 12345679,
    };
  }
  
  // REAL MODE: Actual blockchain transaction
  const contract = getEscrowContract(buyerWallet);
  const tx = await contract.releaseFunds();
  const receipt = await tx.wait();
  
  return {
    txHash: tx.hash,
    blockNumber: receipt?.blockNumber ?? 0,
  };
}

// DISPUTE - Open dispute
export async function disputeWithWallet(
  buyerWallet: ethers.Wallet | ethers.HDNodeWallet
): Promise<{ txHash: string; blockNumber: number }> {
  
  // DEMO MODE: Mock transaction
  if (DEMO_MODE) {
    console.log(`[DEMO] DISPUTE from ${buyerWallet.address}`);
    return {
      txHash: `0xDEMO_DISPUTE_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      blockNumber: 12345680,
    };
  }
  
  // REAL MODE: Actual blockchain transaction
  const contract = getEscrowContract(buyerWallet);
  const tx = await contract.openDispute();
  const receipt = await tx.wait();
  
  return {
    txHash: tx.hash,
    blockNumber: receipt?.blockNumber ?? 0,
  };
}