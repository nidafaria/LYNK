"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { label: "Overview", href: "/" },
  { label: "Escrow Operations", href: "/escrow" },
  { label: "Blockchain Explorer", href: "/blockchain" },
  { label: "Telegram Control", href: "/telegram" },
  { label: "AI Dispute Center", href: "/disputes" },
  { label: "Developer Tools", href: "/developer" },
];

export default function ConsoleShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-ink text-white">
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-br from-[#0b1220] via-[#0b0f14] to-[#07090c]" />
      <div className="pointer-events-none fixed inset-0 opacity-60 [background:radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_55%),radial-gradient(circle_at_20%_20%,_rgba(14,165,233,0.15),_transparent_50%),radial-gradient(circle_at_bottom,_rgba(16,185,129,0.12),_transparent_60%)]" />

      <div className="relative mx-auto flex w-full max-w-7xl gap-6 px-6 py-6">
        <aside className="hidden w-64 flex-col gap-6 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur lg:flex">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-white/40">Navigation</p>
            <h2 className="mt-3 text-lg font-semibold text-white">Mission Console</h2>
          </div>
          <nav className="flex flex-col gap-2">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between rounded-xl px-4 py-3 text-left text-sm transition ${
                    active
                      ? "bg-white/10 text-white"
                      : "text-white/60 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span>{item.label}</span>
                  <span className="text-xs text-white/40">→</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-8">
          <header className="flex flex-wrap items-center justify-between gap-6 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <div>
              <p className="text-xs uppercase tracking-[0.5em] text-white/40">LYNK</p>
              <h1 className="text-2xl font-semibold md:text-3xl">Protocol Mission Control</h1>
              <p className="mt-2 text-sm text-white/60">
                Real-time dashboard for backend, blockchain, escrow, and Telegram visibility.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/70">
                QIE Mainnet
              </span>
              <span className="rounded-full border border-emerald-400/40 bg-emerald-400/20 px-4 py-2 text-xs font-semibold text-emerald-200">
                Backend Connected
              </span>
              <span className="rounded-full border border-sky-400/40 bg-sky-400/20 px-4 py-2 text-xs font-semibold text-sky-200">
                Wallet Active
              </span>
            </div>
          </header>

          {/* Future: elevate live status pills into shared context from backend health */}
          <main className="flex flex-col gap-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
