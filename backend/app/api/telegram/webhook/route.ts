// backend/app/api/telegram/webhook/route.ts
import type { NextRequest } from 'next/server';
import { ethers } from 'ethers';

import { parseCommand } from '@/lib/commands/parser';
import { provider } from '@/lib/blockchain/provider';
import { getUserWallet, getUserDisplayBalance, deductBalance, addBalance, recordTransaction } from '@/lib/blockchain/walletService';
import { buyWithWallet, releaseWithWallet, disputeWithWallet } from '@/lib/blockchain/contract';
import { createDeal, getActiveDealForUser, updateDealContract, addTrackingToDeal, completeDeal, openDispute, resolveDispute, getUserDeals } from '@/lib/deal/dealService';
import { createDepositRequest } from '@/lib/deposit/depositService';
import { sendMessage, sendMarkdownMessage } from '@/services/telegram';
import { arbitrateDispute, storeMessage } from '@/lib/ai/arbitrator';
import { supabase } from '@/lib/db/supabase';

const DEMO_MODE = process.env.DEMO_MODE === 'true';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    
    if (!payload.message) {
      return new Response('OK', { status: 200 });
    }
    
    const message = payload.message;
    
    if (!message.text && !message.caption) {
      return new Response('OK', { status: 200 });
    }
    
    const user = message.from;
    const chatId = message.chat.id;
    const telegramId = user.id;
    let text = (message.text || message.caption || "").trim();
    
    const botUsername = process.env.TELEGRAM_BOT_USERNAME;
    if (botUsername && text.includes(`@${botUsername}`)) {
      text = text.replace(`@${botUsername}`, '').trim();
    }
    
    const lowerText = text.toLowerCase();
    console.log(`[Webhook] ${user.username || user.id}: ${text}`);
    
    // ============ HELP ============
    if (lowerText === '/start' || lowerText === 'help') {
      const balance = await getUserDisplayBalance(telegramId);
      await sendMarkdownMessage(chatId,
        `*🤝 LYNK Escrow Bot*\n\n` +
        `*Balance:* \`${balance} QIE\`\n\n` +
        `*Commands:*\n` +
        `\`BALANCE\` - Check wallet\n` +
        `\`DEPOSIT <amount>\` - Add funds\n` +
        `\`BUY <amount>\` - Buy (reply to seller)\n` +
        `\`OK\` - Confirm receipt\n` +
        `\`DISPUTE <reason>\` - Open dispute\n` +
        `\`TRACK <number>\` - Add tracking\n` +
        `\`MY_DEALS\` - View deals\n\n` +
        `*Selling?* Just type: \`Selling X for 10 QIE\``
      );
      return new Response('OK', { status: 200 });
    }
    
    // ============ BALANCE ============
    if (lowerText === 'balance') {
      const wallet = await getUserWallet(telegramId);
      const balance = await getUserDisplayBalance(telegramId);
      await sendMarkdownMessage(chatId,
        `*💰 Your Wallet*\n\n` +
        `Balance: \`${balance} QIE\``
      );
      return new Response('OK', { status: 200 });
    }
    
    // ============ DEPOSIT ============
    if (lowerText.startsWith('deposit')) {
      const amountMatch = text.match(/(\d+(?:\.\d+)?)/);
      const amount = amountMatch ? amountMatch[1] : '10';
      await sendMessage(chatId, `💳 Adding ${amount} QIE...`);
      const { newBalance } = await createDepositRequest(telegramId, amount);
      await sendMarkdownMessage(chatId, `*✅ Added \`${amount} QIE\`*\nNew balance: \`${newBalance} QIE\``);
      return new Response('OK', { status: 200 });
    }
    
    // ============ MY DEALS ============
    if (lowerText === 'my_deals' || lowerText === 'mydeals' || lowerText === 'deals') {
      const deals = await getUserDeals(telegramId);
      if (deals.length === 0) {
        await sendMessage(chatId, "📭 No deals yet. Try `BUY 5`");
        return new Response('OK', { status: 200 });
      }
      let msg = "*📋 Your Deals*\n\n";
      for (const deal of deals.slice(0, 5)) {
        const role = deal.buyerTelegramId === telegramId ? "Buyer" : "Seller";
        msg += `• ${deal.dealId.slice(-8)}: ${role} | ${deal.amount} QIE | ${deal.status}\n`;
      }
      await sendMarkdownMessage(chatId, msg);
      return new Response('OK', { status: 200 });
    }
    
    // ============ TRACK ============
    if (lowerText.startsWith('track')) {
      const trackingMatch = text.match(/track\s+(\S+)/i);
      const trackingId = trackingMatch ? trackingMatch[1] : null;
      if (!trackingId) {
        await sendMessage(chatId, "Usage: `TRACK <number>`");
        return new Response('OK', { status: 200 });
      }
      const activeDeal = await getActiveDealForUser(telegramId);
      if (!activeDeal) {
        await sendMessage(chatId, "No active deal");
        return new Response('OK', { status: 200 });
      }
      await addTrackingToDeal(activeDeal.dealId, trackingId);
      await sendMessage(chatId, `📦 Tracking added: ${trackingId}`);
      return new Response('OK', { status: 200 });
    }
    
    // ============ RELEASE ============
    if (lowerText === 'ok' || lowerText === 'release') {
      const activeDeal = await getActiveDealForUser(telegramId);
      if (!activeDeal) {
        await sendMessage(chatId, "No active deal");
        return new Response('OK', { status: 200 });
      }
      if (activeDeal.buyerTelegramId !== telegramId) {
        await sendMessage(chatId, "Only buyer can release");
        return new Response('OK', { status: 200 });
      }
      await sendMessage(chatId, "🔓 Releasing...");
      try {
        const buyerWallet = await getUserWallet(telegramId);
        const { txHash } = await releaseWithWallet(buyerWallet);
        
        if (activeDeal.sellerTelegramId && activeDeal.sellerTelegramId !== 0) {
          await addBalance(activeDeal.sellerTelegramId, activeDeal.amount);
        }
        
        await completeDeal(activeDeal.dealId);
        await sendMarkdownMessage(chatId, `*✅ Released ${activeDeal.amount} QIE to seller*`);
      } catch (error: any) {
        await sendMessage(chatId, `❌ Error: ${error.message}`);
      }
      return new Response('OK', { status: 200 });
    }
    
    // ============ DISPUTE ============
    if (lowerText.startsWith('dispute')) {
      const activeDeal = await getActiveDealForUser(telegramId);
      if (!activeDeal) {
        await sendMessage(chatId, "No active deal");
        return new Response('OK', { status: 200 });
      }
      const reason = text.replace(/dispute/i, '').trim() || "No reason";
      
      // STEP 1: Mark deal as disputed in database
      await openDispute(activeDeal.dealId, reason);
      
      // STEP 2: Trigger on-chain dispute (non-blocking — proceed even if it fails)
      try {
        const userWallet = await getUserWallet(telegramId);
        await disputeWithWallet(userWallet);
      } catch (chainError: any) {
        console.warn(`[Webhook] On-chain dispute failed (continuing): ${chainError.message}`);
      }
      
      // STEP 3: Notify user (non-blocking — Telegram may be unreachable in test mode)
      try {
        await sendMessage(chatId, `⚖️ Dispute opened: "${reason}"\n🤖 AI analyzing...`);
      } catch (notifyError: any) {
        console.warn(`[Webhook] Telegram notify failed (continuing): ${notifyError.message}`);
      }
      
      // STEP 4: AI arbitration
      const { ruling, confidence, reasoning } = await arbitrateDispute({
        dealId: activeDeal.dealId,
        buyerMessage: reason,
        sellerMessage: "No response",
        itemDescription: "Item",
        amount: activeDeal.amount,
      });
      
      let dbRuling: 'BUYER' | 'SELLER' | 'SPLIT';
      let rulingText = "";
      switch (ruling) {
        case 'BUYER_WINS': dbRuling = 'BUYER'; rulingText = "🏆 BUYER WINS"; break;
        case 'SELLER_WINS': dbRuling = 'SELLER'; rulingText = "🏆 SELLER WINS"; break;
        default: dbRuling = 'SPLIT'; rulingText = "🤝 SPLIT 50/50";
      }
      
      // STEP 5: Persist ruling to database
      await resolveDispute(activeDeal.dealId, dbRuling, confidence, reasoning);
      console.log(`[Webhook] Dispute resolved: ${activeDeal.dealId} -> ${dbRuling} (confidence: ${confidence})`);
      
      // STEP 6: Send ruling to user (non-blocking)
      try {
        await sendMarkdownMessage(chatId, `*⚖️ Ruling: ${rulingText}*\nConfidence: ${Math.round(confidence * 100)}%\n${reasoning}`);
      } catch (notifyError: any) {
        console.warn(`[Webhook] Telegram ruling notification failed (dispute persisted): ${notifyError.message}`);
      }
      return new Response('OK', { status: 200 });
    }
    
    // ============ BUY ============
    if (lowerText.startsWith('buy')) {
      let amount = '0.01';
      const amountMatch = text.match(/buy\s+(\d+(?:\.\d+)?)/i);
      if (amountMatch) amount = amountMatch[1];
      
      const existingDeal = await getActiveDealForUser(telegramId);
      if (existingDeal && existingDeal.status !== 'completed') {
        await sendMessage(chatId, `⚠️ Active deal exists: ${existingDeal.dealId}`);
        return new Response('OK', { status: 200 });
      }
      
      const balance = await getUserDisplayBalance(telegramId);
      if (parseFloat(balance) < parseFloat(amount)) {
        await sendMessage(chatId, `❌ Need ${amount} QIE, you have ${balance}`);
        return new Response('OK', { status: 200 });
      }
      
      let sellerTelegramId: number | null = null;
      if (message.reply_to_message?.from) {
        sellerTelegramId = message.reply_to_message.from.id;
      }
      
      const deal = await createDeal(telegramId, sellerTelegramId, amount);
      const buyerWallet = await getUserWallet(telegramId);
      
      await sendMessage(chatId, "🔐 Locking funds...");
      
      try {
        const { txHash } = await buyWithWallet(buyerWallet, amount);
        await deductBalance(telegramId, amount);
        await sendMarkdownMessage(chatId,
          `*✅ Escrow Created!*\n` +
          `Amount: ${amount} QIE\n` +
          `Deal: ${deal.dealId.slice(-8)}\n\n` +
          `Seller: \`TRACK <number>\`\n` +
          `Buyer: \`OK\` when received`
        );
      } catch (error: any) {
        await sendMessage(chatId, `❌ Failed: ${error.message}`);
      }
      return new Response('OK', { status: 200 });
    }
    
    // ============ SELLER LISTING DETECTION ============
    const hasPrice = text.match(/\d+(?:\.\d+)?\s*QIE/i);
    const isSelling = text.toLowerCase().includes('sell') || text.toLowerCase().includes('selling') || text.toLowerCase().includes('for');
    
    if (hasPrice && isSelling) {
      const amountMatch = text.match(/(\d+(?:\.\d+)?)\s*QIE/i);
      const amount = amountMatch ? amountMatch[1] : '0';
      
      await sendMarkdownMessage(chatId,
        `*🛍️ Listing:* ${text}\n` +
        `Price: ${amount} QIE\n\n` +
        `Reply with \`BUY ${amount}\` to purchase`
      );
      return new Response('OK', { status: 200 });
    }
    
    // ============ UNKNOWN ============
    await sendMessage(chatId, `Unknown command. Try \`/start\``);
    return new Response('OK', { status: 200 });

  } catch (error: any) {
    console.error('[Webhook] Error:', error);
    return new Response('OK', { status: 200 });
  }
}