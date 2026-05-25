// 2-of-3 Multisig Escrow Manager
import { ethers } from 'ethers';
import { provider, signer } from './provider';

const MULTISIG_ABI = [
  'constructor(address buyer, address seller, address protocol, uint256 amount)',
  'function fund() external payable',
  'function signRelease() external',
  'function openDispute(string memory reason) external',
  'function applyRuling(string memory ruling) external',
  'function autoRelease() external',
  'function getStatus() external view returns (address, address, address, uint256, bool, bool, uint8, string memory)',
  'event Signed(address indexed signer)',
  'event Released(address indexed to, uint256 amount)',
];

export interface EscrowDeployment {
  contractAddress: string;
  buyer: string;
  seller: string;
  protocol: string;
  amount: string;
}

// Deploy new escrow for each deal
export async function deployEscrow(
  buyerAddress: string,
  sellerAddress: string,
  protocolAddress: string,
  amountInQIE: string
): Promise<string> {
  const amountWei = ethers.parseEther(amountInQIE);
  
  const factory = new ethers.ContractFactory(
    MULTISIG_ABI,
    '', // bytecode would be loaded from compiled contract
    signer
  );
  
  // Note: You need to compile LynkMultisig.sol and import bytecode
  // For now, this is the pattern:
  const contract = await factory.deploy(
    buyerAddress,
    sellerAddress,
    protocolAddress,
    amountWei
  );
  
  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();
  
  console.log(`[Multisig] Deployed escrow: ${contractAddress}`);
  return contractAddress;
}

// Get escrow instance
export function getEscrow(contractAddress: string) {
  return new ethers.Contract(contractAddress, MULTISIG_ABI, signer);
}

// Buyer funds the escrow
export async function fundEscrow(contractAddress: string, amountInQIE: string): Promise<string> {
  const contract = getEscrow(contractAddress);
  const amountWei = ethers.parseEther(amountInQIE);
  
  const tx = await contract.fund({ value: amountWei });
  await tx.wait();
  
  console.log(`[Multisig] Funded escrow: ${contractAddress}, tx: ${tx.hash}`);
  return tx.hash;
}

// Party signs for release
export async function signRelease(contractAddress: string): Promise<string> {
  const contract = getEscrow(contractAddress);
  const tx = await contract.signRelease();
  await tx.wait();
  
  console.log(`[Multisig] Signed release: ${contractAddress}, tx: ${tx.hash}`);
  return tx.hash;
}

// Open dispute
export async function openDispute(contractAddress: string, reason: string): Promise<string> {
  const contract = getEscrow(contractAddress);
  const tx = await contract.openDispute(reason);
  await tx.wait();
  
  console.log(`[Multisig] Dispute opened: ${contractAddress}, reason: ${reason}`);
  return tx.hash;
}

// Protocol applies ruling
export async function applyRuling(contractAddress: string, ruling: 'BUYER' | 'SELLER' | 'SPLIT'): Promise<string> {
  const contract = getEscrow(contractAddress);
  const tx = await contract.applyRuling(ruling);
  await tx.wait();
  
  console.log(`[Multisig] Ruling applied: ${contractAddress}, ruling: ${ruling}`);
  return tx.hash;
}

// Auto-release after delivery
export async function autoRelease(contractAddress: string): Promise<string> {
  const contract = getEscrow(contractAddress);
  const tx = await contract.autoRelease();
  await tx.wait();
  
  console.log(`[Multisig] Auto-released: ${contractAddress}`);
  return tx.hash;
}

// Get escrow status
export async function getEscrowStatus(contractAddress: string) {
  const contract = getEscrow(contractAddress);
  const [buyer, seller, protocol, amount, released, disputed, sigCount, ruling] = await contract.getStatus();
  
  return {
    buyer,
    seller,
    protocol,
    amount: ethers.formatEther(amount),
    released,
    disputed,
    signatureCount: sigCount,
    ruling,
  };
}