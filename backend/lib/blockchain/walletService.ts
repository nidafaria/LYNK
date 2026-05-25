// backend/lib/blockchain/walletService.ts
import { ethers } from 'ethers';
import { provider } from './provider';
import { supabase } from '../db/supabase';
import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!;
const DEMO_MODE = process.env.DEMO_MODE === 'true';
const DEMO_FAUCET_AMOUNT = parseFloat(process.env.DEMO_FAUCET_AMOUNT || '10');

function encryptPrivateKey(privateKey: string): string {
  return CryptoJS.AES.encrypt(privateKey, ENCRYPTION_KEY).toString();
}

function decryptPrivateKey(encryptedKey: string): string {
  const bytes = CryptoJS.AES.decrypt(encryptedKey, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

// Get or create wallet for a Telegram user
export async function getUserWallet(telegramId: number) {
  console.log(`[Wallet] getUserWallet for ${telegramId}`);
  
  // Check if user exists
  const { data: existingUser, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', telegramId)
    .maybeSingle();

  if (fetchError) {
    console.error('[Wallet] Fetch error:', fetchError);
  }

  if (existingUser) {
    console.log(`[Wallet] Existing user found: ${existingUser.wallet_address}`);
    const privateKey = decryptPrivateKey(existingUser.encrypted_private_key);
    return new ethers.Wallet(privateKey, provider);
  }

  // Create new wallet for user
  console.log(`[Wallet] Creating NEW wallet for user ${telegramId}`);
  const newWallet = ethers.Wallet.createRandom();
  const encryptedKey = encryptPrivateKey(newWallet.privateKey);

  const { error: insertError } = await supabase.from('users').insert({
    telegram_id: telegramId,
    wallet_address: newWallet.address,
    encrypted_private_key: encryptedKey,
    wallet_balance: DEMO_MODE ? String(DEMO_FAUCET_AMOUNT) : '0',
    created_at: new Date().toISOString(),
    last_active: new Date().toISOString(),
  });

  if (insertError) {
    console.error('[Wallet] Insert error:', insertError);
    throw new Error(`Failed to save wallet: ${insertError.message}`);
  }

  // Also create a demo deposit record
  if (DEMO_MODE) {
    await supabase.from('deposits').insert({
      user_telegram_id: telegramId,
      amount_usd: String(DEMO_FAUCET_AMOUNT),
      amount_qie: String(DEMO_FAUCET_AMOUNT),
      status: 'completed',
      created_at: new Date().toISOString(),
    });
  }

  console.log(`[Wallet] Created wallet ${newWallet.address} for user ${telegramId} with balance ${DEMO_FAUCET_AMOUNT}`);
  return newWallet;
}

// Get user's wallet address only
export async function getUserWalletAddress(telegramId: number): Promise<string | null> {
  const { data: user } = await supabase
    .from('users')
    .select('wallet_address')
    .eq('telegram_id', telegramId)
    .maybeSingle();
  
  return user?.wallet_address || null;
}

// Get user's balance from blockchain (real)
export async function getUserBalance(telegramId: number): Promise<string> {
  try {
    const wallet = await getUserWallet(telegramId);
    const balance = await provider.getBalance(wallet.address);
    return ethers.formatEther(balance);
  } catch (error) {
    console.error('[Wallet] getUserBalance error:', error);
    return '0';
  }
}

// Get user's display balance from database (for demo mode)
export async function getUserDisplayBalance(telegramId: number): Promise<string> {
  if (!DEMO_MODE) {
    return await getUserBalance(telegramId);
  }
  
  const { data: user, error } = await supabase
    .from('users')
    .select('wallet_balance')
    .eq('telegram_id', telegramId)
    .maybeSingle();
  
  if (error) {
    console.error('[Wallet] getUserDisplayBalance error:', error);
    return '0';
  }
  
  const balance = user?.wallet_balance || '0';
  console.log(`[Wallet] getUserDisplayBalance(${telegramId}) = ${balance}`);
  return balance;
}

// Update user's balance in database
export async function updateUserBalance(telegramId: number, newBalance: string): Promise<boolean> {
  console.log(`[Wallet] updateUserBalance(${telegramId}, ${newBalance})`);
  
  const { error } = await supabase
    .from('users')
    .update({ 
      wallet_balance: newBalance,
      last_active: new Date().toISOString()
    })
    .eq('telegram_id', telegramId);
  
  if (error) {
    console.error('[Wallet] Update failed:', error);
    return false;
  }
  
  // Verify the update
  const { data: verify } = await supabase
    .from('users')
    .select('wallet_balance')
    .eq('telegram_id', telegramId)
    .maybeSingle();
  
  console.log(`[Wallet] Verification - balance is now: ${verify?.wallet_balance}`);
  return verify?.wallet_balance === newBalance;
}

// Add balance after deposit
// Add this to walletService.ts if not present
export async function addBalance(telegramId: number, amount: string): Promise<boolean> {
  if (!DEMO_MODE) return true;
  
  // Ensure user exists
  await getUserWallet(telegramId);
  
  const currentBalance = await getUserDisplayBalance(telegramId);
  const currentNum = parseFloat(currentBalance) || 0;
  const amountNum = parseFloat(amount);
  const newBalance = currentNum + amountNum;
  
  console.log(`[Wallet] addBalance: ${currentNum} + ${amountNum} = ${newBalance}`);
  
  return await updateUserBalance(telegramId, String(newBalance));
}

// Deduct balance after buy
export async function deductBalance(telegramId: number, amount: string): Promise<boolean> {
  if (!DEMO_MODE) return true;
  
  // Ensure user exists
  await getUserWallet(telegramId);
  
  const currentBalance = await getUserDisplayBalance(telegramId);
  const currentNum = parseFloat(currentBalance) || 0;
  const amountNum = parseFloat(amount);
  const newBalance = currentNum - amountNum;
  
  if (newBalance < 0) {
    console.log(`[Wallet] deductBalance failed: insufficient balance ${currentNum} < ${amountNum}`);
    return false;
  }
  
  console.log(`[Wallet] deductBalance: ${currentNum} - ${amountNum} = ${newBalance}`);
  
  return await updateUserBalance(telegramId, String(newBalance));
}

// Record transaction for audit
export async function recordTransaction(
  dealId: string,
  userTelegramId: number,
  action: string,
  txHash: string
): Promise<void> {
  await supabase.from('transactions').insert({
    deal_id: dealId,
    user_telegram_id: userTelegramId,
    action: action,
    tx_hash: txHash,
    created_at: new Date().toISOString(),
  });
  console.log(`[Wallet] Transaction recorded: ${action} for user ${userTelegramId}`);
}