"use client";

import { type ReactNode, useRef, useState, useEffect, createContext, useContext } from "react";
import { motion, useInView } from "framer-motion";

// ─── Performance Context ─────────────────────────────────────
type PerfLevel = "full" | "reduced" | "minimal";
const PerfContext = createContext<PerfLevel>("full");

export function PerformanceProvider({ children, level }: { children: ReactNode; level?: PerfLevel }) {
  const [perf] = useState<PerfLevel>(() => {
    if (level) return level;
    if (typeof window === "undefined") return "full";
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return "minimal";
    return "full";
  });
  return <PerfContext.Provider value={perf}>{children}</PerfContext.Provider>;
}
export function usePerf() { return useContext(PerfContext); }

// ─── Fade In (scroll-triggered entrance) ────────────────────
interface FadeInProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  duration?: number;
  once?: boolean;
}
export function FadeIn({ children, className = "", delay = 0, y = 8, duration = 0.4, once = true }: FadeInProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once, margin: "-30px" });
  const perf = usePerf();

  return (
    <div ref={ref} className={className}>
      <motion.div
        initial={perf !== "minimal" ? { opacity: 0, y } : { opacity: 1, y: 0 }}
        animate={isInView ? { opacity: 1, y: 0 } : (perf !== "minimal" ? { opacity: 0, y } : { opacity: 1, y: 0 })}
        transition={{ duration, delay, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    </div>
  );
}

// ─── Slide In (from side) ───────────────────────────────────
export function SlideIn({ children, className = "", delay = 0, direction = "up" }: FadeInProps & { direction?: "up" | "down" | "left" | "right" }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-30px" });
  const perf = usePerf();

  const dirMap = { up: { y: 16 }, down: { y: -16 }, left: { x: 16 }, right: { x: -16 } };

  return (
    <div ref={ref} className={className}>
      <motion.div
        initial={perf !== "minimal" ? { opacity: 0, ...dirMap[direction]} : { opacity: 1, x: 0, y: 0 }}
        animate={isInView ? { opacity: 1, x: 0, y: 0 } : {}}
        transition={{ duration: 0.35, delay, ease: [0.25, 0.1, 0.25, 1] }}
      >
        {children}
      </motion.div>
    </div>
  );
}

// ─── Stagger Grid ───────────────────────────────────────────
interface StaggerGridProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
}
export function StaggerGrid({ children, className = "", staggerDelay = 0.04 }: StaggerGridProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-30px" });
  const perf = usePerf();

  if (perf === "minimal") return <div className={className}>{children}</div>;

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : { opacity: 0 }}
      transition={{ staggerChildren: staggerDelay }}
    >
      {Array.isArray(children)
        ? (children as ReactNode[]).map((child, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0, transition: { duration: 0.35 } }}>
              {child}
            </motion.div>
          ))
        : <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0, transition: { duration: 0.35 } }}>{children}</motion.div>}
    </motion.div>
  );
}

// ─── Pulse Dot ──────────────────────────────────────────────
export function PulseDot({ color = "var(--success)", size = 8, animating = true }: { color?: string; size?: number; animating?: boolean }) {
  return (
    <span className="relative inline-flex" style={{ width: size, height: size }}>
      <span
        className={`absolute inset-0 rounded-full ${animating ? "animate-dot-pulse" : ""}`}
        style={{ background: color }}
      />
    </span>
  );
}

// ─── Hover Card (wraps any card with lift effect) ──────────
export function HoverCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  const perf = usePerf();
  return (
    <motion.div
      className={className}
      whileHover={perf !== "minimal" ? { y: -2, boxShadow: "0 8px 24px rgba(0,0,0,0.3)" } : {}}
      transition={{ duration: 0.15, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

// ─── Counter ────────────────────────────────────────────────
interface AnimatedCounterProps {
  value: number; className?: string; suffix?: string; prefix?: string; decimals?: number;
}
export function AnimatedCounter({ value, className, suffix = "", prefix = "", decimals = 0 }: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  const [display, setDisplay] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); observer.disconnect(); },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || done) return;
    setDone(true);
    const start = performance.now();
    const duration = 600;
    const animate = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(eased * value * Math.pow(10, decimals)) / Math.pow(10, decimals));
      if (p < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [visible, value, decimals, done]);

  return <span ref={ref} className={className}>{prefix}{done ? display.toFixed(decimals) : "0"}{suffix}</span>;
}

// ─── Mini Donut ─────────────────────────────────────────────
interface MiniDonutProps {
  value: number; max?: number; size?: number; strokeWidth?: number; color?: string; label?: string;
}
export function MiniDonut({ value, max = 100, size = 32, strokeWidth = 3, color = "#5b5bd7", label }: MiniDonutProps) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(value / max, 1);
  const center = size / 2;
  const [anim, setAnim] = useState(false);

  useEffect(() => { const t = setTimeout(() => setAnim(true), 100); return () => clearTimeout(t); }, []);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={center} cy={center} r={r} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth={strokeWidth} />
        <circle cx={center} cy={center} r={r} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={anim ? c * (1 - pct) : c}
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      {label && <span className="absolute text-[8px] font-medium text-white/50">{label}</span>}
    </div>
  );
}

// ─── Section Divider ────────────────────────────────────────
export function SectionDivider() { return <div className="divider my-6" />; }

// ─── Metric Tile ────────────────────────────────────────────
interface MetricTileProps {
  label: string; value: string | number; subtitle?: string; color?: string;
}
export function MetricTile({ label, value, subtitle, color = "#5b5bd7" }: MetricTileProps) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-1.5">
        <PulseDot color={color} size={6} animating={false} />
        <span className="text-[10px] font-medium text-[var(--text-secondary)]">{label}</span>
      </div>
      <div className="text-lg font-semibold tracking-tight" style={{ color: value !== "—" ? "var(--text-primary)" : "var(--text-tertiary)" }}>
        {typeof value === "number" ? <AnimatedCounter value={value} /> : value}
      </div>
      {subtitle && <div className="text-[10px] text-[var(--text-tertiary)] mt-0.5">{subtitle}</div>}
    </div>
  );
}

// ─── Sparkline ──────────────────────────────────────────────
interface SparklineProps {
  data: number[]; className?: string; color?: string; height?: number;
}
export function Sparkline({ data, className = "", color = "#5b5bd7", height = 32 }: SparklineProps) {
  const width = data.length * 8;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const pts = data.map((v, i) => `${i * 8},${height - ((v - min) / range) * (height - 4) - 2}`).join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={className} style={{ height }}>
      <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={pts} opacity="0.4" />
    </svg>
  );
}
