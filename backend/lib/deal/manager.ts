// Deal Manager - Tracks all escrow deals
// For now, in-memory. Replace with Supabase later.

export interface Deal {
  dealId: string;
  buyerTelegramId: number;
  sellerTelegramId: number;
  buyerWallet: string;
  sellerWallet: string;
  protocolWallet: string;
  contractAddress: string;
  amount: string;
  status: DealStatus;
  trackingNumber?: string;
  deliveryStatus?: 'PENDING' | 'IN_TRANSIT' | 'DELIVERED';
  createdAt: number;
  updatedAt: number;
  disputeReason?: string;
  disputeRuling?: 'BUYER' | 'SELLER' | 'SPLIT';
}

export type DealStatus = 
  | 'AWAITING_FUNDING'  // Contract created, waiting for buyer to fund
  | 'FUNDED'            // Buyer funded, seller can ship
  | 'SHIPPED'           // Seller added tracking
  | 'DELIVERED'         // Carrier confirmed delivery, 48hr timer started
  | 'COMPLETED'         // Funds released
  | 'DISPUTED'          // Dispute opened
  | 'RESOLVED';         // AI ruled, funds distributed

// In-memory storage (replace with DB)
const deals = new Map<string, Deal>();
const telegramToDeals = new Map<number, string[]>(); // Telegram ID -> deal IDs

// Generate unique deal ID
function generateDealId(): string {
  return `deal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Create new deal
export function createDeal(
  buyerTelegramId: number,
  sellerTelegramId: number,
  buyerWallet: string,
  sellerWallet: string,
  protocolWallet: string,
  contractAddress: string,
  amount: string
): Deal {
  const dealId = generateDealId();
  
  const deal: Deal = {
    dealId,
    buyerTelegramId,
    sellerTelegramId,
    buyerWallet,
    sellerWallet,
    protocolWallet,
    contractAddress,
    amount,
    status: 'AWAITING_FUNDING',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  
  deals.set(dealId, deal);
  
  // Index by Telegram IDs
  if (!telegramToDeals.has(buyerTelegramId)) telegramToDeals.set(buyerTelegramId, []);
  if (!telegramToDeals.has(sellerTelegramId)) telegramToDeals.set(sellerTelegramId, []);
  
  telegramToDeals.get(buyerTelegramId)!.push(dealId);
  telegramToDeals.get(sellerTelegramId)!.push(dealId);
  
  console.log(`[DealManager] Created deal: ${dealId}`);
  return deal;
}

// Get deal by ID
export function getDeal(dealId: string): Deal | undefined {
  return deals.get(dealId);
}

// Get all deals for a Telegram user
export function getUserDeals(telegramId: number): Deal[] {
  const dealIds = telegramToDeals.get(telegramId) || [];
  return dealIds.map(id => deals.get(id)!).filter(Boolean);
}

// Get active deal for user (most recent non-completed)
export function getActiveDealForUser(telegramId: number): Deal | undefined {
  const userDeals = getUserDeals(telegramId);
  return userDeals.find(d => d.status !== 'COMPLETED' && d.status !== 'RESOLVED');
}

// Update deal status
export function updateDealStatus(dealId: string, status: DealStatus): Deal | undefined {
  const deal = deals.get(dealId);
  if (!deal) return undefined;
  
  deal.status = status;
  deal.updatedAt = Date.now();
  deals.set(dealId, deal);
  
  console.log(`[DealManager] Deal ${dealId} status: ${status}`);
  return deal;
}

// Add tracking number
export function addTracking(dealId: string, trackingNumber: string): Deal | undefined {
  const deal = deals.get(dealId);
  if (!deal) return undefined;
  
  deal.trackingNumber = trackingNumber;
  deal.status = 'SHIPPED';
  deal.updatedAt = Date.now();
  deals.set(dealId, deal);
  
  return deal;
}

// Update delivery status (from Oracle)
export function updateDeliveryStatus(dealId: string, deliveryStatus: 'PENDING' | 'IN_TRANSIT' | 'DELIVERED'): Deal | undefined {
  const deal = deals.get(dealId);
  if (!deal) return undefined;
  
  deal.deliveryStatus = deliveryStatus;
  if (deliveryStatus === 'DELIVERED' && deal.status === 'SHIPPED') {
    deal.status = 'DELIVERED';
  }
  deal.updatedAt = Date.now();
  deals.set(dealId, deal);
  
  return deal;
}

// Open dispute
export function openDispute(dealId: string, reason: string): Deal | undefined {
  const deal = deals.get(dealId);
  if (!deal) return undefined;
  
  deal.status = 'DISPUTED';
  deal.disputeReason = reason;
  deal.updatedAt = Date.now();
  deals.set(dealId, deal);
  
  return deal;
}

// Resolve dispute with ruling
export function resolveDispute(dealId: string, ruling: 'BUYER' | 'SELLER' | 'SPLIT'): Deal | undefined {
  const deal = deals.get(dealId);
  if (!deal) return undefined;
  
  deal.status = 'RESOLVED';
  deal.disputeRuling = ruling;
  deal.updatedAt = Date.now();
  deals.set(dealId, deal);
  
  return deal;
}

// Complete deal
export function completeDeal(dealId: string): Deal | undefined {
  const deal = deals.get(dealId);
  if (!deal) return undefined;
  
  deal.status = 'COMPLETED';
  deal.updatedAt = Date.now();
  deals.set(dealId, deal);
  
  return deal;
}

// Get all deals (for dashboard)
export function getAllDeals(): Deal[] {
  return Array.from(deals.values());
}