export function shortenAddress(address?: string, size = 4): string {
	if (!address) return "-";
	const prefix = address.slice(0, 2 + size);
	const suffix = address.slice(-size);
	return `${prefix}...${suffix}`;
}

export function formatHash(hash?: string, size = 6): string {
	if (!hash) return "-";
	const prefix = hash.slice(0, 2 + size);
	const suffix = hash.slice(-size);
	return `${prefix}...${suffix}`;
}

export function randomTxHash(): string {
	const hex = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
	return `0x${hex}`;
}
