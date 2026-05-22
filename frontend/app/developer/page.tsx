"use client";

import { useEffect, useMemo, useState } from "react";

type StatusTone = "ok" | "warn" | "error" | "idle" | "loading";

interface HealthResponse {
  success: boolean;
  blockNumber?: number;
  walletAddress?: string;
  balance?: string;
  chainId?: number;
  error?: string;
}

interface EscrowDetails {
  buyer: string;
  seller: string;
  amount: string;
  released: boolean;
  disputed: boolean;
  createdAt: number | string;
}

interface EscrowStatusResponse {
  success: boolean;
  escrow?: EscrowDetails;
  error?: string;
}

interface TelegramTelemetry {
  lastCommand: string | null;
  lastMessage: string | null;
  lastUser: string | null;
  lastTimestamp: number | null;
  webhookConnected: boolean;
  botReachable: boolean;
  totalMessages: number;
}

interface TelegramStatusResponse {
  success: boolean;
  telemetry?: TelegramTelemetry;
  error?: string;
}

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_QIE_CONTRACT || "-";

const STATUS_STYLE: Record<StatusTone, string> = {
  ok: "bg-emerald-400/20 text-emerald-200 border-emerald-400/40",
  warn: "bg-amber-400/20 text-amber-200 border-amber-400/40",
  error: "bg-rose-400/20 text-rose-200 border-rose-400/40",
  idle: "bg-zinc-400/20 text-zinc-200 border-zinc-400/40",
  loading: "bg-sky-400/20 text-sky-200 border-sky-400/40",
};

function shorten(value?: string, size = 6): string {
  if (!value) return "-";
  if (value.length <= size * 2 + 2) return value;
  return `${value.slice(0, 2 + size)}...${value.slice(-size)}`;
}

function formatTimestamp(value?: number | string | null): string {
  if (value === undefined || value === null) return "-";
  const numeric = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(numeric)) return "-";
  const date = new Date(numeric * 1000);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

export default function DeveloperPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [escrow, setEscrow] = useState<EscrowDetails | null>(null);
  const [telegram, setTelegram] = useState<TelegramTelemetry | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);

  async function refreshDiagnostics() {
    setLoading(true);
    setError(null);
    console.log("[developer] telemetry fetch started");

    try {
      const [healthRes, escrowRes, telegramRes] = await Promise.all([
        fetch(`${BASE_URL}/api/health`),
        fetch(`${BASE_URL}/api/escrow/status`),
        fetch(`${BASE_URL}/api/telegram/status`),
      ]);

      const [healthData, escrowData, telegramData] = await Promise.all([
        healthRes.json() as Promise<HealthResponse>,
        escrowRes.json() as Promise<EscrowStatusResponse>,
        telegramRes.json() as Promise<TelegramStatusResponse>,
      ]);

      if (!healthRes.ok || !healthData.success) {
        throw new Error(healthData.error || "Health check failed");
      }

      if (!escrowRes.ok || !escrowData.success || !escrowData.escrow) {
        throw new Error(escrowData.error || "Escrow status unavailable");
      }

      if (!telegramRes.ok || !telegramData.success || !telegramData.telemetry) {
        throw new Error(telegramData.error || "Telegram telemetry unavailable");
      }

      setHealth(healthData);
      setEscrow(escrowData.escrow);
      setTelegram(telegramData.telemetry);
      setLastSync(new Date().toLocaleTimeString());
      console.log("[developer] telemetry fetch success", {
        health: healthData,
        escrow: escrowData.escrow,
        telegram: telegramData.telemetry,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setHealth(null);
      setEscrow(null);
      setTelegram(null);
      console.error("[developer] telemetry fetch failure", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshDiagnostics();
    const timer = setInterval(refreshDiagnostics, 10000);
    return () => clearInterval(timer);
  }, []);

  const apiStatus: StatusTone = loading ? "loading" : error ? "error" : "ok";
  const rpcStatus: StatusTone = loading
    ? "loading"
    : health?.success
      ? "ok"
      : "warn";
  const telegramStatus: StatusTone = loading
    ? "loading"
    : telegram?.botReachable
      ? "ok"
      : telegram
        ? "warn"
        : "error";
  const escrowStatus: StatusTone = loading
    ? "loading"
    : escrow
      ? "ok"
      : "error";

  const apiBadgeLabel = loading ? "SYNCING" : error ? "ERROR" : "LIVE";

  const escrowLifecycle = useMemo(() => {
    if (!escrow) {
      return { label: "-", tone: "idle" as StatusTone };
    }
    if (escrow.disputed) {
      return { label: "UNDER REVIEW", tone: "warn" as StatusTone };
    }
    if (escrow.released) {
      return { label: "RELEASED", tone: "ok" as StatusTone };
    }
    return { label: "ACTIVE", tone: "idle" as StatusTone };
  }, [escrow]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-white/50">Developer Tools</p>
        <h2 className="mt-3 text-2xl font-semibold">Infrastructure Diagnostics</h2>
        <p className="mt-2 text-sm text-white/60">
          Surface deployment metadata, RPC health, and environment checks.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm uppercase tracking-[0.2em] text-white/60">API Health</h3>
              <p className="mt-2 text-sm text-white/70">Aggregate operational status.</p>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_STYLE[apiStatus]}`}>
              {apiBadgeLabel}
            </span>
          </div>

          <div className="mt-4 space-y-3 text-sm text-white/80">
            <div className="flex items-center justify-between">
              <span className="text-white/60">Backend</span>
              <span className="font-mono text-white">/api/health</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/60">Last Sync</span>
              <span className="font-mono text-white">{lastSync ?? "-"}</span>
            </div>
            {error ? (
              <div className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                {error}
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm uppercase tracking-[0.2em] text-white/60">Blockchain Runtime</h3>
              <p className="mt-2 text-sm text-white/70">RPC + signer telemetry.</p>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_STYLE[rpcStatus]}`}>
              {loading ? "SYNCING" : health?.success ? "ONLINE" : "DEGRADED"}
            </span>
          </div>

          <div className="mt-4 space-y-3 text-sm text-white/80">
            <div className="flex items-center justify-between">
              <span className="text-white/60">Chain ID</span>
              <span className="font-mono text-white">{health?.chainId ?? "-"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/60">Block Height</span>
              <span className="font-mono text-white">{health?.blockNumber ?? "-"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/60">Wallet Address</span>
              <span className="font-mono text-white">{shorten(health?.walletAddress)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/60">Wallet Balance</span>
              <span className="font-mono text-white">{health?.balance ?? "-"}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm uppercase tracking-[0.2em] text-white/60">Escrow Runtime</h3>
              <p className="mt-2 text-sm text-white/70">Contract + lifecycle state.</p>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_STYLE[escrowStatus]}`}>
              {loading ? "SYNCING" : escrow ? "LIVE" : "ERROR"}
            </span>
          </div>

          <div className="mt-4 space-y-3 text-sm text-white/80">
            <div className="flex items-center justify-between">
              <span className="text-white/60">Contract</span>
              <span className="font-mono text-white">{shorten(CONTRACT_ADDRESS)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/60">Lifecycle</span>
              <span className={`rounded-full border px-3 py-1 text-xs ${STATUS_STYLE[escrowLifecycle.tone]}`}>
                {escrowLifecycle.label}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/60">Released</span>
              <span className="font-mono text-white">{escrow ? String(escrow.released) : "-"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/60">Disputed</span>
              <span className="font-mono text-white">{escrow ? String(escrow.disputed) : "-"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/60">Created</span>
              <span className="font-mono text-white">{formatTimestamp(escrow?.createdAt)}</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm uppercase tracking-[0.2em] text-white/60">Telegram Runtime</h3>
              <p className="mt-2 text-sm text-white/70">Bot + webhook observability.</p>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_STYLE[telegramStatus]}`}>
              {loading ? "SYNCING" : telegram?.botReachable ? "LIVE" : "WARN"}
            </span>
          </div>

          <div className="mt-4 space-y-3 text-sm text-white/80">
            <div className="flex items-center justify-between">
              <span className="text-white/60">Webhook</span>
              <span className="font-mono text-white">
                {loading ? "SYNCING" : telegram?.webhookConnected ? "CONNECTED" : "PENDING"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/60">Bot Reachable</span>
              <span className="font-mono text-white">
                {loading ? "SYNCING" : telegram?.botReachable ? "LIVE" : "OFFLINE"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/60">Total Messages</span>
              <span className="font-mono text-white">{telegram?.totalMessages ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/60">Latest Command</span>
              <span className="font-mono text-white">{telegram?.lastCommand ?? "-"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/60">Last User</span>
              <span className="font-mono text-white">{telegram?.lastUser ?? "-"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
