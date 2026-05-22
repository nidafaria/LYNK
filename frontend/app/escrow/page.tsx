"use client";

import axios from "axios";
import { useMemo, useState } from "react";

type EscrowAction = "TEST_BUY" | "RELEASE" | "DISPUTE";
type TxStatus = "submitted" | "confirmed" | "failed";

interface EscrowResponse {
  success: boolean;
  txHash?: string;
  contract?: string;
  blockNumber?: number;
  error?: string;
}

interface ActivityItem {
  action: EscrowAction;
  txHash: string;
  blockNumber?: number;
  time: string;
  status: TxStatus;
}

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";

function shorten(value?: string, size = 6): string {
  if (!value) return "-";
  if (value.length <= size * 2 + 2) return value;
  return `${value.slice(0, 2 + size)}...${value.slice(-size)}`;
}

function extractEscrowError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data as EscrowResponse | undefined;
    if (apiError?.error) {
      return apiError.error;
    }
    if (error.message) {
      return error.message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function normalizeEscrowError(raw: string): string {
  const message = raw.toLowerCase();

  if (message.includes("already funded")) {
    return "Escrow already funded";
  }

  if (message.includes("already released")) {
    return "Funds already released";
  }

  if (message.includes("already disputed")) {
    return "Dispute already opened";
  }

  return "Transaction failed";
}

export default function EscrowPage() {
  const [loading, setLoading] = useState<EscrowAction | null>(null);
  const [status, setStatus] = useState<string>("Idle");
  const [error, setError] = useState<string | null>(null);
  const [latest, setLatest] = useState<ActivityItem | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);

  const actions = useMemo(
    () => [
      { label: "Test Buy", action: "TEST_BUY" as const, route: "/api/escrow/test-buy" },
      { label: "Release Funds", action: "RELEASE" as const, route: "/api/escrow/release" },
      { label: "Open Dispute", action: "DISPUTE" as const, route: "/api/escrow/dispute" },
    ],
    []
  );

  async function callEscrow(route: string, action: EscrowAction) {
    setLoading(action);
    setError(null);
    setStatus("Submitting transaction...");

    try {
      // Future: include payload for escrow context (buyer, seller, amount).
      const res = await axios.post<EscrowResponse>(`${BASE_URL}${route}`);
      if (!res.data?.success || !res.data.txHash) {
        throw new Error(res.data?.error || "Unknown escrow error");
      }

      setStatus("Waiting for confirmation...");

      const entry: ActivityItem = {
        action,
        txHash: res.data.txHash,
        blockNumber: res.data.blockNumber,
        time: new Date().toLocaleTimeString(),
        status: "confirmed",
      };

      setLatest(entry);
      setActivity((prev) => [entry, ...prev].slice(0, 8));
      setStatus("Confirmed");
    } catch (err) {
      const rawError = extractEscrowError(err);
      const normalized = normalizeEscrowError(rawError);
      console.warn("[escrow] normalized protocol error", normalized);
      setError(normalized);
      setStatus(normalized);

      if (latest?.txHash) {
        setActivity((prev) =>
          prev.map((item) =>
            item.txHash === latest.txHash ? { ...item, status: "failed" } : item
          )
        );
      }
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-white/50">Escrow Operations</p>
        <h2 className="mt-3 text-2xl font-semibold">Lifecycle Controls</h2>
        <p className="mt-2 text-sm text-white/60">
          Trigger real escrow transactions and monitor confirmations from QIE mainnet.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h3 className="text-sm uppercase tracking-[0.2em] text-white/60">Testing Console</h3>
          <p className="mt-3 text-sm text-white/70">
            These actions call backend escrow APIs which submit real blockchain transactions.
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            {actions.map((item) => (
              <button
                key={item.action}
                onClick={() => callEscrow(item.route, item.action)}
                disabled={loading !== null}
                className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading === item.action ? "Submitting..." : item.label}
              </button>
            ))}
          </div>

          <div className="mt-4 text-sm text-white/60">Status: {status}</div>
          {error ? (
            <div className="mt-3 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
              {error}
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h3 className="text-sm uppercase tracking-[0.2em] text-white/60">Latest Transaction</h3>
          <p className="mt-3 text-sm text-white/70">
            Backend responses return tx hash, contract, and block confirmation.
          </p>

          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-white/60">Tx Hash</span>
              <span className="font-mono text-white">{shorten(latest?.txHash)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/60">Block</span>
              <span className="font-mono text-white">{latest?.blockNumber ?? "-"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/60">Status</span>
              <span className="font-mono text-white">{latest?.status ?? "-"}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h3 className="text-sm uppercase tracking-[0.2em] text-white/60">Transaction Activity</h3>
        <p className="mt-3 text-sm text-white/70">
          Future: replace with websocket streaming and Telegram synchronization.
        </p>
        <div className="mt-4 grid gap-3">
          {activity.length === 0 ? (
            <div className="text-sm text-white/60">No escrow transactions yet.</div>
          ) : (
            activity.map((item) => (
              <div
                key={item.txHash}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-4 py-3"
              >
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-white/60">
                    {item.action.replace("_", " ")}
                  </p>
                  <p className="mt-2 font-mono text-sm text-white">{shorten(item.txHash)}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
                    {item.status}
                  </span>
                  <span className="text-xs text-white/40">{item.time}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
