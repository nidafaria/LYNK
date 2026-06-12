"use client";

import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { FadeIn, SectionDivider, PulseDot, HoverCard, SlideIn, MiniDonut } from "@/components/animations";
import StatusCard from "@/components/StatusCard";

type Action = "TEST_BUY" | "RELEASE" | "DISPUTE";
interface Act { action:Action; txHash:string; blockNumber?:number; time:string; status:"submitted"|"confirmed"|"failed"; }
interface ER { success:boolean; txHash?:string; contract?:string; blockNumber?:number; error?:string; }
interface EscrowState { buyer:string; seller:string; amount:string; released:boolean; disputed:boolean; createdAt:number|string; }

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";

function s(v?:string, n=6) {
  if (!v) return "-";
  return v.length<=n*2+2?v:`${v.slice(0,2+n)}...${v.slice(-n)}`;
}

const FLOW = ["Fund Escrow", "Confirm Deposit", "Add Tracking", "Release / Dispute"];

const FRIENDLY_ERRORS: Record<string, string> = {
  "already released": "This escrow has already been completed. Deploy a new contract to test again.",
  "already disputed": "A dispute has already been filed for this escrow.",
  "escrow in dispute": "Funds are locked while a dispute is active. Resolve the dispute first.",
  "already funded": "This escrow has already been funded. Proceed to Release or Dispute.",
  "deposit must equal": "The deposit amount does not match the escrow amount.",
  "escrow not funded": "The escrow has not been funded yet. Use Test Buy first.",
  "only buyer": "Only the buyer can perform this action.",
  "only seller": "Only the seller can perform this action.",
  "transfer failed": "The blockchain transfer failed. Check the contract balance.",
  "refund failed": "The refund transaction failed.",
};

function friendlyError(raw: string): string {
  const lower = raw.toLowerCase();
  for (const [key, msg] of Object.entries(FRIENDLY_ERRORS)) {
    if (lower.includes(key)) return msg;
  }
  if (lower.includes("execution reverted")) return "Transaction failed — the contract does not allow this action in its current state.";
  return raw;
}

const BUTTON_REASON: Record<Action, string> = {
  TEST_BUY: "Escrow is already funded or in a terminal state.",
  RELEASE: "Funds have already been released or a dispute is active.",
  DISPUTE: "A dispute has already been filed.",
};

export default function EscrowPage() {
  const [escrow, setEscrow] = useState<EscrowState|null>(null);
  const [escrowLoading, setEscrowLoading] = useState(true);
  const [escrowErr, setEscrowErr] = useState<string|null>(null);

  const [loading, setLoading] = useState<Action|null>(null);
  const [status, setStatus] = useState("Idle");
  const [err, setErr] = useState<string|null>(null);
  const [latest, setLatest] = useState<Act|null>(null);
  const [acts, setActs] = useState<Act[]>([]);

  async function refreshEscrow() {
    setEscrowLoading(true); setEscrowErr(null);
    try {
      const res = await fetch(`${BASE_URL}/api/escrow/status`);
      const data = await res.json();
      if (!res.ok || !data.success || !data.escrow) throw new Error(data.error || "Unavailable");
      setEscrow(data.escrow);
    } catch (err: any) {
      setEscrowErr(err.message);
      setEscrow(null);
    } finally {
      setEscrowLoading(false);
    }
  }

  useEffect(() => { refreshEscrow(); const t = setInterval(refreshEscrow, 10000); return () => clearInterval(t); }, []);

  const btnDisabled = useMemo(() => ({
    TEST_BUY: escrowLoading || escrow?.released || escrow?.disputed || false,
    RELEASE: escrowLoading || escrow?.released || escrow?.disputed || false,
    DISPUTE: escrowLoading || escrow?.disputed || escrow?.released || false,
  }), [escrow, escrowLoading]);

  const statusBadges = useMemo(() => {
    const badges: { label: string; tone: string }[] = [];
    if (escrow) {
      const funded = !escrow.released && !escrow.disputed;
      if (funded) badges.push({ label: "FUNDED", tone: "badge-live" });
      if (escrow.released) badges.push({ label: "RELEASED", tone: "badge-accent" });
      if (escrow.disputed) badges.push({ label: "DISPUTED", tone: "badge-warn" });
    }
    return badges;
  }, [escrow]);

  const actions = useMemo(() => [
    {label:"Test Buy", action:"TEST_BUY" as const, route:"/api/escrow/test-buy"},
    {label:"Release Funds", action:"RELEASE" as const, route:"/api/escrow/release"},
    {label:"Open Dispute", action:"DISPUTE" as const, route:"/api/escrow/dispute"},
  ], []);

  const lifecycleStep = useMemo(() => {
    if (escrow?.released) return FLOW.length;
    if (escrow?.disputed) return FLOW.length - 1;
    return 0;
  }, [escrow]);

  async function callEscrow(route:string, action:Action) {
    setLoading(action); setErr(null); setStatus("Submitting...");
    try {
      const res = await axios.post<ER>(`${BASE_URL}${route}`);
      if (!res.data?.success || !res.data.txHash) throw new Error(res.data?.error||"Unknown");
      setStatus("Confirmed ✓");
      const entry: Act = {action, txHash:res.data.txHash, blockNumber:res.data.blockNumber, time:new Date().toLocaleTimeString(), status:"confirmed"};
      setLatest(entry);
      setActs(prev => [entry, ...prev].slice(0,8));
      setTimeout(refreshEscrow, 1000);
    } catch (err:any) {
      const m = err?.response?.data?.error || err.message || "Failed";
      setErr(friendlyError(m));
      setStatus(m);
    } finally { setLoading(null); }
  }

  const confirmed = acts.filter(a=>a.status==="confirmed").length;

  return (
    <div className="flex flex-col gap-6">
      <FadeIn>
        <div className="card-premium p-5">
          <div className="flex items-center gap-2 mb-2">
            <PulseDot color="var(--accent)" size={7} />
            <span className="badge badge-accent">Testing Console</span>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">Lifecycle Controls</h2>
          <p className="text-sm text-[var(--text-tertiary)] mt-1">Trigger escrow transactions on QIE mainnet.</p>
        </div>
      </FadeIn>

      <HoverCard className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[15px] font-medium text-[var(--text-secondary)]">Escrow Lifecycle</div>
          <div className="flex items-center gap-1.5">
            {escrowLoading ? (
              <span className="badge badge-idle">SYNC</span>
            ) : statusBadges.length > 0 ? (
              statusBadges.map(b => <span key={b.label} className={b.tone}>{b.label}</span>)
            ) : escrowErr ? (
              <span className="badge badge-error">ERROR</span>
            ) : (
              <span className="badge badge-idle">PENDING</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {FLOW.map((step, i) => (
            <div key={step} className="flex items-center gap-1.5 flex-1">
              <div className={`flex items-center gap-1.5 p-2 rounded-lg border flex-1 ${i <= lifecycleStep ? "border-[var(--accent)]/20 bg-[var(--accent)]/5" : "border-[var(--border-default)]"}`}>
                <PulseDot color={i <= lifecycleStep ? "var(--accent)" : "var(--text-muted)"} size={5} />
                <span className={`text-[14px] ${i <= lifecycleStep ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)]"}`}>{step}</span>
              </div>
              {i < FLOW.length-1 && <span className="text-[var(--text-muted)] text-[15px]">→</span>}
            </div>
          ))}
        </div>
      </HoverCard>

      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-4">
        <StatusCard title="Testing Console" status={loading?"loading":"idle"} hint={escrowLoading?"Loading state...":status}>
          <div className="flex flex-wrap gap-2">
            {actions.map(item => {
              const disabled = loading !== null || btnDisabled[item.action];
              const reason = btnDisabled[item.action] ? BUTTON_REASON[item.action] : null;
              return (
                <div key={item.action} className="relative group">
                  <button onClick={()=>callEscrow(item.route,item.action)} disabled={disabled}
                    className={`btn text-[15px] ${loading===item.action?"btn-secondary opacity-50":disabled?"btn-secondary opacity-30 cursor-not-allowed":"btn-secondary"}`}>
                    {loading===item.action ? <><span className="inline-block w-3 h-3 border-2 border-[var(--text-muted)] border-t-[var(--text-secondary)] rounded-full animate-spin" /> Processing</> : item.label}
                  </button>
                  {reason && (
                    <div className="absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-default)] text-[13px] text-[var(--text-tertiary)] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
                      {reason}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {escrowErr && !err && <div className="mt-3 rounded-lg bg-[var(--warning)]/10 px-2.5 py-1.5 text-[15px] text-[var(--warning)]">Could not read contract state. Actions may fail.</div>}
          {err && <div className="mt-3 rounded-lg bg-[var(--danger)]/10 px-2.5 py-1.5 text-[15px] text-[var(--danger)]">{err}</div>}
        </StatusCard>

        <StatusCard title="Contract State" status={escrowLoading?"loading":escrow?"ok":"error"} hint={escrow?`${escrow.amount} QIE`:escrowErr?escrowErr:"Unreachable"}>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {[
              ["Amount", escrow?.amount??"—"],
              ["Buyer", s(escrow?.buyer)],
              ["Seller", s(escrow?.seller)],
              ["Released", escrow ? (escrow.released ? "✓ Yes" : "No") : "—"],
              ["Disputed", escrow ? (escrow.disputed ? "⚠ Yes" : "No") : "—"],
              ["Latest", latest?.action??"—"],
            ].map(([l,v])=>(
              <div key={l} className="p-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                <div className="text-[13px] text-[var(--text-tertiary)] uppercase tracking-wider">{l}</div>
                <div className="font-mono text-[15px] text-[var(--text-primary)] mt-0.5">{v}</div>
              </div>
            ))}
          </div>
        </StatusCard>
      </div>

      <SectionDivider />

      <HoverCard className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[15px] font-medium text-[var(--text-secondary)]">Transaction Activity</span>
          {acts.length>0 && <span className="text-[14px] text-[var(--text-tertiary)] ml-auto">{confirmed} ok</span>}
        </div>
        {acts.length===0 ? (
          <div className="text-[15px] text-[var(--text-tertiary)] py-4 text-center">No transactions yet.</div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {acts.map((item, i) => (
              <SlideIn key={item.txHash} delay={i * 0.02}>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] transition-colors">
                  <div className="flex items-center gap-2">
                    <PulseDot color={item.status==="confirmed"?"var(--success)":item.status==="failed"?"var(--danger)":"var(--warning)"} size={5} />
                    <div>
                      <div className="text-[15px] text-[var(--text-secondary)]">{item.action.replace("_"," ")}</div>
                      <div className="font-mono text-[14px] text-[var(--text-tertiary)]">{s(item.txHash)}</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <span className={`badge ${item.status==="confirmed"?"badge-live":item.status==="failed"?"badge-error":"badge-warn"}`}>{item.status}</span>
                    <span className="text-[13px] text-[var(--text-tertiary)]">{item.time}</span>
                  </div>
                </div>
              </SlideIn>
            ))}
          </div>
        )}
      </HoverCard>
    </div>
  );
}
