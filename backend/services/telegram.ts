// Centralized Telegram communication layer for LYNK.
// This keeps webhook routes and command handlers free of transport concerns.
// Future channels (WhatsApp/SMS/Push) can mirror this interface.

import axios, { type AxiosResponse } from 'axios';

// --- Types ---
export interface TelegramApiResponse<T = unknown> {
  ok: boolean;
  result?: T;
  description?: string;
}

export interface TelegramSendMessageResult {
  message_id: number;
  date: number;
  text?: string;
  chat: { id: number };
}

export interface TelegramSendOptions {
  parse_mode?: 'Markdown' | 'MarkdownV2' | 'HTML';
  disable_web_page_preview?: boolean;
}

// --- Config ---
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_BASE = TELEGRAM_BOT_TOKEN
  ? `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`
  : '';

function assertToken(): void {
  if (!TELEGRAM_BOT_TOKEN) {
    throw new Error('TELEGRAM_BOT_TOKEN is not set');
  }
}

async function postTelegram<T>(
  method: string,
  payload: Record<string, unknown>
): Promise<TelegramApiResponse<T>> {
  assertToken();
  const url = `${TELEGRAM_API_BASE}/${method}`;
  try {
    const res: AxiosResponse<TelegramApiResponse<T>> = await axios.post(url, payload);
    if (!res.data?.ok) {
      console.error('[Telegram] API error', res.data);
      throw new Error(res.data?.description || 'Telegram API error');
    }
    return res.data;
  } catch (error: any) {
    console.error('[Telegram] Request failed', error?.response?.data || error);
    throw new Error('Telegram request failed');
  }
}

// --- Public API ---
export async function sendMessage(chatId: number, text: string) {
  console.log(`[Telegram] sendMessage -> chat ${chatId}: ${text}`);
  return postTelegram<TelegramSendMessageResult>('sendMessage', {
    chat_id: chatId,
    text,
  });
}

export async function sendMarkdownMessage(chatId: number, text: string) {
  console.log(`[Telegram] sendMarkdownMessage -> chat ${chatId}: ${text}`);
  return postTelegram<TelegramSendMessageResult>('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'Markdown',
    disable_web_page_preview: true,
  });
}

export async function sendEscrowCreatedMessage(
  chatId: number,
  amount: string,
  txHash: string
) {
  const text = `Escrow created for ${amount}.\nTx: ${txHash}`;
  return sendMarkdownMessage(chatId, text);
}

export async function sendFundsReleasedMessage(chatId: number, txHash: string) {
  const text = `Funds released.\nTx: ${txHash}`;
  return sendMarkdownMessage(chatId, text);
}

export async function sendDisputeOpenedMessage(chatId: number) {
  const text = 'Dispute opened. Our team will review the case shortly.';
  return sendMessage(chatId, text);
}

export async function sendErrorMessage(chatId: number, error: unknown) {
  const detail = error instanceof Error ? error.message : String(error);
  const text = `An error occurred. Please try again.\n${detail}`;
  return sendMessage(chatId, text);
}
