"use client";

import axios from "axios";
import { useEffect, useMemo, useState } from "react";

type StatusTone = "ok" | "warn" | "error" | "idle" | "loading";

interface StatusCardProps {
  title: string;
  status: StatusTone;
  hint?: string;
  children: React.ReactNode;
}

interface ActivityItemProps {
  action: string;
  hash: string;
  time: string;
  status: "pending" | "confirmed" | "failed";
  badgeLabel?: string;
}

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

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_QIE_CONTRACT || "-";
const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";

function shorten(value?: string, size = 4): string {
  if (!value) return "-";
  if (value.length <= size * 2 + 2) return value;
  return `${value.slice(0, 2 + size)}...${value.slice(-size)}`;
}

function formatTimestamp(value?: number | string): string {
  if (value === undefined || value === null) return "-";
  const numeric = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(numeric)) return "-";
  const date = new Date(numeric * 1000);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function getEscrowLifecycle(escrow?: EscrowDetails) {
  if (!escrow) {
    return {
      overallLabel: "-",
      overallTone: "idle" as StatusTone,
      releaseLabel: "-",
      disputeLabel: "-",
    };
  }

  if (escrow.disputed) {
    return {
      overallLabel: "UNDER REVIEW",
      overallTone: "warn" as StatusTone,
      releaseLabel: escrow.released ? "RELEASED" : "LOCKED",
      disputeLabel: "UNDER REVIEW",
    };
  }

  if (escrow.released) {
    return {
      overallLabel: "RELEASED",
      overallTone: "ok" as StatusTone,
      releaseLabel: "RELEASED",
      disputeLabel: "CLEAR",
    };
  }

  return {
    overallLabel: "ACTIVE",
    overallTone: "idle" as StatusTone,
    releaseLabel: "IN ESCROW",
    disputeLabel: "CLEAR",
  };
}

async function fetchHealthStatus(): Promise<HealthResponse> {
  const res = await axios.get<HealthResponse>(`${BASE_URL}/api/health`);
  return res.data;
}

async function fetchEscrowStatus(): Promise<EscrowStatusResponse> {
  const res = await axios.get<EscrowStatusResponse>(`${BASE_URL}/api/escrow/status`);
  return res.data;
}

const STATUS_STYLE: Record<StatusTone, string> = {
  ok: "bg-emerald-400/20 text-emerald-200 border-emerald-400/40",
  warn: "bg-amber-400/20 text-amber-200 border-amber-400/40",
  error: "bg-rose-400/20 text-rose-200 border-rose-400/40",
  idle: "bg-zinc-400/20 text-zinc-200 border-zinc-400/40",
  loading: "bg-sky-400/20 text-sky-200 border-sky-400/40",
};

function StatusCard({ title, status, hint, children }: StatusCardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xs uppercase tracking-[0.3em] text-white/50">{title}</h3>
          {hint ? <p className="mt-2 text-sm text-white/70">{hint}</p> : null}
        </div>
        <div className={`rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_STYLE[status]}`}>
          {status.toUpperCase()}
        </div>
      </div>
      <div className="mt-4 text-sm text-white/80">{children}</div>
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <div>
        <h2 className="text-sm uppercase tracking-[0.3em] text-white/50">{title}</h2>
        {subtitle ? <p className="mt-2 text-sm text-white/60">{subtitle}</p> : null}
      </div>
    </div>
  );
}

function ActivityItem({ action, hash, time, status, badgeLabel }: ActivityItemProps) {
  const label = badgeLabel ?? status.toUpperCase();
  const statusTone: StatusTone = status === "confirmed" ? "ok" : status === "failed" ? "error" : "loading";
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-4 py-3">
      <div>
        <p className="text-xs uppercase tracking-[0.22em] text-white/60">{action}</p>
        <p className="mt-2 font-mono text-sm text-white">{hash}</p>
      </div>
      <div className="flex flex-col items-end gap-2">
        <span className={`rounded-full border px-3 py-1 text-xs ${STATUS_STYLE[statusTone]}`}>{label}</span>
        <span className="text-xs text-white/40">{time}</span>
      </div>
    </div>
  );
}

export default function Home() {
  const [action, setAction] = useState<string>("Idle");
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthLoading, setHealthLoading] = useState<boolean>(true);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [escrow, setEscrow] = useState<EscrowDetails | null>(null);
  const [escrowLoading, setEscrowLoading] = useState<boolean>(true);
  const [escrowError, setEscrowError] = useState<string | null>(null);
  const [lastEscrowSync, setLastEscrowSync] = useState<string | null>(null);

  const escrowLifecycle = useMemo(() => getEscrowLifecycle(escrow), [escrow]);

  const activity = useMemo<ActivityItemProps[]>(() => {
    if (!escrow) {
      return [];
    }

    const createdLabel = formatTimestamp(escrow.createdAt) ?? "-";
    const disputeStatus = escrow.disputed ? "pending" : "confirmed";
    const disputeBadge = escrow.disputed ? "UNDER REVIEW" : "CLEAR";

    return [
      {
        action: "ESCROW CREATED",
        hash: shorten(CONTRACT_ADDRESS, 6),
        time: createdLabel,
        status: "confirmed",
      },
      {
        action: "RELEASE STATUS",
        hash: shorten(escrow.buyer, 6),
        time: createdLabel,
        status: escrow.released ? "confirmed" : "pending",
      },
      {
        action: escrow.disputed ? "DISPUTE OPENED" : "DISPUTE STATUS",
        hash: shorten(escrow.seller, 6),
        time: createdLabel,
        status: disputeStatus,
        badgeLabel: disputeBadge,
      },
    ];
  }, [escrow]);

  async function refreshHealth() {
    setHealthLoading(true);
    setHealthError(null);
    try {
      const data = await fetchHealthStatus();
      setHealth(data);
      setLastSync(new Date().toLocaleTimeString());
      console.log("[dashboard] backend health sync", data);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setHealthError(message);
      setHealth({ success: false, error: message });
      console.error("[dashboard] backend health failed", error);
    } finally {
      setHealthLoading(false);
    }
  }

  async function refreshEscrow() {
    setEscrowLoading(true);
    setEscrowError(null);
    console.log("[dashboard] escrow fetch start");
    try {
      const data = await fetchEscrowStatus();
      if (!data.success || !data.escrow) {
        throw new Error(data.error || "Escrow status unavailable");
      }
      setEscrow(data.escrow);
      setLastEscrowSync(new Date().toLocaleTimeString());
      console.log("[dashboard] escrow fetch success", data.escrow);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setEscrowError(message);
      setEscrow(null);
      console.error("[dashboard] escrow fetch failure", error);
    } finally {
      setEscrowLoading(false);
    }
  }

  useEffect(() => {
    refreshHealth();
    const timer = setInterval(refreshHealth, 15000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    refreshEscrow();
    const timer = setInterval(refreshEscrow, 10000);
    return () => clearInterval(timer);
  }, []);

  async function handleAction(label: string) {
    setLoadingAction(label);
    setAction(`Running ${label.toLowerCase()}...`);
    // Future: replace with backend API call for escrow lifecycle actions.
    await new Promise((resolve) => setTimeout(resolve, 800));
    setAction(`${label} queued`);
    setLoadingAction(null);
  }

  const backendStatus: StatusTone = healthLoading
    ? "loading"
    : health?.success
      ? "ok"
      : "error";
  const chainStatus: StatusTone = healthLoading
    ? "loading"
    : health?.success
      ? "ok"
      : "warn";
  const escrowStatus: StatusTone = escrowLoading
    ? "loading"
    : escrow
      ? "ok"
      : "error";

  const escrowBadgeLabel = escrowLoading
    ? "SYNCING"
    : escrow
      ? "LIVE"
      : "ERROR";

  const escrowBadgeTone: StatusTone = escrowLoading
    ? "loading"
    : escrow
      ? "ok"
      : "error";

  return (
    <div className="flex flex-col gap-8">
      <section className="space-y-4">
        <SectionHeader title="System Health" subtitle="Core infrastructure availability" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatusCard
            title="Backend Status"
            status={backendStatus}
            hint={
              backendStatus === "loading"
                ? "Connecting to backend..."
                : backendStatus === "ok"
                  ? "Connected"
                  : "Failed"
            }
          >
            <div className="flex items-center justify-between">
              <span className="text-white/60">API</span>
              <span className="font-mono text-white">/api/health</span>
            </div>
            {healthError ? (
              <div className="mt-3 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                {healthError}
              </div>
            ) : null}
            {lastSync ? (
              <div className="mt-3 text-xs text-white/40">Last sync: {lastSync}</div>
            ) : null}
          </StatusCard>
          <StatusCard
            title="Blockchain Status"
            status={chainStatus}
            hint={
              chainStatus === "loading"
                ? "Syncing blockchain..."
                : chainStatus === "ok"
                  ? "QIE synced"
                  : "Awaiting connection"
            }
          >
            <div className="flex items-center justify-between">
              <span className="text-white/60">RPC</span>
              <span className="font-mono text-white">
                {healthLoading ? "Connecting" : health?.success ? "Online" : "Offline"}
              </span>
            </div>
          </StatusCard>
          <StatusCard
            title="Wallet Connection"
            status={chainStatus}
            hint={
              chainStatus === "loading"
                ? "Fetching wallet state..."
                : chainStatus === "ok"
                  ? "Signer ready"
                  : "Not connected"
            }
          >
            <div className="flex items-center justify-between">
              <span className="text-white/60">Address</span>
              <span className="font-mono text-white">{shorten(health?.walletAddress)}</span>
            </div>
          </StatusCard>
          <StatusCard title="Contract Deployment" status={escrowStatus} hint="LynkEscrow live">
            <div className="flex items-center justify-between">
              <span className="text-white/60">Address</span>
              <span className="font-mono text-white">{shorten(CONTRACT_ADDRESS)}</span>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-white/60">Buyer</span>
              <span className="font-mono text-white">{shorten(escrow?.buyer)}</span>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-white/60">Seller</span>
              <span className="font-mono text-white">{shorten(escrow?.seller)}</span>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-white/60">Status</span>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  STATUS_STYLE[escrowBadgeTone]
                }`}
              >
                {escrowBadgeLabel}
              </span>
            </div>
            {escrowError ? (
              <div className="mt-3 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                {escrowError}
              </div>
            ) : null}
            {lastEscrowSync ? (
              <div className="mt-3 text-xs text-white/40">Last sync: {lastEscrowSync}</div>
            ) : null}
          </StatusCard>
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeader title="Blockchain Information" subtitle="Live chain and wallet context" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <StatusCard title="Current Block" status={chainStatus} hint="Syncing blockchain...">
            <span className="font-mono text-lg">
              {healthLoading ? "..." : health?.blockNumber ?? "-"}
            </span>
          </StatusCard>
          <StatusCard title="Wallet Balance" status={chainStatus} hint="Native QIE">
            <span className="font-mono text-lg">{healthLoading ? "..." : health?.balance ?? "-"}</span>
          </StatusCard>
          <StatusCard title="Chain ID" status={chainStatus} hint="Network metadata">
            <span className="font-mono text-lg">{healthLoading ? "..." : health?.chainId ?? "-"}</span>
          </StatusCard>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-4">
          <SectionHeader title="Escrow Operations" subtitle="Test lifecycle actions" />
          <StatusCard title="Escrow Actions" status={escrowStatus} hint={action}>
            <div className="flex flex-wrap gap-3">
              {["Test Buy", "Release Funds", "Open Dispute"].map((label) => (
                <button
                  key={label}
                  onClick={() => handleAction(label)}
                  disabled={loadingAction !== null}
                  className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loadingAction === label ? "Loading..." : label}
                </button>
              ))}
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-white/60">Escrow Amount</span>
                <span className="font-mono text-white">{escrow?.amount ?? "-"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/60">Lifecycle</span>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                    STATUS_STYLE[escrowLifecycle.overallTone]
                  }`}
                >
                  {escrowLifecycle.overallLabel}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/60">Released</span>
                <span className="font-mono text-white">{escrowLifecycle.releaseLabel}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/60">Disputed</span>
                <span className="font-mono text-white">{escrowLifecycle.disputeLabel}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/60">Created</span>
                <span className="font-mono text-white">{escrow ? formatTimestamp(escrow.createdAt) : "-"}</span>
              </div>
            </div>
          </StatusCard>
        </div>

        <div className="space-y-4">
          <SectionHeader title="Telegram Integration" subtitle="Webhook + bot visibility" />
          <StatusCard title="Telegram Status" status="warn" hint="Awaiting live telemetry">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-white/60">Webhook</span>
                <span className="font-mono text-white">Pending</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/60">Bot Connection</span>
                <span className="font-mono text-white">Unknown</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/60">Latest Command</span>
                <span className="font-mono text-white">-</span>
              </div>
            </div>
          </StatusCard>
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeader title="Transaction Activity" subtitle="Recent escrow actions" />
        <div className="grid gap-3">
          {activity.length ? (
            activity.map((item) => <ActivityItem key={item.action} {...item} />)
          ) : (
            <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/60">
              {escrowLoading ? "Loading escrow activity..." : "No escrow activity available yet."}
            </div>
          )}
        </div>
        {/* Future: replace with websocket/event streaming from backend. */}
      </section>
    </div>
  );
}
