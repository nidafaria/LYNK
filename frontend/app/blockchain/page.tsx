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

interface ActivityItem {
  label: string;
  hash: string;
  status: StatusTone;
  time: string;
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

export default function BlockchainPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [escrow, setEscrow] = useState<EscrowDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);

  async function refreshTelemetry() {
    setLoading(true);
    setError(null);
    console.log("[blockchain] telemetry fetch started");

    try {
      const [healthRes, escrowRes] = await Promise.all([
        fetch(`${BASE_URL}/api/health`),
        fetch(`${BASE_URL}/api/escrow/status`),
      ]);

      const [healthData, escrowData] = await Promise.all([
        healthRes.json() as Promise<HealthResponse>,
        escrowRes.json() as Promise<EscrowStatusResponse>,
      ]);

      if (!healthRes.ok || !healthData.success) {
        throw new Error(healthData.error || "Health check failed");
      }

      if (!escrowRes.ok || !escrowData.success || !escrowData.escrow) {
        throw new Error(escrowData.error || "Escrow status unavailable");
      }

      setHealth(healthData);
      setEscrow(escrowData.escrow);
      setLastSync(new Date().toLocaleTimeString());
      console.log("[blockchain] telemetry fetch success", {
        health: healthData,
        escrow: escrowData.escrow,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setHealth(null);
      setEscrow(null);
      console.error("[blockchain] telemetry fetch failure", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshTelemetry();
    const timer = setInterval(refreshTelemetry, 10000);
    return () => clearInterval(timer);
  }, []);

  const networkStatus: StatusTone = loading
    ? "loading"
    : health?.success
      ? "ok"
      : "warn";
  const escrowStatus: StatusTone = loading
    ? "loading"
    : escrow
      ? "ok"
      : "error";

  const lifecycleBadge = useMemo(() => {
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

  const recentActivity = useMemo<ActivityItem[]>(() => {
    if (!escrow) {
      return [];
    }

    const timestamp = formatTimestamp(escrow.createdAt);

    return [
      {
        label: "ESCROW CREATED",
        hash: shorten(CONTRACT_ADDRESS, 8),
        status: "ok",
        time: timestamp,
      },
      {
        label: "ESCROW RELEASE",
        hash: "0x0000...0000",
        status: escrow.released ? "ok" : "idle",
        time: escrow.released ? timestamp : "Pending",
      },
      {
        label: "ESCROW DISPUTE",
        hash: "0x0000...0000",
        status: escrow.disputed ? "warn" : "idle",
        time: escrow.disputed ? timestamp : "Clear",
      },
    ];
  }, [escrow]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-white/50">Blockchain Explorer</p>
        <h2 className="mt-3 text-2xl font-semibold">QIE Network Visibility</h2>
        <p className="mt-2 text-sm text-white/60">
          Monitor contract deployments, blocks, and transaction activity.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm uppercase tracking-[0.2em] text-white/60">Network Runtime</h3>
              <p className="mt-2 text-sm text-white/70">RPC heartbeat + chain metadata.</p>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_STYLE[networkStatus]}`}>
              {loading ? "SYNCING" : health?.success ? "LIVE" : "WARN"}
            </span>
          </div>

          <div className="mt-4 space-y-3 text-sm text-white/80">
            <div className="flex items-center justify-between">
              <span className="text-white/60">Chain ID</span>
              <span className="font-mono text-white">{health?.chainId ?? "-"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/60">Current Block</span>
              <span className="font-mono text-white">{health?.blockNumber ?? "-"}</span>
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
              <h3 className="text-sm uppercase tracking-[0.2em] text-white/60">Wallet Runtime</h3>
              <p className="mt-2 text-sm text-white/70">Signer telemetry + balance.</p>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_STYLE[networkStatus]}`}>
              {loading ? "SYNCING" : health?.success ? "ONLINE" : "OFFLINE"}
            </span>
          </div>

          <div className="mt-4 space-y-3 text-sm text-white/80">
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
              <h3 className="text-sm uppercase tracking-[0.2em] text-white/60">Contract State</h3>
              <p className="mt-2 text-sm text-white/70">Escrow deployment + lifecycle state.</p>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_STYLE[escrowStatus]}`}>
              {loading ? "SYNCING" : escrow ? "LIVE" : "ERROR"}
            </span>
          </div>

          <div className="mt-4 space-y-3 text-sm text-white/80">
            <div className="flex items-center justify-between">
              <span className="text-white/60">Contract Address</span>
              <span className="font-mono text-white">{shorten(CONTRACT_ADDRESS)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/60">Buyer</span>
              <span className="font-mono text-white">{shorten(escrow?.buyer)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/60">Seller</span>
              <span className="font-mono text-white">{shorten(escrow?.seller)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/60">Escrow Amount</span>
              <span className="font-mono text-white">{escrow?.amount ?? "-"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/60">Lifecycle</span>
              <span className={`rounded-full border px-3 py-1 text-xs ${STATUS_STYLE[lifecycleBadge.tone]}`}>
                {lifecycleBadge.label}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm uppercase tracking-[0.2em] text-white/60">Recent Blockchain Activity</h3>
              <p className="mt-2 text-sm text-white/70">Latest escrow-related activity.</p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 text-sm text-white/80">
            {recentActivity.length ? (
              recentActivity.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-4 py-3"
                >
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-white/60">{item.label}</p>
                    <p className="mt-2 font-mono text-sm text-white">{item.hash}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`rounded-full border px-3 py-1 text-xs ${STATUS_STYLE[item.status]}`}>
                      {item.status.toUpperCase()}
                    </span>
                    <span className="text-xs text-white/40">{item.time}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/60">
                {loading ? "Loading recent activity..." : "No activity captured yet."}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
