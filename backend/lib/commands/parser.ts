// backend/lib/commands/parser.ts
type CommandType =
  | "BUY"
  | "RELEASE"
  | "DISPUTE"
  | "TRACK"
  | "BALANCE"
  | "DEPOSIT"
  | "MY_DEALS"
  | "HELP"
  | "UNKNOWN";

export interface ParsedCommand {
  type: CommandType;
  originalMessage: string;
  normalizedMessage: string;
  confidence: number;
  amount?: number;           // NEW: parsed amount for BUY/DEPOSIT
  trackingId?: string;       // NEW: parsed tracking number
  disputeReason?: string;     // NEW: parsed dispute reason
  metadata: {
    intentHints?: string[];
  };
}

function normalize(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input.trim().toLowerCase().replace(/\s+/g, " ");
}

function containsAny(text: string, keywords: string[]): boolean {
  if (!text) return false;
  const words = text.split(" ");
  return keywords.some(keyword => text === keyword || words.includes(keyword));
}

// Extract amount from message (e.g., "BUY 25" or "DEPOSIT 10")
function extractAmount(text: string): number | undefined {
  const match = text.match(/(\d+(?:\.\d+)?)/);
  if (match) {
    return parseFloat(match[1]);
  }
  return undefined;
}

// Extract tracking number
function extractTrackingId(text: string): string | undefined {
  const match = text.match(/track(?:\s*#?)?\s*(\w{4,})/i);
  return match?.[1];
}

// Extract dispute reason (everything after "dispute")
function extractDisputeReason(text: string): string {
  const match = text.match(/dispute\s+(.+)/i);
  return match?.[1]?.trim() || "No reason provided";
}

export function parseCommand(message: string): ParsedCommand {
  if (!message || typeof message !== 'string' || message.trim() === '') {
    return {
      type: "UNKNOWN",
      originalMessage: "",
      normalizedMessage: "",
      confidence: 0,
      metadata: {},
    };
  }

  const originalMessage = message;
  const normalizedMessage = normalize(message);

  console.log("[parser] incoming", { originalMessage, normalizedMessage });

  const releaseHints = ["ok", "confirm", "confirmed", "release", "received", "good"];
  const disputeHints = ["dispute", "problem", "issue", "refund", "wrong"];
  const buyHints = ["buy", "purchase"];
  const trackHints = ["track", "tracking"];
  const balanceHints = ["balance", "wallet", "funds"];
  const depositHints = ["deposit", "add funds", "top up"];
  const myDealsHints = ["my deals", "mydeals", "deals", "history","my_deals"];
  const helpHints = ["help", "/start", "start"];

  let type: CommandType = "UNKNOWN";
  let confidence = 0.2;
  let amount: number | undefined;
  let trackingId: string | undefined;
  let disputeReason: string | undefined;
  const intentHints: string[] = [];

  // CHECK ORDER MATTERS - most specific first

  // HELP
  if (containsAny(normalizedMessage, helpHints)) {
    type = "HELP";
    confidence = 0.95;
    intentHints.push("help");
  }
  // MY_DEALS
  else if (containsAny(normalizedMessage, myDealsHints)) {
    type = "MY_DEALS";
    confidence = 0.95;
    intentHints.push("my_deals");
  }
  // DEPOSIT (with amount)
  else if (containsAny(normalizedMessage, depositHints)) {
    type = "DEPOSIT";
    confidence = 0.9;
    amount = extractAmount(originalMessage) || 10;
    intentHints.push("deposit");
  }
  // RELEASE (OK/confirm)
  else if (containsAny(normalizedMessage, releaseHints)) {
    type = "RELEASE";
    confidence = 0.95;
    intentHints.push("release");
  }
  // DISPUTE
  else if (containsAny(normalizedMessage, disputeHints)) {
    type = "DISPUTE";
    confidence = 0.9;
    disputeReason = extractDisputeReason(originalMessage);
    intentHints.push("dispute");
  }
  // BUY (with optional amount)
  else if (containsAny(normalizedMessage, buyHints)) {
    type = "BUY";
    confidence = 0.9;
    amount = extractAmount(originalMessage);
    intentHints.push("buy");
  }
  // TRACK
  else if (containsAny(normalizedMessage, trackHints)) {
    type = "TRACK";
    confidence = 0.75;
    trackingId = extractTrackingId(originalMessage);
    intentHints.push("track");
  }
  // BALANCE
  else if (containsAny(normalizedMessage, balanceHints)) {
    type = "BALANCE";
    confidence = 0.75;
    intentHints.push("balance");
  }

  console.log("[parser] result", { type, confidence, amount, trackingId, disputeReason });

  return {
    type,
    originalMessage,
    normalizedMessage,
    confidence,
    amount,
    trackingId,
    disputeReason,
    metadata: { intentHints },
  };
}