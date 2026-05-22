// Global Telegram telemetry state for LYNK
// Uses globalThis so state survives Next.js dev reload boundaries.

export interface TelegramTelemetry {
	lastCommand: string | null;
	lastMessage: string | null;
	lastUser: string | null;
	lastTimestamp: string | null;
	webhookConnected: boolean;
	botReachable: boolean;
	totalMessages: number;
}

declare global {
	// eslint-disable-next-line no-var
	var __lynkTelegramTelemetry: TelegramTelemetry | undefined;
}

const defaultTelemetry: TelegramTelemetry = {
	lastCommand: null,
	lastMessage: null,
	lastUser: null,
	lastTimestamp: null,
	webhookConnected: false,
	botReachable: false,
	totalMessages: 0
};

const telemetry: TelegramTelemetry =
	globalThis.__lynkTelegramTelemetry ?? defaultTelemetry;

globalThis.__lynkTelegramTelemetry = telemetry;

export function updateTelegramTelemetry(
	updates: Partial<TelegramTelemetry>
) {
	Object.assign(telemetry, updates);
}

export function getTelegramTelemetry(): TelegramTelemetry {
	return telemetry;
}
