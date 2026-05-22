"use client";

import { useEffect, useState } from "react";
import StatusCard from "@/components/StatusCard";
import { fetchBackendHealth, type BackendHealthResponse } from "@/services/api";
import { shortenAddress } from "@/services/blockchain";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_QIE_CONTRACT;

export default function HealthPanel() {
	const [health, setHealth] = useState<BackendHealthResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [lastUpdated, setLastUpdated] = useState<string | null>(null);

	async function loadHealth() {
		setLoading(true);
		try {
			const data = await fetchBackendHealth();
			setHealth(data);
			setLastUpdated(new Date().toLocaleTimeString());
		} catch (error) {
			setHealth({ success: false, error: String(error) });
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		loadHealth();
		const timer = setInterval(loadHealth, 15000);
		return () => clearInterval(timer);
	}, []);

	const backendStatus = health?.success ? "ok" : "error";

	return (
		<div className="grid gap-4 lg:grid-cols-3">
			<StatusCard
				title="Backend Status"
				status={loading ? "idle" : backendStatus}
				hint={loading ? "Checking /api/health" : health?.success ? "Connected" : "Failed"}
			>
				<div className="flex flex-col gap-2">
					<div className="flex items-center justify-between">
						<span className="text-white/60">Last updated</span>
						<span className="font-mono text-white">{lastUpdated || "-"}</span>
					</div>
					{health?.error ? (
						<div className="rounded-lg bg-rose-500/10 px-3 py-2 text-rose-200">
							{health.error}
						</div>
					) : null}
				</div>
			</StatusCard>

			<StatusCard
				title="Blockchain Status"
				status={health?.success ? "ok" : "warn"}
				hint={health?.success ? "QIE connected" : "Awaiting connection"}
			>
				<div className="flex flex-col gap-2">
					<div className="flex items-center justify-between">
						<span className="text-white/60">Block</span>
						<span className="font-mono text-white">{health?.blockNumber ?? "-"}</span>
					</div>
					<div className="flex items-center justify-between">
						<span className="text-white/60">Wallet</span>
						<span className="font-mono text-white">{shortenAddress(health?.walletAddress)}</span>
					</div>
					<div className="flex items-center justify-between">
						<span className="text-white/60">Balance</span>
						<span className="font-mono text-white">{health?.balance ?? "-"}</span>
					</div>
				</div>
			</StatusCard>

			<StatusCard
				title="Contract"
				status={CONTRACT_ADDRESS ? "ok" : "warn"}
				hint={CONTRACT_ADDRESS ? "Escrow deployed" : "Missing env value"}
			>
				<div className="flex items-center justify-between">
					<span className="text-white/60">Address</span>
					<span className="font-mono text-white">{shortenAddress(CONTRACT_ADDRESS)}</span>
				</div>
			</StatusCard>
		</div>
	);
}
