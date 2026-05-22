// LYNK deployment script for QIE mainnet.
// Designed for clear logs and CI/CD-friendly usage.

import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

function assertEnv(): void {
	if (!process.env.QIE_RPC_URL) {
		throw new Error("QIE_RPC_URL is not set");
	}
	if (!process.env.QIE_PRIVATE_KEY) {
		throw new Error("QIE_PRIVATE_KEY is not set");
	}
}

async function main() {
	assertEnv();

	console.log("[Deploy] Starting LynkEscrow deployment");

	const [deployer] = await ethers.getSigners();
	console.log(`[Deploy] Deployer: ${deployer.address}`);

	// Use deployer for both buyer and seller to enable test flows without extra keys.
	const sampleBuyer = deployer.address;
	const sampleSeller = deployer.address;
	const sampleAmount = ethers.parseEther("0.01");

	const EscrowFactory = await ethers.getContractFactory("LynkEscrow");
	console.log("[Deploy] Deploying contract...");

	const contract = await EscrowFactory.deploy(sampleBuyer, sampleSeller, sampleAmount);
	const deployTx = contract.deploymentTransaction();
	if (deployTx) {
		console.log(`[Deploy] Tx hash: ${deployTx.hash}`);
	}

	await contract.waitForDeployment();
	const address = await contract.getAddress();

	const network = await ethers.provider.getNetwork();
	console.log(`[Deploy] Network: ${network.name} (${network.chainId})`);
	console.log(`[Deploy] Contract deployed at: ${address}`);
	console.log("[Deploy] Deployment successful");
}

main().catch((error) => {
	console.error("[Deploy] Deployment failed", error);
	process.exitCode = 1;
});
