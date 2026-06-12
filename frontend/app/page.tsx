"use client";

import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { FadeIn, StaggerGrid, SectionDivider, MetricTile, PulseDot, HoverCard } from "@/components/animations";
import StatusCard from "@/components/StatusCard";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface H { success: boolean; blockNumber?: number; walletAddress?: string; balance?: string; chainId?: number; error?: string; }
interface E { buyer: string; seller: string; amount: string; released: boolean; disputed: boolean; createdAt: number | string; }

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";
const blockData = [
  { t: "00:00", blocks: 12, txns: 8 }, { t: "04:00", blocks: 18, txns: 14 },
  { t: "08:00", blocks: 24, txns: 20 }, { t: "12:00", blocks: 16, txns: 11 },
  { t: "16:00", blocks: 30, txns: 26 }, { t: "20:00", blocks: 22, txns: 17 },
  { t: "Now", blocks: 28, txns: 22 },
];

function s(v?: string, n = 4) {
  if (!v) return "-"; return v.length <= n*2+2 ? v : `${v.slice(0,2+n)}...${v.slice(-n)}`;
}

const CTooltip = ({ a, p, l }: any) => {
  if (!a || !p?.length) return null;
  return (
    <div className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-xs shadow-lg">
      <div className="text-[14px] text-[var(--text-tertiary)] mb-1">{l}</div>
      {p.map((x: any, i: number) => <div key={i} className="font-mono text-[15px]" style={{color: x.color}}>{x.name}: {x.value}</div>)}
    </div>
  );
};

export default function Home() {
  const [h, setH] = useState<H | null>(null);
  const [hl, setHl] = useState(true);
  const [he, setHe] = useState<string | null>(null);
  const [ls, setLs] = useState<string | null>(null);
  const [e, setE] = useState<E | null>(null);
  const [el, setEl] = useState(true);
  const [ee, setEe] = useState<string | null>(null);
  const [chartLoaded, setChartLoaded] = useState(false);

  const ec = useMemo(() => {
    if (!e) return { l: "-", r: "-", d: "-" };
    return e.disputed ? { l: "UNDER REVIEW", r: "LOCKED", d: "UNDER REVIEW" } :
           e.released ? { l: "RELEASED", r: "RELEASED", d: "CLEAR" } :
           { l: "ACTIVE", r: "IN ESCROW", d: "CLEAR" };
  }, [e]);

  async function rh() {
    setHl(true); setHe(null);
    try { const d = (await axios.get(`${BASE_URL}/api/health`)).data; setH(d); setLs(new Date().toLocaleTimeString()); }
    catch (err: any) { setHe(err.message); setH({success:false,error:err.message}); }
    finally { setHl(false); }
  }
  async function re() {
    setEl(true); setEe(null);
    try { const d = (await axios.get(`${BASE_URL}/api/escrow/status`)).data; if (!d.success || !d.escrow) throw new Error(d.error || "Unavailable"); setE(d.escrow); }
    catch (err: any) { setEe(err.message); setE(null); }
    finally { setEl(false); }
  }

  useEffect(() => { rh(); const t = setInterval(rh,15000); return ()=>clearInterval(t); }, []);
  useEffect(() => { re(); const t = setInterval(re,10000); return ()=>clearInterval(t); }, []);
  useEffect(() => { const t = setTimeout(() => setChartLoaded(true), 200); return () => clearTimeout(t); }, []);

  return (
    <div className="flex flex-col gap-6">
      <FadeIn>
        <div className="card-premium p-5">
          <div className="flex items-center gap-2 mb-2">
            <PulseDot color="var(--success)" size={7} />
            <span className="badge badge-live">System Online</span>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">System Overview</h2>
          <p className="text-sm text-[var(--text-tertiary)] mt-1 max-w-lg">Live telemetry across backend, blockchain, escrow, and Telegram.</p>
        </div>
      </FadeIn>

      <StaggerGrid className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricTile label="Backend" value={h?.success ? "Online" : "Offline"} subtitle={`Block #${h?.blockNumber ?? "—"}`} color="#5b5bd7" />
        <MetricTile label="Wallet" value={s(h?.walletAddress)} subtitle={`${h?.balance ?? "0"} QIE`} color="#3b82f6" />
        <MetricTile label="Escrow" value={e?.amount ?? "—"} subtitle={ec.l} color="#22c55e" />
        <MetricTile label="Chain ID" value={h?.chainId ?? "—"} subtitle={ls ? `Sync: ${ls}` : ""} color="#f59e0b" />
      </StaggerGrid>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <HoverCard className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[15px] font-medium text-[var(--text-secondary)]">Block Activity</div>
              <div className="text-[15px] text-[var(--text-tertiary)]">Blocks & transactions (24h)</div>
            </div>
            <PulseDot color="var(--accent)" size={7} />
          </div>
          <div style={{ opacity: chartLoaded ? 1 : 0, transition: 'opacity 0.3s ease' }}>
            {chartLoaded && <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={blockData} margin={{top:4,right:4,bottom:0,left:-16}}>
                  <defs>
                    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#5b5bd7" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#5b5bd7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="t" axisLine={false} tickLine={false} tick={{fill:"rgba(255,255,255,0.15)",fontSize:11}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill:"rgba(255,255,255,0.15)",fontSize:11}} />
                  <Tooltip content={<CTooltip />} />
                  <Area type="monotone" dataKey="blocks" stroke="#5b5bd7" strokeWidth={1.5} fill="url(#bg)" name="Blocks" />
                </AreaChart>
              </ResponsiveContainer>
            </div>}
          </div>
        </HoverCard>

        <HoverCard className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[15px] font-medium text-[var(--text-secondary)]">Escrow Operations</div>
              <div className="text-[15px] text-[var(--text-tertiary)]">Quick actions</div>
            </div>
            <span className="badge badge-live">ACTIVE</span>
          </div>
          <StaggerGrid className="grid grid-cols-2 gap-2" staggerDelay={0.03}>
            {[["Amount", e?.amount ?? "—"], ["Lifecycle", ec.l], ["Released", ec.r], ["Disputed", ec.d]].map(([l, v]) => (
              <div key={l} className="p-2.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                <div className="text-[13px] text-[var(--text-tertiary)] uppercase tracking-wider">{l}</div>
                <div className="font-mono text-sm text-[var(--text-primary)] mt-0.5">{v}</div>
              </div>
            ))}
          </StaggerGrid>
        </HoverCard>
      </div>

      <SectionDivider />

      <StaggerGrid className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3" staggerDelay={0.03}>
        <StatusCard title="Backend" status={hl?"loading":h?.success?"ok":"error"} hint={hl?"Connecting...":h?.success?"Connected":"Failed"}>
          <div className="flex justify-between py-0.5"><span className="text-[14px] text-[var(--text-tertiary)]">Endpoint</span><span className="font-mono text-[14px] text-[var(--text-secondary)]">/api/health</span></div>
          {he && <div className="mt-2 rounded-lg bg-[var(--danger)]/10 px-2.5 py-1.5 text-[14px] text-[var(--danger)]">{he}</div>}
        </StatusCard>
        <StatusCard title="Blockchain" status={hl?"loading":h?.success?"ok":"warn"} hint="QIE network" />
        <StatusCard title="Wallet" status={hl?"loading":h?.success?"ok":"warn"} hint="Signer status" />
        <StatusCard title="Contract" status={el?"loading":e?"ok":"error"} hint="LynkEscrow">
          {ee && <div className="mt-2 rounded-lg bg-[var(--danger)]/10 px-2.5 py-1.5 text-[14px] text-[var(--danger)]">{ee}</div>}
        </StatusCard>
      </StaggerGrid>
    </div>
  );
}
