// QIE Pass - Deterministic wallet from Telegram ID
// User never sees private key. Wallet derived from Telegram ID + master seed.

import { ethers } from 'ethers';

const MASTER_SEED = process.env.QIE_PASS_SEED || 'lynk_default_seed_change_me';

// Generate deterministic wallet from Telegram ID
export function getWalletFromTelegramId(telegramId: number): { address: string; privateKey: string } {
  // Create deterministic private key from Telegram ID + seed
  const seedString = `${MASTER_SEED}:${telegramId}`;
  const seedHash = ethers.keccak256(ethers.toUtf8Bytes(seedString));
  const privateKey = seedHash;
  
  const wallet = new ethers.Wallet(privateKey);
  
  return {
    address: wallet.address,
    privateKey: privateKey,
  };
}

// Get only address (for display, no private key exposure)
export function getWalletAddressFromTelegramId(telegramId: number): string {
  const { address } = getWalletFromTelegramId(telegramId);
  return address;
}

// Get signer for a Telegram user (for signing transactions)
export function getSignerForUser(telegramId: number, provider: ethers.Provider): ethers.Wallet {
  const { privateKey } = getWalletFromTelegramId(telegramId);
  return new ethers.Wallet(privateKey, provider);
}

// Protocol wallet (system wallet for arbitration/auto-release)
export function getProtocolWallet(): ethers.Wallet {
  const protocolKey = process.env.PROTOCOL_PRIVATE_KEY;
  if (!protocolKey) throw new Error('PROTOCOL_PRIVATE_KEY not set');
  return new ethers.Wallet(protocolKey);
}

// Check if user has enough balance
export async function getUserBalance(telegramId: number, provider: ethers.Provider): Promise<string> {
  const address = getWalletAddressFromTelegramId(telegramId);
  const balance = await provider.getBalance(address);
  return ethers.formatEther(balance);
}