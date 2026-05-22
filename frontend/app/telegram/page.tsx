"use client";

import { useEffect, useMemo, useState } from "react";

type StatusTone = "ok" | "warn" | "error" | "idle" | "loading";

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

const STATUS_STYLE: Record<StatusTone, string> = {
  ok: "bg-emerald-400/20 text-emerald-200 border-emerald-400/40",
  warn: "bg-amber-400/20 text-amber-200 border-amber-400/40",
  error: "bg-rose-400/20 text-rose-200 border-rose-400/40",
  idle: "bg-zinc-400/20 text-zinc-200 border-zinc-400/40",
  loading: "bg-sky-400/20 text-sky-200 border-sky-400/40",
};

function formatTimestamp(value?: number | null): string {
  if (!value) return "-";
  const date = new Date(value * 1000);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

export default function TelegramPage() {
  const [telemetry, setTelemetry] = useState<TelegramTelemetry | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);

  async function refreshTelemetry() {
    setLoading(true);
    setError(null);
    console.log("[telegram] telemetry fetch started");

    try {
      const response = await fetch(`${BASE_URL}/api/telegram/status`);
      const data = (await response.json()) as TelegramStatusResponse;

      if (!response.ok || !data.success || !data.telemetry) {
        throw new Error(data.error || "Telemetry unavailable");
      }

      setTelemetry(data.telemetry);
      setLastSync(new Date().toLocaleTimeString());
      console.log("[telegram] telemetry fetch success", data.telemetry);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setTelemetry(null);
      console.error("[telegram] telemetry fetch failure", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshTelemetry();
    const timer = setInterval(refreshTelemetry, 10000);
    return () => clearInterval(timer);
  }, []);

  const statusTone: StatusTone = loading
    ? "loading"
    : telemetry
      ? "ok"
      : "error";

  const badgeLabel = loading ? "SYNCING" : telemetry ? "LIVE" : "ERROR";

  const botStatus = useMemo<StatusTone>(() => {
    if (loading) return "loading";
    if (!telemetry) return "error";
    return telemetry.botReachable ? "ok" : "warn";
  }, [loading, telemetry]);

  const webhookStatus = useMemo<StatusTone>(() => {
    if (loading) return "loading";
    if (!telemetry) return "error";
    return telemetry.webhookConnected ? "ok" : "warn";
  }, [loading, telemetry]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-white/50">Telegram Control</p>
        <h2 className="mt-3 text-2xl font-semibold">Bot + Webhook Monitoring</h2>
        <p className="mt-2 text-sm text-white/60">
          Observe webhook delivery, parser output, and live command flow.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm uppercase tracking-[0.2em] text-white/60">Telemetry Status</h3>
              <p className="mt-2 text-sm text-white/70">Live signal from Telegram webhook.</p>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_STYLE[statusTone]}`}>
              {badgeLabel}
            </span>
          </div>

          <div className="mt-4 space-y-3 text-sm text-white/80">
            <div className="flex items-center justify-between">
              <span className="text-white/60">Last Command</span>
              <span className="font-mono text-white">{telemetry?.lastCommand ?? "-"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/60">Last User</span>
              <span className="font-mono text-white">{telemetry?.lastUser ?? "-"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/60">Last Message</span>
              <span className="font-mono text-white">
                {telemetry?.lastMessage ? `${telemetry.lastMessage.slice(0, 22)}${telemetry.lastMessage.length > 22 ? "..." : ""}` : "-"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/60">Last Timestamp</span>
              <span className="font-mono text-white">{formatTimestamp(telemetry?.lastTimestamp)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/60">Total Messages</span>
              <span className="font-mono text-white">{telemetry?.totalMessages ?? 0}</span>
            </div>
            {error ? (
              <div className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                {error}
              </div>
            ) : null}
            {lastSync ? <div className="text-xs text-white/40">Last sync: {lastSync}</div> : null}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm uppercase tracking-[0.2em] text-white/60">Bot Connectivity</h3>
              <p className="mt-2 text-sm text-white/70">Runtime connectivity checks.</p>
            </div>
          </div>

          <div className="mt-4 space-y-3 text-sm text-white/80">
            <div className="flex items-center justify-between">
              <span className="text-white/60">Webhook</span>
              <span className={`rounded-full border px-3 py-1 text-xs ${STATUS_STYLE[webhookStatus]}`}>
                {loading ? "SYNCING" : telemetry?.webhookConnected ? "CONNECTED" : "PENDING"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/60">Bot Reachable</span>
              <span className={`rounded-full border px-3 py-1 text-xs ${STATUS_STYLE[botStatus]}`}>
                {loading ? "SYNCING" : telemetry?.botReachable ? "LIVE" : "OFFLINE"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/60">Telemetry Health</span>
              <span className="font-mono text-white">{telemetry ? "Streaming" : "Idle"}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h3 className="text-sm uppercase tracking-[0.2em] text-white/60">Activity Feed</h3>
        <p className="mt-3 text-sm text-white/70">
          {telemetry ? "Live telemetry captured from the Telegram webhook." : "Awaiting live Telegram events."}
        </p>
      </div>
    </div>
  );
}
