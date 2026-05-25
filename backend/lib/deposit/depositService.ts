// backend/lib/deposit/depositService.ts
import { supabase } from '../db/supabase';
import { addBalance, getUserDisplayBalance, getUserWallet } from '../blockchain/walletService';

const DEMO_MODE = process.env.DEMO_MODE === 'true';

export async function createDepositRequest(
  userTelegramId: number,
  amountUSD: string
): Promise<{ depositId: number; paymentUrl: string; newBalance: string }> {
  
  console.log(`[Deposit] Creating deposit request for user ${userTelegramId}, amount $${amountUSD}`);
  
  // STEP 1: Ensure user wallet exists FIRST
  console.log(`[Deposit] Ensuring wallet exists...`);
  const wallet = await getUserWallet(userTelegramId);
  console.log(`[Deposit] Wallet ensured: ${wallet.address}`);
  
  if (DEMO_MODE) {
    const amountQIE = amountUSD; // 1 USD = 1 QIE for demo
    
    // STEP 2: Check for recent duplicate deposit (within last minute)
    const { data: recentDeposit } = await supabase
      .from('deposits')
      .select('*')
      .eq('user_telegram_id', userTelegramId)
      .eq('status', 'completed')
      .gte('created_at', new Date(Date.now() - 60000).toISOString())
      .maybeSingle();
    
    if (recentDeposit) {
      console.log(`[Deposit] Recent deposit found, skipping duplicate`);
      const currentBalance = await getUserDisplayBalance(userTelegramId);
      return {
        depositId: recentDeposit.id,
        paymentUrl: 'https://demo.lynk.com/deposit/success',
        newBalance: currentBalance,
      };
    }
    
    // STEP 3: Create deposit record
    const { data: deposit, error: depositError } = await supabase
      .from('deposits')
      .insert({
        user_telegram_id: userTelegramId,
        amount_usd: amountUSD,
        amount_qie: amountQIE,
        status: 'pending',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (depositError) {
      console.error('[Deposit] Insert error:', depositError);
      throw new Error(`Failed to create deposit record: ${depositError.message}`);
    }
    
    console.log(`[Deposit] Deposit record created: ${deposit.id}`);
    
    // STEP 4: Add balance to user's wallet
    const success = await addBalance(userTelegramId, amountQIE);
    console.log(`[Deposit] addBalance returned: ${success}`);
    
    // STEP 5: Mark deposit as completed
    await supabase
      .from('deposits')
      .update({ status: 'completed' })
      .eq('id', deposit.id);
    
    // STEP 6: Verify final balance
    const newBalance = await getUserDisplayBalance(userTelegramId);
    console.log(`[Deposit] Final balance for user ${userTelegramId}: ${newBalance} QIE`);

    return {
      depositId: deposit.id,
      paymentUrl: 'https://demo.lynk.com/deposit/success',
      newBalance: newBalance,
    };
  }

  // REAL MODE: Integrate with actual payment provider
  // This would call Stripe/Transak/MoonPay API
  return {
    depositId: Date.now(),
    paymentUrl: `https://payment.lynk.com/deposit?amount=${amountUSD}&user=${userTelegramId}`,
    newBalance: '0',
  };
}

// Handle payment webhook callback
export async function handleDepositCallback(
  depositId: number,
  status: 'completed' | 'failed'
): Promise<boolean> {
  console.log(`[Deposit] Callback received: deposit ${depositId}, status ${status}`);
  
  const { data: deposit } = await supabase
    .from('deposits')
    .select('*')
    .eq('id', depositId)
    .single();

  if (!deposit) {
    console.error(`[Deposit] Deposit ${depositId} not found`);
    return false;
  }
  
  if (deposit.status === 'completed') {
    console.log(`[Deposit] Deposit already completed, skipping`);
    return true;
  }
  
  if (status === 'completed') {
    const success = await addBalance(deposit.user_telegram_id, deposit.amount_qie);
    
    await supabase
      .from('deposits')
      .update({ status: 'completed' })
      .eq('id', depositId);
    
    return success;
  } else {
    await supabase
      .from('deposits')
      .update({ status: 'failed' })
      .eq('id', depositId);
    return false;
  }
}

// Get deposit history for a user
export async function getUserDeposits(userTelegramId: number) {
  const { data } = await supabase
    .from('deposits')
    .select('*')
    .eq('user_telegram_id', userTelegramId)
    .order('created_at', { ascending: false });
  
  return data || [];
}