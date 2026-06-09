"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { PulseDot, usePerf } from "@/components/animations";

interface StatusCardProps {
  title: string;
  status?: "ok" | "warn" | "error" | "idle" | "loading";
  hint?: string;
  children?: ReactNode;
  className?: string;
}

const BADGE_CLASS: Record<string, string> = {
  ok:      "badge badge-live",
  warn:    "badge badge-warn",
  error:   "badge badge-error",
  idle:    "badge badge-idle",
  loading: "badge badge-idle",
};
const BADGE_LABEL: Record<string, string> = {
  ok:      "LIVE",
  warn:    "WARN",
  error:   "ERROR",
  idle:    "IDLE",
  loading: "SYNC",
};
const DOT_COLOR: Record<string, string> = {
  ok:      "var(--success)",
  warn:    "var(--warning)",
  error:   "var(--danger)",
  idle:    "var(--text-muted)",
  loading: "var(--text-muted)",
};

export default function StatusCard({ title, status = "idle", hint, children, className = "" }: StatusCardProps) {
  const perf = usePerf();

  return (
    <motion.div
      className={`card p-4 ${className}`}
      whileHover={perf !== "minimal" ? { y: -2, boxShadow: "0 8px 24px rgba(0,0,0,0.25)" } : {}}
      transition={{ duration: 0.15, ease: "easeOut" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <PulseDot color={DOT_COLOR[status]} size={6} animating={status === "loading" || status === "ok"} />
            <h3 className="text-[11px] font-medium text-[var(--text-secondary)]">{title}</h3>
          </div>
          {hint && <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">{hint}</p>}
        </div>
        <span className={BADGE_CLASS[status]}>{BADGE_LABEL[status]}</span>
      </div>
      {children && <div className="mt-3">{children}</div>}
    </motion.div>
  );
}
