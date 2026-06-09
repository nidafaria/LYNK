"use client";

import { useEffect, useState } from "react";
import { FadeIn, StaggerGrid, SectionDivider, MetricTile, PulseDot, HoverCard, MiniDonut } from "@/components/animations";
import type { TelegramTelemetry, TelegramStatusResponse } from "@/services/api";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";

function ts(v?: number|null) {
  if (!v) return "-";
  const d = new Date(v*1000); return Number.isNaN(d.getTime())?"-":d.toLocaleString();
}

const activity = [
  {l:"Mo", v:12}, {l:"Tu", v:8}, {l:"We", v:15},
  {l:"Th", v:22}, {l:"Fr", v:18}, {l:"Sa", v:5}, {l:"Su", v:3},
];

export default function TelegramPage() {
  const [t, setT] = useState<TelegramTelemetry|null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string|null>(null);
  const [ls, setLs] = useState<string|null>(null);

  async function refresh() {
    setLoading(true); setErr(null);
    try {
      const r = await fetch(`${BASE_URL}/api/telegram/status`);
      const d = await r.json() as TelegramStatusResponse;
      if (!r.ok || !d.success || !d.telemetry) throw new Error(d.error||"Unavailable");
      setT(d.telemetry); setLs(new Date().toLocaleTimeString());
    } catch (err:any) { setErr(err.message); setT(null); }
    finally { setLoading(false); }
  }

  useEffect(() => { refresh(); const t = setInterval(refresh,10000); return ()=>clearInterval(t); }, []);

  const maxV = Math.max(...activity.map(x=>x.v), 1);

  return (
    <div className="flex flex-col gap-6">
      <FadeIn>
        <div className="card-premium p-5">
          <div className="flex items-center gap-2 mb-2">
            <PulseDot color={t?"var(--success)":"var(--text-muted)"} size={7} />
            <span className="badge badge-live">Telemetry</span>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">Bot + Webhook Monitoring</h2>
          <p className="text-sm text-[var(--text-tertiary)] mt-1">Webhook delivery, parser output, and live command flow.</p>
        </div>
      </FadeIn>

      <StaggerGrid className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricTile label="Webhook" value={loading?"...":t?.webhookConnected?"Connected":"Pending"} subtitle={t?.webhookConnected?"Receiving":"Awaiting"} color="#22c55e" />
        <MetricTile label="Bot" value={loading?"...":t?.botReachable?"Online":"Offline"} subtitle={t?.botReachable?"Responding":"Unreachable"} color={t?.botReachable?"#22c55e":"#ef4444"} />
        <MetricTile label="Messages" value={t?.totalMessages??0} subtitle="Total received" color="#3b82f6" />
        <MetricTile label="Status" value={t?"Streaming":"Idle"} subtitle={ls?`Sync: ${ls}`:""} color="#f59e0b" />
      </StaggerGrid>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <HoverCard className="card p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="text-[11px] font-medium text-[var(--text-secondary)]">Telemetry Feed</div>
              <div className="text-[11px] text-[var(--text-tertiary)]">Live webhook signal</div>
            </div>
            <PulseDot color={t?"var(--success)":"var(--text-muted)"} size={7} />
          </div>
          <div className="space-y-2">
            {[["Command",t?.lastCommand??"—"],["User",t?.lastUser??"—"],["Message",t?.lastMessage?`${t.lastMessage.slice(0,22)}${t.lastMessage.length>22?"...":""}`:"—"],["Timestamp",ts(t?.lastTimestamp)]].map(([l,v])=>(
              <div key={l} className="flex justify-between py-1.5 border-b border-[var(--border-subtle)] last:border-0">
                <span className="text-[11px] text-[var(--text-tertiary)]">{l}</span>
                <span className="font-mono text-[11px] text-[var(--text-secondary)] truncate max-w-[200px]">{v}</span>
              </div>
            ))}
          </div>
          {err && <div className="mt-2 rounded-lg bg-[var(--danger)]/10 px-2.5 py-1.5 text-[11px] text-[var(--danger)]">{err}</div>}
        </HoverCard>

        <HoverCard className="card p-4">
          <div className="mb-3">
            <div className="text-[11px] font-medium text-[var(--text-secondary)]">Connectivity</div>
            <div className="text-[11px] text-[var(--text-tertiary)]">Connection checks</div>
          </div>
          <div className="flex flex-col gap-2">
            {[
              {label:"Webhook", value:t?.webhookConnected?"CONNECTED":"PENDING", ok:!!t?.webhookConnected},
              {label:"Bot Reachable", value:t?.botReachable?"LIVE":"OFFLINE", ok:!!t?.botReachable},
              {label:"Health", value:t?"Streaming":"Idle", ok:!!t},
            ].map(({label, value, ok}) => (
              <div key={label} className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                <span className="text-[11px] text-[var(--text-tertiary)]">{label}</span>
                <span className={`flex items-center gap-1.5 text-[11px] ${ok?"text-[var(--success)]":"text-[var(--warning)]"}`}>
                  <PulseDot color={ok?"var(--success)":"var(--warning)"} size={6} />
                  {loading?"CHECKING":value}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] flex items-center gap-3">
            <MiniDonut value={t?.totalMessages?Math.min(t.totalMessages,100):0} max={100} size={30} strokeWidth={2.5} color="#22c55e" label={String(t?.totalMessages??0)} />
            <div>
              <div className="text-[9px] text-[var(--text-tertiary)] uppercase tracking-wider">Activity Level</div>
              <div className="text-[11px] text-[var(--text-secondary)]">{t?.totalMessages?`${t.totalMessages} messages`:"No activity"}</div>
            </div>
          </div>
        </HoverCard>
      </div>

      <SectionDivider />

      <HoverCard className="card p-4">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[11px] font-medium text-[var(--text-secondary)]">Activity Feed</span>
          {t && <PulseDot color="var(--accent)" size={6} />}
        </div>
        <div className="text-[11px] text-[var(--text-tertiary)] mb-4">{t?"Live telemetry captured.":"Awaiting live events."}</div>
        <div className="flex items-end gap-2 h-20">
          {activity.map((d) => (
            <div key={d.l} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full rounded-t-sm bg-[#5b5bd7] opacity-40" style={{height:`${(d.v/maxV)*64}px`, transition:"height 0.6s ease"}} />
              <span className="text-[8px] text-[var(--text-tertiary)]">{d.l}</span>
            </div>
          ))}
        </div>
      </HoverCard>
    </div>
  );
}
