import type { PublicKey, VersionedTransaction } from "@solana/web3.js";

export interface SolanaWalletProvider {
  isPhantom?: boolean;
  isSolflare?: boolean;
  isBackpack?: boolean;
  publicKey?: PublicKey;
  connect(opts?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: PublicKey }>;
  disconnect?: () => Promise<void>;
  signAndSendTransaction(
    tx: VersionedTransaction
  ): Promise<{ signature: string }>;
}

interface WindowWithWallet extends Window {
  solana?: SolanaWalletProvider;
  phantom?: { solana?: SolanaWalletProvider };
  solflare?: SolanaWalletProvider;
  backpack?: SolanaWalletProvider;
}

export interface WalletDetection {
  provider: SolanaWalletProvider | null;
  name: string | null;
  installUrl?: string;
}

export function detectWallet(): WalletDetection {
  if (typeof window === "undefined") {
    return { provider: null, name: null };
  }
  const w = window as WindowWithWallet;
  const phantom = w.phantom?.solana;
  if (phantom?.isPhantom) return { provider: phantom, name: "Phantom" };
  if (w.solana?.isPhantom) return { provider: w.solana, name: "Phantom" };
  if (w.solflare?.isSolflare) return { provider: w.solflare, name: "Solflare" };
  if (w.solana?.isSolflare) return { provider: w.solana, name: "Solflare" };
  if (w.backpack) return { provider: w.backpack, name: "Backpack" };
  if (w.solana) return { provider: w.solana, name: "Solana wallet" };
  return {
    provider: null,
    name: null,
    installUrl: "https://phantom.app/download",
  };
}

export function base64ToUint8Array(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function explorerUrl(signature: string, cluster = "devnet"): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=${cluster}`;
}
