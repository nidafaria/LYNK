"use client";

import { useEffect, useMemo, useState } from "react";
import { FadeIn, StaggerGrid, SectionDivider, MetricTile, PulseDot, HoverCard, SlideIn } from "@/components/animations";
import StatusCard from "@/components/StatusCard";

interface D { dealId:string; buyer:number; seller:number|null; amount:string; status:string; disputeRuling:string|null; disputeConfidence:number|null; disputeReasoning:string|null; resolvedAt:string|null; }
interface R { success:boolean; data:D[]; pagination:{page:number;limit:number;total:number;totalPages:number}; }

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";

function ts(v?:string|null) {
  if (!v) return "-";
  try { const d=new Date(v); return Number.isNaN(d.getTime())?"-":d.toLocaleString(); } catch { return "-"; }
}
function cc(v:number|null) {
  if (v===null) return "var(--text-muted)";
  return v>=0.8?"var(--success)":v>=0.5?"var(--warning)":"var(--danger)";
}

export default function DisputesPage() {
  const [d, setD] = useState<D[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string|null>(null);
  const [ls, setLs] = useState<string|null>(null);

  async function fetchD() {
    setLoading(true); setErr(null);
    try {
      const r = await fetch(`${BASE_URL}/api/disputes`);
      const data = await r.json() as R;
      if (!r.ok || !data.success) throw new Error((data as any).error||"Failed");
      setD(data.data); setLs(new Date().toLocaleTimeString());
    } catch (err:any) { setErr(err.message); setD([]); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchD(); const t = setInterval(fetchD,15000); return ()=>clearInterval(t); }, []);

  const stats = useMemo(() => {
    const byR = {BUYER:0, SELLER:0, SPLIT:0};
    d.forEach(x => { if (x.disputeRuling==="BUYER") byR.BUYER++; else if (x.disputeRuling==="SELLER") byR.SELLER++; else if (x.disputeRuling==="SPLIT") byR.SPLIT++; });
    const confs = d.map(x=>x.disputeConfidence).filter((c):c is number=>c!==null);
    const avg = confs.length>0 ? confs.reduce((a,b)=>a+b,0)/confs.length : null;
    return { total:d.length, byR, avg, totalRulings:byR.BUYER+byR.SELLER+byR.SPLIT };
  }, [d]);

  const latest = useMemo(() => {
    const r = [...d].filter(x=>x.resolvedAt).sort((a,b)=>new Date(b.resolvedAt!).getTime()-new Date(a.resolvedAt!).getTime());
    return r[0]??null;
  }, [d]);

  const avgPct = stats.avg!==null ? Math.round(stats.avg*100) : null;

  return (
    <div className="flex flex-col gap-6">
      <FadeIn>
        <div className="card-premium p-5">
          <div className="flex items-center gap-2 mb-2">
            <PulseDot color="var(--warning)" size={7} />
            <span className="badge badge-warn">Arbitration</span>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">Arbitration Pipeline</h2>
          <p className="text-sm text-[var(--text-tertiary)] mt-1">Disputes, evidence, and AI-powered rulings.</p>
        </div>
      </FadeIn>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <HoverCard className="card p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="text-[11px] font-medium text-[var(--text-secondary)]">Overview</div>
              <div className="text-[11px] text-[var(--text-tertiary)]">Live disputes</div>
            </div>
            <span className={`badge ${loading?"badge-idle":err?"badge-error":d.length>0?"badge-warn":"badge-idle"}`}>
              {loading?"SYNC":err?"ERROR":`${d.length} CASE${d.length!==1?'S':''}`}
            </span>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-8 text-[var(--text-tertiary)] text-sm">Loading...</div>
          ) : err ? (
            <div className="rounded-lg bg-[var(--danger)]/10 px-3 py-2 text-[11px] text-[var(--danger)]">{err}<button onClick={fetchD} className="ml-2 underline">Retry</button></div>
          ) : d.length === 0 ? (
            <div className="text-center py-8"><div className="text-3xl opacity-20 mb-2">⚖️</div><div className="text-[11px] text-[var(--text-tertiary)]">No disputes found</div></div>
          ) : (
            <StaggerGrid className="grid grid-cols-2 gap-2" staggerDelay={0.03}>
              {[["Total",String(stats.total)],["Avg Confidence",avgPct!==null?`${avgPct}%`:"—"],["Buyer Wins",String(stats.byR.BUYER)],["Seller Wins",String(stats.byR.SELLER)],["Split",String(stats.byR.SPLIT)],["Last Sync",ls??"—"]].map(([l,v])=>(
                <div key={l} className={`p-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] ${l==="Avg Confidence"?"col-span-2":""}`}>
                  <div className="text-[9px] text-[var(--text-tertiary)] uppercase tracking-wider">{l}</div>
                  <div className="font-mono text-[11px] text-[var(--text-primary)] mt-0.5" style={l==="Avg Confidence"&&avgPct!==null?{color:cc(stats.avg)}:{}}>{v}</div>
                </div>
              ))}
            </StaggerGrid>
          )}
        </HoverCard>

        <HoverCard className="card p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="text-[11px] font-medium text-[var(--text-secondary)]">Recent Rulings</div>
              <div className="text-[11px] text-[var(--text-tertiary)]">AI arbitration results</div>
            </div>
            <PulseDot color={d.length?"var(--success)":"var(--text-muted)"} size={7} />
          </div>
          {d.length > 0 ? (
            <div className="flex flex-col gap-2 max-h-[260px] overflow-y-auto">
              {d.map((x, i) => {
                const cp = x.disputeConfidence!==null?Math.round(x.disputeConfidence*100):null;
                return (
                  <SlideIn key={x.dealId} delay={i * 0.03}>
                    <div className="p-2.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-[10px] text-[var(--text-secondary)]">{x.dealId}</span>
                        <span className={`badge ${x.status==="resolved"?"badge-live":x.status==="disputed"?"badge-warn":"badge-idle"}`}>{x.status}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <PulseDot color={cc(x.disputeConfidence)} size={5} />
                        <span className="text-[11px] font-medium" style={{color:cc(x.disputeConfidence)}}>{x.disputeRuling??"PENDING"}</span>
                        <span className="text-[9px] text-[var(--text-tertiary)] ml-auto">{ts(x.resolvedAt)}</span>
                      </div>
                      {x.disputeReasoning && <div className="text-[10px] text-[var(--text-tertiary)] mt-1 leading-relaxed line-clamp-2">{x.disputeReasoning}</div>}
                    </div>
                  </SlideIn>
                );
              })}
            </div>
          ) : <div className="text-center py-8"><div className="text-3xl opacity-20 mb-2">📋</div><div className="text-[11px] text-[var(--text-tertiary)]">No records</div></div>}
        </HoverCard>
      </div>

      <SectionDivider />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <HoverCard className="card p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="text-[11px] font-medium text-[var(--text-secondary)]">Ruling Reasoning</div>
              <div className="text-[11px] text-[var(--text-tertiary)]">Latest AI analysis</div>
            </div>
            <span className={`badge ${latest?"badge-live":loading?"badge-idle":"badge-idle"}`}>{latest?"AVAILABLE":"NONE"}</span>
          </div>
          {latest ? (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono text-[11px] text-[var(--text-secondary)]">{latest.dealId}</span>
                <span className="text-[11px] font-medium" style={{color:cc(latest.disputeConfidence)}}>→ {latest.disputeRuling}</span>
                {latest.disputeConfidence!==null && <span className="text-[10px] text-[var(--text-tertiary)]">({Math.round(latest.disputeConfidence*100)}%)</span>}
              </div>
              <div className="p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                <div className="text-[12px] text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">{latest.disputeReasoning}</div>
              </div>
              <div className="text-[10px] text-[var(--text-tertiary)] mt-2">Resolved: {ts(latest.resolvedAt)}</div>
            </div>
          ) : <div className="text-center py-8"><div className="text-3xl opacity-20 mb-2">💭</div><div className="text-[11px] text-[var(--text-tertiary)]">No reasoning available</div></div>}
        </HoverCard>

        <HoverCard className="card p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="text-[11px] font-medium text-[var(--text-secondary)]">Resolution Summary</div>
              <div className="text-[11px] text-[var(--text-tertiary)]">Rulings breakdown</div>
            </div>
            <span className={`badge ${stats.totalRulings>0?"badge-live":"badge-idle"}`}>{stats.totalRulings} RULING{stats.totalRulings!==1?'S':''}</span>
          </div>
          {stats.totalRulings > 0 ? (
            <div className="flex flex-col gap-2">
              {[
                {label:"Buyer Wins", v:stats.byR.BUYER, total:stats.totalRulings, bar:"bg-[var(--info)]"},
                {label:"Seller Wins", v:stats.byR.SELLER, total:stats.totalRulings, bar:"bg-[var(--success)]"},
                {label:"Split", v:stats.byR.SPLIT, total:stats.totalRulings, bar:"bg-[var(--warning)]"},
              ].map(item => {
                const pct = item.total>0?Math.round((item.v/item.total)*100):0;
                return (
                  <div key={item.label} className="p-2.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] text-[var(--text-tertiary)]">{item.label}</span>
                      <span className="font-mono text-[11px] text-[var(--text-secondary)]">{item.v} <span className="text-[var(--text-muted)]">({pct}%)</span></span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[var(--border-subtle)] overflow-hidden">
                      <div className={`h-full rounded-full ${item.bar}`} style={{width:`${pct}%`, transition:"width 0.8s ease"}} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <div className="text-center py-8"><div className="text-3xl opacity-20 mb-2">📊</div><div className="text-[11px] text-[var(--text-tertiary)]">No rulings yet</div></div>}
        </HoverCard>
      </div>
    </div>
  );
}
