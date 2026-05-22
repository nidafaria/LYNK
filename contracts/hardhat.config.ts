import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

// Validates required deployment environment variables.
function assertEnv(): void {
	if (!process.env.QIE_RPC_URL) {
		throw new Error("QIE_RPC_URL is not set");
	}
	if (!process.env.QIE_PRIVATE_KEY) {
		throw new Error("QIE_PRIVATE_KEY is not set");
	}
}

assertEnv();

// Hardhat configuration for LYNK deployment workflow on QIE.
// This keeps compilation, network config, and wallet wiring centralized.
// Future: CI/CD deployment pipelines can reuse the same config and envs.
const config: HardhatUserConfig = {
	solidity: {
		version: "0.8.20",
		settings: {
			optimizer: {
				enabled: true,
				runs: 200,
			},
		},
	},
	networks: {
		qie: {
			url: process.env.QIE_RPC_URL,
			accounts: [process.env.QIE_PRIVATE_KEY],
			chainId: process.env.QIE_CHAIN_ID ? Number(process.env.QIE_CHAIN_ID) : undefined,
		},
	},
};

export default config;
