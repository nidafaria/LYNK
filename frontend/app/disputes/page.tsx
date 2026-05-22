"use client";

import { useEffect, useMemo, useState } from "react";

type StatusTone = "ok" | "warn" | "error" | "idle" | "loading";

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

interface AiAssessment {
  riskScore: number;
  fraudProbability: number;
  arbitrationConfidence: number;
  integrityScore: number;
  riskLabel: string;
  recommendation: string;
  evidenceStatus: string;
  resolutionStatus: string;
}

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";

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

function buildAiAssessment(
  escrow: EscrowDetails | null,
  telegram: TelegramTelemetry | null
): AiAssessment {
  if (!escrow) {
    return {
      riskScore: 0,
      fraudProbability: 0,
      arbitrationConfidence: 0,
      integrityScore: 0,
      riskLabel: "NO DATA",
      recommendation: "Awaiting escrow telemetry",
      evidenceStatus: "PENDING",
      resolutionStatus: "IDLE",
    };
  }

  const baseRisk = escrow.disputed ? 78 : escrow.released ? 18 : 42;
  const activityBoost = telegram?.totalMessages ? Math.min(12, telegram.totalMessages) : 0;
  const riskScore = Math.min(95, baseRisk + activityBoost);
  const fraudProbability = Math.min(90, Math.round(riskScore * 0.65));
  const arbitrationConfidence = escrow.disputed ? 72 : escrow.released ? 88 : 64;
  const integrityScore = escrow.released ? 92 : escrow.disputed ? 54 : 76;

  const riskLabel = escrow.disputed ? "HIGH RISK" : escrow.released ? "LOW RISK" : "ELEVATED";
  const recommendation = escrow.disputed
    ? "Needs manual review"
    : escrow.released
      ? "Verified escrow"
      : "Monitor for anomalies";
  const evidenceStatus = telegram?.lastMessage ? "EVIDENCE INGESTED" : "AWAITING EVIDENCE";
  const resolutionStatus = escrow.disputed
    ? "UNDER REVIEW"
    : escrow.released
      ? "RESOLVED"
      : "IN PROGRESS";

  return {
    riskScore,
    fraudProbability,
    arbitrationConfidence,
    integrityScore,
    riskLabel,
    recommendation,
    evidenceStatus,
    resolutionStatus,
  };
}

export default function DisputesPage() {
  const [escrow, setEscrow] = useState<EscrowDetails | null>(null);
  const [telegram, setTelegram] = useState<TelegramTelemetry | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);

  async function refreshTelemetry() {
    setLoading(true);
    setError(null);
    console.log("[disputes] fetch started");

    try {
      const [escrowRes, telegramRes] = await Promise.all([
        fetch(`${BASE_URL}/api/escrow/status`),
        fetch(`${BASE_URL}/api/telegram/status`),
      ]);

      const [escrowData, telegramData] = await Promise.all([
        escrowRes.json() as Promise<EscrowStatusResponse>,
        telegramRes.json() as Promise<TelegramStatusResponse>,
      ]);

      if (!escrowRes.ok || !escrowData.success || !escrowData.escrow) {
        throw new Error(escrowData.error || "Escrow status unavailable");
      }

      if (!telegramRes.ok || !telegramData.success || !telegramData.telemetry) {
        throw new Error(telegramData.error || "Telegram telemetry unavailable");
      }

      setEscrow(escrowData.escrow);
      setTelegram(telegramData.telemetry);
      setLastSync(new Date().toLocaleTimeString());
      console.log("[disputes] fetch success", {
        escrow: escrowData.escrow,
        telegram: telegramData.telemetry,
      });
      console.log("[disputes] AI analysis generated");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setEscrow(null);
      setTelegram(null);
      console.error("[disputes] fetch failure", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshTelemetry();
    const timer = setInterval(refreshTelemetry, 10000);
    return () => clearInterval(timer);
  }, []);

  const aiAssessment = useMemo(
    () => buildAiAssessment(escrow, telegram),
    [escrow, telegram]
  );

  const disputeStatus: StatusTone = loading
    ? "loading"
    : escrow?.disputed
      ? "warn"
      : escrow
        ? "ok"
        : "error";

  const disputeBadge = loading
    ? "SYNCING"
    : escrow?.disputed
      ? "UNDER REVIEW"
      : escrow?.released
        ? "RESOLVED"
        : "ACTIVE";

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-white/50">AI Dispute Center</p>
        <h2 className="mt-3 text-2xl font-semibold">Arbitration Pipeline</h2>
        <p className="mt-2 text-sm text-white/60">
          Queue disputes, review evidence, and surface AI rulings.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm uppercase tracking-[0.2em] text-white/60">Escrow Arbitration</h3>
              <p className="mt-2 text-sm text-white/70">Live dispute + contract status.</p>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_STYLE[disputeStatus]}`}>
              {disputeBadge}
            </span>
          </div>

          <div className="mt-4 space-y-3 text-sm text-white/80">
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
              <span className="text-white/60">Disputed</span>
              <span className="font-mono text-white">{escrow ? String(escrow.disputed) : "-"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/60">Released</span>
              <span className="font-mono text-white">{escrow ? String(escrow.released) : "-"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/60">Created</span>
              <span className="font-mono text-white">{formatTimestamp(escrow?.createdAt)}</span>
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
              <h3 className="text-sm uppercase tracking-[0.2em] text-white/60">AI Risk Engine</h3>
              <p className="mt-2 text-sm text-white/70">Heuristic scoring + confidence.</p>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_STYLE[aiAssessment.riskScore > 70 ? "warn" : "ok"]}`}>
              {aiAssessment.riskLabel}
            </span>
          </div>

          <div className="mt-4 space-y-3 text-sm text-white/80">
            <div className="flex items-center justify-between">
              <span className="text-white/60">AI Risk Score</span>
              <span className="font-mono text-white">{aiAssessment.riskScore}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/60">Fraud Probability</span>
              <span className="font-mono text-white">{aiAssessment.fraudProbability}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/60">Arbitration Confidence</span>
              <span className="font-mono text-white">{aiAssessment.arbitrationConfidence}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/60">Escrow Integrity</span>
              <span className="font-mono text-white">{aiAssessment.integrityScore}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm uppercase tracking-[0.2em] text-white/60">Evidence Review</h3>
              <p className="mt-2 text-sm text-white/70">Ingestion + signal quality.</p>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_STYLE[aiAssessment.evidenceStatus === "EVIDENCE INGESTED" ? "ok" : "warn"]}`}>
              {aiAssessment.evidenceStatus}
            </span>
          </div>

          <div className="mt-4 space-y-3 text-sm text-white/80">
            <div className="flex items-center justify-between">
              <span className="text-white/60">Latest Telegram Command</span>
              <span className="font-mono text-white">{telegram?.lastCommand ?? "-"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/60">Latest Telegram User</span>
              <span className="font-mono text-white">{telegram?.lastUser ?? "-"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/60">Last Message</span>
              <span className="font-mono text-white">{telegram?.lastMessage ?? "-"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/60">Evidence Timestamp</span>
              <span className="font-mono text-white">{formatTimestamp(telegram?.lastTimestamp)}</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm uppercase tracking-[0.2em] text-white/60">Resolution Recommendation</h3>
              <p className="mt-2 text-sm text-white/70">AI-guided arbitration guidance.</p>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_STYLE[escrow?.disputed ? "warn" : "ok"]}`}>
              {aiAssessment.resolutionStatus}
            </span>
          </div>

          <div className="mt-4 space-y-3 text-sm text-white/80">
            <div className="flex items-center justify-between">
              <span className="text-white/60">Recommendation</span>
              <span className="font-mono text-white">{aiAssessment.recommendation}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/60">Suggested Action</span>
              <span className="font-mono text-white">
                {escrow?.disputed ? "Needs manual review" : "No escalation"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/60">Escrow State</span>
              <span className="font-mono text-white">
                {escrow?.released ? "VERIFIED ESCROW" : escrow?.disputed ? "ACTIVE DISPUTE" : "MONITORING"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
