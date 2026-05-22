// Natural language command parser for LYNK
// Converts Telegram messages into escrow protocol actions

type CommandType =
  | "BUY"
  | "RELEASE"
  | "DISPUTE"
  | "TRACK"
  | "BALANCE"
  | "UNKNOWN";

export interface ParsedCommand {
  type: CommandType;
  originalMessage: string;
  normalizedMessage: string;
  confidence: number;
  metadata: {
    trackingId?: string;
    intentHints?: string[];
  };
}

// --- Normalize Input ---

function normalize(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

// --- Exact Keyword Matching ---

function containsAny(
  text: string,
  keywords: string[]
): boolean {
  const words = text.split(" ");

  return keywords.some((keyword) => {
    return (
      text === keyword ||
      words.includes(keyword)
    );
  });
}

// --- Tracking Extraction ---

function extractTrackingId(
  text: string
): string | undefined {
  const match = text.match(
    /\btrack(?:ing)?\s*(?:number\s*)?(\w{4,})\b/i
  );

  return match?.[1];
}

// --- Main Parser ---

export function parseCommand(
  message: string
): ParsedCommand {

  const originalMessage = message;

  const normalizedMessage =
    normalize(message);

  console.log(
    "[parser] incoming",
    {
      originalMessage,
      normalizedMessage,
    }
  );

  // --- Intent Keywords ---

  const releaseHints = [
    "ok",
    "confirm",
    "confirmed",
    "release",
    "received",
  ];

  const disputeHints = [
    "dispute",
    "problem",
    "issue",
    "refund",
  ];

  const buyHints = [
    "buy",
    "purchase",
  ];

  const trackHints = [
    "track",
    "tracking",
  ];

  const balanceHints = [
    "balance",
    "wallet",
    "funds",
  ];

  // --- Defaults ---

  let type: CommandType = "UNKNOWN";

  let confidence = 0.2;

  const intentHints: string[] = [];

  // --- RELEASE FIRST ---

  if (
    containsAny(
      normalizedMessage,
      releaseHints
    )
  ) {
    type = "RELEASE";

    confidence = 0.95;

    intentHints.push("release");
  }

  // --- DISPUTE ---

  else if (
    containsAny(
      normalizedMessage,
      disputeHints
    )
  ) {
    type = "DISPUTE";

    confidence = 0.9;

    intentHints.push("dispute");
  }

  // --- BUY ---

  else if (
    containsAny(
      normalizedMessage,
      buyHints
    )
  ) {
    type = "BUY";

    confidence = 0.9;

    intentHints.push("buy");
  }

  // --- TRACK ---

  else if (
    containsAny(
      normalizedMessage,
      trackHints
    )
  ) {
    type = "TRACK";

    confidence = 0.75;

    intentHints.push("track");
  }

  // --- BALANCE ---

  else if (
    containsAny(
      normalizedMessage,
      balanceHints
    )
  ) {
    type = "BALANCE";

    confidence = 0.75;

    intentHints.push("balance");
  }

  // --- Tracking Metadata ---

  const trackingId =
    type === "TRACK"
      ? extractTrackingId(
          normalizedMessage
        )
      : undefined;

  // --- FINAL DEBUG LOG ---

  console.log(
    "[parser FINAL TYPE]",
    type
  );

  console.log(
    "[parser] parsed",
    {
      type,
      confidence,
      trackingId,
    }
  );

  return {
    type,
    originalMessage,
    normalizedMessage,
    confidence,
    metadata: {
      trackingId,
      intentHints,
    },
  };
}