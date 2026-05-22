// LYNK Telegram Webhook Entrypoint
// Main Telegram → Blockchain orchestration route

import type { NextRequest } from 'next/server';
import { ethers } from 'ethers';

import { parseCommand } from '@/lib/commands/parser';
import { provider, signer } from '@/lib/blockchain/provider';
import {
  getTelegramTelemetry,
  updateTelegramTelemetry,
} from '../../../../lib/telegram/state';

import {
  sendMessage,
  sendMarkdownMessage,
} from '@/services/telegram';

// --- Types ---

interface TelegramUser {
  id: number;
  username?: string;
}

interface TelegramMessage {
  message_id: number;
  from: TelegramUser;
  chat: {
    id: number;
  };
  date?: number;
  text?: string;
}

interface TelegramWebhookPayload {
  message?: TelegramMessage;
}

// --- Escrow Contract ABI ---

const ESCROW_ABI = [
  'function deposit() external payable',
  'function releaseFunds() external',
  'function openDispute() external',
];

// --- Contract Helper ---

function getEscrowContract() {
  const contractAddress = process.env.QIE_ESCROW_CONTRACT;

  if (!contractAddress) {
    throw new Error('QIE_ESCROW_CONTRACT is not set');
  }

  return new ethers.Contract(
    contractAddress,
    ESCROW_ABI,
    signer
  );
}

// --- Blockchain Escrow Actions ---

async function runEscrowAction(
  action: 'BUY' | 'RELEASE' | 'DISPUTE'
) {
  const contract = getEscrowContract();

  if (action === 'BUY') {
    const tx = await contract.deposit({
      value: ethers.parseEther('0.01'),
    });

    const receipt = await tx.wait();

    return {
      txHash: tx.hash,
      blockNumber: receipt?.blockNumber,
    };
  }

  if (action === 'RELEASE') {
    const tx = await contract.releaseFunds();

    const receipt = await tx.wait();

    return {
      txHash: tx.hash,
      blockNumber: receipt?.blockNumber,
    };
  }

  const tx = await contract.openDispute();

  const receipt = await tx.wait();

  return {
    txHash: tx.hash,
    blockNumber: receipt?.blockNumber,
  };
}

// --- Main Webhook Route ---

export async function POST(req: NextRequest) {
  console.log('[Webhook] Incoming Telegram webhook');

  let chatId = 0;

  try {
    const payload: TelegramWebhookPayload =
      await req.json();

    const message = payload.message;

    if (!message || !message.text) {
      console.warn(
        '[Webhook] Invalid payload',
        payload
      );

      return new Response('Invalid payload', {
        status: 400,
      });
    }

    const user = message.from;

    chatId = message.chat.id;

    const text = message.text;

    console.log(
      `[Webhook] User: ${
        user.username || user.id
      }, Chat: ${chatId}, Text: ${text}`
    );

    // --- Parse Command ---

    const parsed = parseCommand(text);

    const telemetry = getTelegramTelemetry();

    updateTelegramTelemetry({
      lastCommand: parsed.type,
      lastMessage: text,
      lastUser: user.username || String(user.id),
      lastTimestamp: String(message.date ?? Math.floor(Date.now() / 1000)),
      webhookConnected: true,
      botReachable: true,
      totalMessages: telemetry.totalMessages + 1,
    });

    console.log('[Webhook] Telemetry updated', {
      lastCommand: parsed.type,
      lastUser: user.username || user.id,
    });

    console.log('[Webhook] Parsed command', parsed);

    // --- Unknown Command ---

    if (parsed.type === 'UNKNOWN') {
      await sendMessage(
        chatId,
        'Unknown command. Try BUY, OK, DISPUTE, TRACK, or BALANCE.'
      );

      return new Response('OK', {
        status: 200,
      });
    }

    // --- TRACK ---

    if (parsed.type === 'TRACK') {
      const trackingId =
        parsed.metadata.trackingId || 'N/A';

      await sendMessage(
        chatId,
        `Tracking status: ${trackingId} (pending)`
      );

      return new Response('OK', {
        status: 200,
      });
    }

    // --- BALANCE ---

    if (parsed.type === 'BALANCE') {
      const address = await signer.getAddress();

      const balance =
        await provider.getBalance(address);

      await sendMarkdownMessage(
        chatId,
        `Wallet: \`${address}\`\nBalance: ${ethers.formatEther(balance)} QIE`
      );

      return new Response('OK', {
        status: 200,
      });
    }

    // --- Escrow Lifecycle ---

    console.log(
      '[Webhook] Executing escrow action',
      parsed.type
    );

    const result = await runEscrowAction(
      parsed.type
    );

    console.log(
      '[Webhook] Escrow tx confirmed',
      result
    );

    const actionLabel =
      parsed.type === 'BUY'
        ? 'Escrow created'
        : parsed.type === 'RELEASE'
          ? 'Funds released'
          : 'Dispute opened';

    // --- Telegram Success Response ---

    await sendMarkdownMessage(
      chatId,
      `${actionLabel}.\nTX: \`${result.txHash}\`\nBlock: ${
        result.blockNumber ?? 'pending'
      }`
    );

    return new Response('OK', {
      status: 200,
    });

  } catch (error: any) {
    console.error(
      '[Webhook] Processing error:',
      error
    );

    // --- Telegram Error Response ---

    if (chatId) {
      await sendMessage(
        chatId,
        `Error: ${
          error?.reason ||
          error?.shortMessage ||
          'Transaction failed'
        }`
      );
    }

    return new Response(
      'Internal server error',
      {
        status: 500,
      }
    );
  }
}

// --- Architecture Notes ---

// Telegram Message
// → Webhook
// → Parser
// → Blockchain Action
// → Smart Contract
// → Transaction Hash
// → Telegram Reply

// Future Improvements:
// - AI dispute arbitration
// - Real escrow deployments
// - WebSocket tx streaming
// - Multi-user escrow rooms
// - Delivery tracking oracles
// - AI fraud analysis