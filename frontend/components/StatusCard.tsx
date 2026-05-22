import type { ReactNode } from "react";

interface StatusCardProps {
	title: string;
	status?: "ok" | "warn" | "error" | "idle";
	hint?: string;
	children?: ReactNode;
}

const STATUS_STYLES: Record<NonNullable<StatusCardProps["status"]>, string> = {
	ok: "bg-emerald-400/20 text-emerald-300 border-emerald-400/40",
	warn: "bg-amber-400/20 text-amber-300 border-amber-400/40",
	error: "bg-rose-400/20 text-rose-300 border-rose-400/40",
	idle: "bg-zinc-400/20 text-zinc-200 border-zinc-400/40",
};

export default function StatusCard({ title, status = "idle", hint, children }: StatusCardProps) {
	return (
		<div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
			<div className="flex items-start justify-between gap-4">
				<div>
					<h3 className="text-sm uppercase tracking-[0.2em] text-white/60">{title}</h3>
					{hint ? <p className="mt-2 text-sm text-white/70">{hint}</p> : null}
				</div>
				<div className={`rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_STYLES[status]}`}>
					{status.toUpperCase()}
				</div>
			</div>
			{children ? <div className="mt-4 text-sm text-white/80">{children}</div> : null}
		</div>
	);
}
