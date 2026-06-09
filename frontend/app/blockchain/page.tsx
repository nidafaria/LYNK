"use client";

import { useEffect, useState } from "react";
import { FadeIn, StaggerGrid, SectionDivider, MetricTile, Sparkline, PulseDot, HoverCard, SlideIn } from "@/components/animations";

interface H { success:boolean; blockNumber?:number; walletAddress?:string; balance?:string; chainId?:number; error?:string; }
interface E { buyer:string; seller:string; amount:string; released:boolean; disputed:boolean; createdAt:number|string; }
const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";
const CONTRACT = process.env.NEXT_PUBLIC_QIE_CONTRACT || "-";

function s(v?: string, n = 6) {
  if (!v) return "-";
  return v.length <= n*2+2 ? v : `${v.slice(0,2+n)}...${v.slice(-n)}`;
}

const sp = Array.from({length:30},()=>Math.floor(Math.random()*35)+5);

export default function BlockchainPage() {
  const [h, setH] = useState<H|null>(null);
  const [e, setE] = useState<E|null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string|null>(null);
  const [ls, setLs] = useState<string|null>(null);

  async function refresh() {
    setLoading(true); setErr(null);
    try {
      const [hr, er] = await Promise.all([fetch(`${BASE_URL}/api/health`), fetch(`${BASE_URL}/api/escrow/status`)]);
      const [hd, ed] = await Promise.all([hr.json(), er.json()]);
      if (!hr.ok || !hd.success) throw new Error(hd.error||"Health failed");
      if (!er.ok || !ed.success || !ed.escrow) throw new Error(ed.error||"Escrow unavailable");
      setH(hd); setE(ed.escrow); setLs(new Date().toLocaleTimeString());
    } catch (err:any) { setErr(err.message); setH(null); setE(null); }
    finally { setLoading(false); }
  }

  useEffect(() => { refresh(); const t = setInterval(refresh,10000); return ()=>clearInterval(t); }, []);

  const badge = !e ? "UNDER REVIEW" : e.disputed ? "UNDER REVIEW" : e.released ? "RESOLVED" : "LIVE";

  return (
    <div className="flex flex-col gap-6">
      <FadeIn>
        <div className="card-premium p-5">
          <div className="flex items-center gap-2 mb-2">
            <PulseDot color="var(--accent)" size={7} />
            <span className="badge badge-accent">Explorer</span>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">QIE Network Explorer</h2>
          <p className="text-sm text-[var(--text-tertiary)] mt-1">Monitor contract deployments, blocks, and transaction activity.</p>
        </div>
      </FadeIn>

      <StaggerGrid className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricTile label="Total Deals" value={3} subtitle="All time" color="#5b5bd7" />
        <MetricTile label="Deposits" value={1} subtitle="Confirmed" color="#22c55e" />
        <MetricTile label="Disputes" value={e?.disputed?1:0} subtitle="Under review" color="#f59e0b" />
        <MetricTile label="Releases" value={e?.released?1:0} subtitle="Completed" color="#3b82f6" />
      </StaggerGrid>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <HoverCard className="card p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="text-[11px] font-medium text-[var(--text-secondary)]">Network Runtime</div>
              <div className="text-[11px] text-[var(--text-tertiary)]">RPC + chain metadata</div>
            </div>
            <PulseDot color={h?.success?"var(--success)":"var(--warning)"} size={7} />
          </div>
          <div className="space-y-2">
            {[["Chain ID",String(h?.chainId??"—")],["Block Height",String(h?.blockNumber??"—")],["Last Sync",ls??"—"]].map(([l,v])=>(
              <div key={l} className="flex justify-between py-1.5 border-b border-[var(--border-subtle)] last:border-0">
                <span className="text-[11px] text-[var(--text-tertiary)]">{l}</span>
                <span className="font-mono text-[11px] text-[var(--text-secondary)]">{v}</span>
              </div>
            ))}
          </div>
          {err && <div className="mt-2 rounded-lg bg-[var(--danger)]/10 px-2.5 py-1.5 text-[11px] text-[var(--danger)]">{err}</div>}
        </HoverCard>

        <HoverCard className="card p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="text-[11px] font-medium text-[var(--text-secondary)]">Contract State</div>
              <div className="text-[11px] text-[var(--text-tertiary)]">Escrow deployment</div>
            </div>
            <span className={`badge ${badge==="LIVE"?"badge-live":badge==="UNDER REVIEW"?"badge-warn":"badge-accent"}`}>{loading?"SYNC":badge}</span>
          </div>
          <div className="space-y-2">
            {[["Address",s(CONTRACT)],["Buyer",s(e?.buyer)],["Seller",s(e?.seller)],["Amount",e?.amount??"—"]].map(([l,v])=>(
              <div key={l} className="flex justify-between py-1.5 border-b border-[var(--border-subtle)] last:border-0">
                <span className="text-[11px] text-[var(--text-tertiary)]">{l}</span>
                <span className="font-mono text-[11px] text-[var(--text-secondary)]">{v}</span>
              </div>
            ))}
          </div>
        </HoverCard>
      </div>

      <SectionDivider />

      <SlideIn>
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[11px] font-medium text-[var(--text-secondary)]">Activity Timeline</div>
              <div className="text-[11px] text-[var(--text-tertiary)]">Chronological events</div>
            </div>
            <PulseDot color="var(--accent)" size={7} />
          </div>
          <Sparkline data={sp} color="#5b5bd7" height={28} />
        </div>
      </SlideIn>
    </div>
  );
}
