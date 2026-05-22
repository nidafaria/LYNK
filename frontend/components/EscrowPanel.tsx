"use client";

import { useState } from "react";
import StatusCard from "@/components/StatusCard";
import { formatHash, randomTxHash } from "@/services/blockchain";

type ActionType = "BUY" | "RELEASE" | "DISPUTE";

interface ActionLog {
	type: ActionType;
	hash: string;
	time: string;
}

export default function EscrowPanel() {
	const [logs, setLogs] = useState<ActionLog[]>([]);
	const [status, setStatus] = useState<string>("Idle");

	function handleAction(type: ActionType) {
		const hash = randomTxHash();
		const entry: ActionLog = {
			type,
			hash,
			time: new Date().toLocaleTimeString(),
		};
		setLogs((prev) => [entry, ...prev].slice(0, 6));
		setStatus(`${type} queued (simulated)`);
	}

	return (
		<StatusCard title="Escrow Test Actions" status="idle" hint={status}>
			<div className="flex flex-wrap gap-3">
				<button
					className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
					onClick={() => handleAction("BUY")}
				>
					Test Buy
				</button>
				<button
					className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
					onClick={() => handleAction("RELEASE")}
				>
					Test Release
				</button>
				<button
					className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
					onClick={() => handleAction("DISPUTE")}
				>
					Test Dispute
				</button>
			</div>

			<div className="mt-4 space-y-2">
				{logs.length === 0 ? (
					<p className="text-white/60">No simulated transactions yet.</p>
				) : (
					logs.map((log) => (
						<div
							key={`${log.type}-${log.hash}`}
							className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 px-3 py-2"
						>
							<div className="text-xs uppercase tracking-[0.18em] text-white/60">{log.type}</div>
							<div className="font-mono text-sm text-white">{formatHash(log.hash)}</div>
							<div className="text-xs text-white/50">{log.time}</div>
						</div>
					))
				)}
			</div>
		</StatusCard>
	);
}
