"use client";

import { useEffect, useState } from "react";
import { FadeIn, StaggerGrid, SectionDivider, MetricTile, PulseDot, HoverCard, SlideIn } from "@/components/animations";
import StatusCard from "@/components/StatusCard";
import type { TelegramTelemetry, TelegramStatusResponse, DealRecord, DealsResponse, DisputeRecord, DisputesResponse } from "@/services/api";

interface H { success:boolean; blockNumber?:number; walletAddress?:string; balance?:string; chainId?:number; error?:string; }
interface EscrowData { buyer:string; seller:string; amount:string; released:boolean; disputed:boolean; createdAt:number|string; }

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";

function s(v?: string, n = 6) {
  if (!v) return "-";
  return v.length <= n*2+2 ? v : `${v.slice(0,2+n)}...${v.slice(-n)}`;
}

export default function DeveloperPage() {
  const [h, setH] = useState<H|null>(null);
  const [e, setE] = useState<EscrowData|null>(null);
  const [tg, setTg] = useState<TelegramTelemetry|null>(null);
  const [deals, setDeals] = useState<DealRecord[]>([]);
  const [disputes, setDisputes] = useState<DisputeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string|null>(null);
  const [ls, setLs] = useState<string|null>(null);

  async function refresh() {
    setLoading(true); setErr(null);
    try {
      const [hr, er, tr, dr, dir] = await Promise.all([
        fetch(`${BASE_URL}/api/health`), fetch(`${BASE_URL}/api/escrow/status`),
        fetch(`${BASE_URL}/api/telegram/status`), fetch(`${BASE_URL}/api/deals`), fetch(`${BASE_URL}/api/disputes`),
      ]);
      const [hd, ed, td, dd, did] = await Promise.all([hr.json(), er.json(), tr.json(), dr.json(), dir.json()]);
      if (!hr.ok || !hd.success) throw new Error(hd.error||"Health failed");
      if (!tr.ok || !td.success || !td.telemetry) throw new Error(td.error||"Telegram unavailable");
      setH(hd); if (er.ok && ed.success && ed.escrow) setE(ed.escrow); else setE(null);
      setTg(td.telemetry); if (dr.ok && dd.success) setDeals(dd.data); if (dir.ok && did.success) setDisputes(did.data);
      setLs(new Date().toLocaleTimeString());
    } catch (err:any) { setErr(err.message); setH(null); setE(null); setTg(null); setDeals([]); setDisputes([]); }
    finally { setLoading(false); }
  }

  useEffect(() => { refresh(); const t = setInterval(refresh,15000); return ()=>clearInterval(t); }, []);

  const dbOk = deals.length > 0 || disputes.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <FadeIn>
        <div className="card-premium p-5">
          <div className="flex items-center gap-2 mb-2">
            <PulseDot color="var(--accent)" size={7} />
            <span className="badge badge-accent">Developer</span>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">Operations Dashboard</h2>
          <p className="text-sm text-[var(--text-tertiary)] mt-1">Real-time system health, deals, disputes, and telemetry.</p>
        </div>
      </FadeIn>

      <StaggerGrid className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricTile label="API" value={loading?"...":err?"Error":"Healthy"} subtitle={ls?`Sync: ${ls}`:""} color="#5b5bd7" />
        <MetricTile label="Chain ID" value={h?.chainId??"—"} subtitle="Network" color="#3b82f6" />
        <MetricTile label="Block" value={h?.blockNumber??0} subtitle="Latest" color="#22c55e" />
        <MetricTile label="Wallet" value={s(h?.walletAddress)} subtitle={`${h?.balance??"0"} QIE`} color="#f59e0b" />
      </StaggerGrid>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <StatusCard title="Recent Deals" status={loading?"loading":deals.length>0?"ok":"idle"} hint={`${deals.length} deal${deals.length!==1?'s':''}`}>
          {deals.length > 0 ? (
            <div className="flex flex-col gap-1.5 max-h-[200px] overflow-y-auto">
              {deals.map((d, i) => (
                <SlideIn key={d.dealId} delay={i * 0.03}>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] transition-colors">
                    <span className="font-mono text-[15px] text-[var(--text-secondary)]">{d.dealId.slice(-10)}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[15px] text-[var(--text-primary)]">{d.amount} QIE</span>
                      <span className={`badge ${d.status==="completed"||d.status==="resolved"?"badge-live":d.status==="disputed"?"badge-warn":"badge-idle"}`}>{d.status}</span>
                    </div>
                  </div>
                </SlideIn>
              ))}
            </div>
          ) : <div className="text-[15px] text-[var(--text-tertiary)] py-4 text-center">No deals yet</div>}
        </StatusCard>

        <StatusCard title="Recent Disputes" status={loading?"loading":disputes.length>0?"ok":"idle"} hint={`${disputes.length} case${disputes.length!==1?'s':''}`}>
          {disputes.length > 0 ? (
            <div className="flex flex-col gap-1.5 max-h-[200px] overflow-y-auto">
              {disputes.map((d, i) => (
                <SlideIn key={d.dealId} delay={i * 0.03}>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] transition-colors">
                    <span className="font-mono text-[15px] text-[var(--text-secondary)]">{d.dealId.slice(-10)}</span>
                    <div className="flex items-center gap-2">
                      <PulseDot color={d.disputeConfidence&&d.disputeConfidence>=0.8?"var(--success)":d.disputeConfidence&&d.disputeConfidence>=0.5?"var(--warning)":"var(--text-muted)"} size={5} />
                      <span className="text-[15px] font-medium" style={{color: d.disputeConfidence&&d.disputeConfidence>=0.8?"var(--success)":d.disputeConfidence&&d.disputeConfidence>=0.5?"var(--warning)":"var(--text-muted)"}}>
                        {d.disputeRuling??"PENDING"}
                      </span>
                      <span className="badge badge-idle">{Math.round((d.disputeConfidence??0)*100)}%</span>
                    </div>
                  </div>
                </SlideIn>
              ))}
            </div>
          ) : <div className="text-[15px] text-[var(--text-tertiary)] py-4 text-center">No disputes</div>}
        </StatusCard>
      </div>

      <SectionDivider />

      <HoverCard>
        <StatusCard title="Runtime Diagnostics" status={err?"error":"ok"} hint={err?"Degraded":"Healthy"}>
          <div className="grid grid-cols-2 gap-2">
            {[
              {label:"API Server", ok:!!h?.success, detail:h?.success?`Chain ${h.chainId}`:"Unreachable"},
              {label:"Blockchain RPC", ok:!!h?.blockNumber, detail:h?.blockNumber?`Block #${h.blockNumber}`:"Unreachable"},
              {label:"Telegram Bot", ok:!!tg?.botReachable, detail:tg?.botReachable?"Reachable":"Offline"},
              {label:"Database", ok:dbOk, detail:dbOk?"Connected":"Unknown"},
            ].map(({label, ok, detail}) => (
              <div key={label} className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                <span className="text-[15px] text-[var(--text-tertiary)]">{label}</span>
                <span className={`flex items-center gap-1.5 text-[15px] ${ok?"text-[var(--success)]":"text-[var(--danger)]"}`}>
                  <PulseDot color={ok?"var(--success)":"var(--danger)"} size={6} />
                  {detail}
                </span>
              </div>
            ))}
          </div>
        </StatusCard>
      </HoverCard>
    </div>
  );
}
