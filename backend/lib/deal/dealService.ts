import { supabase } from '../db/supabase';

export interface Deal {
  dealId: string;
  buyerTelegramId: number;
  sellerTelegramId: number | null;
  amount: string;
  status: string;
  contractAddress: string | null;
  trackingNumber: string | null;
  disputeReason?: string;
  disputeRuling?: string;
}

function generateDealId(): string {
  return `deal_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
}

// Create new deal
export async function createDeal(
  buyerTelegramId: number,
  sellerTelegramId: number | null,
  amount: string
): Promise<Deal> {
  const dealId = generateDealId();

  const { data, error } = await supabase
    .from('deals')
    .insert({
      deal_id: dealId,
      buyer_telegram_id: buyerTelegramId,
      seller_telegram_id: sellerTelegramId,
      amount: amount,
      status: 'pending_funding',
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create deal: ${error.message}`);

  return {
    dealId: data.deal_id,
    buyerTelegramId: data.buyer_telegram_id,
    sellerTelegramId: data.seller_telegram_id,
    amount: data.amount,
    status: data.status,
    contractAddress: data.contract_address,
    trackingNumber: data.tracking_number,
  };
}

// Get active deal for user (most recent non-completed)
export async function getActiveDealForUser(telegramId: number): Promise<Deal | null> {
  const { data } = await supabase
    .from('deals')
    .select('*')
    .or(`buyer_telegram_id.eq.${telegramId},seller_telegram_id.eq.${telegramId}`)
    .not('status', 'in', '("completed","resolved","cancelled")')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!data) return null;

  return {
    dealId: data.deal_id,
    buyerTelegramId: data.buyer_telegram_id,
    sellerTelegramId: data.seller_telegram_id,
    amount: data.amount,
    status: data.status,
    contractAddress: data.contract_address,
    trackingNumber: data.tracking_number,
    disputeReason: data.dispute_reason,
    disputeRuling: data.dispute_ruling,
  };
}

// Get all deals for a user
export async function getUserDeals(telegramId: number): Promise<Deal[]> {
  const { data } = await supabase
    .from('deals')
    .select('*')
    .or(`buyer_telegram_id.eq.${telegramId},seller_telegram_id.eq.${telegramId}`)
    .order('created_at', { ascending: false });

  return (data || []).map(d => ({
    dealId: d.deal_id,
    buyerTelegramId: d.buyer_telegram_id,
    sellerTelegramId: d.seller_telegram_id,
    amount: d.amount,
    status: d.status,
    contractAddress: d.contract_address,
    trackingNumber: d.tracking_number,
  }));
}

// Update deal status
export async function updateDealStatus(dealId: string, status: string): Promise<void> {
  await supabase
    .from('deals')
    .update({ status, updated_at: new Date() })
    .eq('deal_id', dealId);
}

// Update deal with contract address
export async function updateDealContract(dealId: string, contractAddress: string): Promise<void> {
  await supabase
    .from('deals')
    .update({ contract_address: contractAddress, status: 'funded', updated_at: new Date() })
    .eq('deal_id', dealId);
}

// Add tracking to deal
export async function addTrackingToDeal(dealId: string, trackingNumber: string): Promise<void> {
  await supabase
    .from('deals')
    .update({ tracking_number: trackingNumber, status: 'shipped', updated_at: new Date() })
    .eq('deal_id', dealId);
}

// Open dispute
export async function openDispute(dealId: string, reason: string): Promise<void> {
  await supabase
    .from('deals')
    .update({ status: 'disputed', dispute_reason: reason, updated_at: new Date() })
    .eq('deal_id', dealId);
}

// Resolve dispute
export async function resolveDispute(dealId: string, ruling: 'BUYER' | 'SELLER' | 'SPLIT'): Promise<void> {
  await supabase
    .from('deals')
    .update({ status: 'resolved', dispute_ruling: ruling, updated_at: new Date() })
    .eq('deal_id', dealId);
}

// Complete deal
export async function completeDeal(dealId: string): Promise<void> {
  await supabase
    .from('deals')
    .update({ status: 'completed', updated_at: new Date() })
    .eq('deal_id', dealId);
}