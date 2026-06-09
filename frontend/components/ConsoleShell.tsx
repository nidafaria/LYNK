"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { PulseDot, usePerf } from "@/components/animations";

const NAV_ITEMS = [
  { label: "Overview",    href: "/",          icon: "◆" },
  { label: "Escrow Ops",  href: "/escrow",    icon: "●" },
  { label: "Blockchain",  href: "/blockchain", icon: "◈" },
  { label: "Telegram",    href: "/telegram",  icon: "◉" },
  { label: "Disputes",    href: "/disputes",  icon: "◎" },
  { label: "Developer",   href: "/developer", icon: "◇" },
];



function NavItem({ item, active }: { item: typeof NAV_ITEMS[number]; active: boolean }) {
  const perf = usePerf();
  return (
    <Link href={item.href}>
      <motion.div
        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150 ${
          active
            ? "bg-[var(--bg-active)] text-[var(--text-primary)]"
            : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
        }`}
        whileHover={perf !== "minimal" ? { x: 2 } : {}}
        transition={{ duration: 0.12 }}
      >
        <span className="w-5 text-center text-xs">{item.icon}</span>
        <span className="text-xs font-medium">{item.label}</span>
        {active && (
          <motion.span
            className="ml-auto w-1 h-1 rounded-full bg-[var(--accent)]"
            layoutId="nav-dot"
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          />
        )}
      </motion.div>
    </Link>
  );
}

export default function ConsoleShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[var(--bg-deepest)] flex">
      {/* ── Sidebar ── */}
      <aside className="hidden lg:flex w-56 flex-col border-r border-[var(--border-default)] bg-[var(--bg-base)]">
        <motion.div
          className="flex flex-col h-full p-4 gap-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {/* Logo */}
          <motion.div
            className="flex items-center gap-2.5 px-1"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.15 }}
          >
            <div className="w-7 h-7 rounded-lg bg-[var(--accent)] flex items-center justify-center">
              <span className="text-white text-xs font-bold">L</span>
            </div>
            <div>
              <div className="text-sm font-semibold text-[var(--text-primary)]">LYNK</div>
              <div className="text-[9px] text-[var(--text-tertiary)]">Protocol v0.1</div>
            </div>
          </motion.div>

          <div className="divider" />

          {/* Nav */}
          <motion.nav
            className="flex flex-col gap-0.5 flex-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ staggerChildren: 0.04 }}
          >
            {NAV_ITEMS.map(item => (
              <motion.div key={item.href} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0, transition: { duration: 0.25 } }}>
                <NavItem item={item} active={pathname === item.href} />
              </motion.div>
            ))}
          </motion.nav>

          {/* Bottom */}
          <div className="divider" />
          <div className="flex items-center gap-2 px-1 py-1">
            <PulseDot color="var(--success)" size={8} />
            <span className="text-[10px] text-[var(--text-tertiary)]">All systems nominal</span>
          </div>
        </motion.div>
      </aside>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="border-b border-[var(--border-default)] bg-[var(--bg-base)] px-6 py-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[9px] text-[var(--text-tertiary)] tracking-wider uppercase">LYNK Protocol</div>
              <h1 className="text-lg font-semibold text-[var(--text-primary)] mt-0.5">Mission Control</h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="badge badge-accent">QIE</span>
              <motion.span
                className="badge badge-live"
                animate={{ opacity: [1, 0.6, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                Connected
              </motion.span>
            </div>
          </div>
        </header>

        {/* Page */}
        <main className="flex-1 p-6 overflow-y-auto">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
