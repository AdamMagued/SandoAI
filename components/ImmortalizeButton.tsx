"use client";

import { useEffect, useMemo, useState } from "react";
import { VersionedTransaction } from "@solana/web3.js";
import type { VerdictPayload, VerdictContext } from "./VerdictReveal";
import {
  base64ToUint8Array,
  detectWallet,
  explorerUrl,
  type WalletDetection,
} from "@/lib/wallet";

interface Props {
  verdict: VerdictPayload;
  context: VerdictContext;
}

type Phase =
  | { kind: "idle" }
  | { kind: "connecting" }
  | { kind: "building" }
  | { kind: "signing" }
  | { kind: "confirming" }
  | { kind: "minted"; signature: string }
  | { kind: "copied" }
  | { kind: "error"; message: string };

export function buildActionUrl(
  origin: string,
  verdict: VerdictPayload,
  context: VerdictContext
): string {
  const u = new URL("/api/actions/mint-sandwich", origin);
  u.searchParams.set("sandwich", verdict.sandwich);
  u.searchParams.set("reasoning", verdict.reasoning);
  u.searchParams.set("confidence", verdict.confidence.toString());
  u.searchParams.set("mood", context.mood);
  u.searchParams.set("weather", context.weather);
  return u.toString();
}

export function buildBlinkUrl(actionUrl: string): string {
  return `https://dial.to/?action=solana-action:${encodeURIComponent(actionUrl)}`;
}

export default function ImmortalizeButton({ verdict, context }: Props) {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [wallet, setWallet] = useState<WalletDetection | null>(null);

  useEffect(() => {
    // Defer to avoid the "setState directly in effect body" rule and to give
    // wallets like Phantom an extra microtask to inject window.solana.
    const id = window.setTimeout(() => setWallet(detectWallet()), 0);
    return () => window.clearTimeout(id);
  }, []);

  const actionUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return buildActionUrl(window.location.origin, verdict, context);
  }, [verdict, context]);

  const blinkUrl = useMemo(
    () => (actionUrl ? buildBlinkUrl(actionUrl) : ""),
    [actionUrl]
  );

  async function handleMint() {
    const detection = wallet ?? detectWallet();
    setWallet(detection);
    if (!detection.provider) {
      setPhase({
        kind: "error",
        message:
          "No Solana wallet detected. Install Phantom (https://phantom.app) and refresh.",
      });
      return;
    }

    try {
      setPhase({ kind: "connecting" });
      const conn = await detection.provider.connect();
      const account = conn.publicKey.toBase58();

      setPhase({ kind: "building" });
      const txRes = await fetch(actionUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account }),
      });
      if (!txRes.ok) {
        const err = (await txRes.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(
          err?.error ||
            "Insufficient cryptographic cheese. Your sandwich remains mortal."
        );
      }
      const { transaction } = (await txRes.json()) as { transaction: string };

      setPhase({ kind: "signing" });
      const tx = VersionedTransaction.deserialize(
        base64ToUint8Array(transaction)
      );
      const sent = await detection.provider.signAndSendTransaction(tx);

      setPhase({ kind: "confirming" });
      // Phantom returns the signature immediately; we don't block on
      // confirmation — devnet is fast and the explorer link works either way.
      setPhase({ kind: "minted", signature: sent.signature });
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      const message = /user reject|denied/i.test(raw)
        ? "Transaction rejected by wallet."
        : raw ||
          "Insufficient cryptographic cheese. Your sandwich remains mortal.";
      setPhase({ kind: "error", message });
    }
  }

  async function handleCopyBlink() {
    if (!blinkUrl) return;
    try {
      await navigator.clipboard.writeText(blinkUrl);
      setPhase({ kind: "copied" });
      window.setTimeout(() => {
        setPhase((p) => (p.kind === "copied" ? { kind: "idle" } : p));
      }, 2400);
    } catch {
      setPhase({
        kind: "error",
        message:
          "Could not copy to clipboard. Open the Blink directly using the link.",
      });
    }
  }

  const minting =
    phase.kind === "connecting" ||
    phase.kind === "building" ||
    phase.kind === "signing" ||
    phase.kind === "confirming";

  const mintLabel = (() => {
    switch (phase.kind) {
      case "connecting":
        return "Connecting wallet...";
      case "building":
        return "Building transaction...";
      case "signing":
        return "Awaiting wallet signature...";
      case "confirming":
        return "Broadcasting to devnet...";
      case "minted":
        return "Minted on devnet ✓";
      default:
        return wallet?.name
          ? `Immortalize on Solana (${wallet.name})`
          : "Immortalize on Solana";
    }
  })();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={handleMint}
          disabled={minting}
          className="inline-flex h-11 items-center justify-center rounded-full bg-purple-600 px-6 text-sm font-semibold uppercase tracking-widest text-white transition-colors hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-60"
          aria-live="polite"
        >
          {mintLabel}
        </button>
        <button
          type="button"
          onClick={handleCopyBlink}
          disabled={!blinkUrl}
          className="inline-flex h-11 items-center justify-center rounded-full border border-purple-700 bg-transparent px-5 text-xs font-semibold uppercase tracking-widest text-purple-200 transition-colors hover:bg-purple-900/30 disabled:opacity-50"
        >
          {phase.kind === "copied" ? "Blink URL copied!" : "Copy Blink URL"}
        </button>
      </div>

      {phase.kind === "minted" && (
        <a
          href={explorerUrl(phase.signature)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-green-300 underline-offset-2 hover:underline break-all"
        >
          View on Solana Explorer ↗ (devnet, sig {phase.signature.slice(0, 12)}…)
        </a>
      )}

      {phase.kind === "error" && (
        <p className="text-xs text-red-400" role="alert">
          {phase.message}
        </p>
      )}

      {!wallet?.provider && (
        <p className="text-[11px] text-zinc-500">
          No browser wallet detected. Install{" "}
          <a
            href="https://phantom.app/download"
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-300 hover:underline"
          >
            Phantom
          </a>{" "}
          (or Solflare / Backpack) and refresh, or paste the Blink URL into
          Discord once you&apos;ve deployed publicly.
        </p>
      )}

      {blinkUrl && (
        <a
          href={blinkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-purple-400/80 underline-offset-2 hover:underline break-all"
        >
          Open Blink in dial.to ↗
        </a>
      )}
    </div>
  );
}
