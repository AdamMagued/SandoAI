"use client";

import { useEffect } from "react";

/**
 * Browser extensions (Solana wallets, ad blockers, password managers, etc.)
 * frequently throw uncaught errors / promise rejections on every page load.
 * Next.js' dev error overlay surfaces those as if they were app bugs, which
 * is noisy and misleading. This component installs capture-phase listeners
 * that swallow known-benign extension noise BEFORE the overlay sees it.
 *
 * It only filters messages that match a hardcoded allowlist of known
 * extension-origin patterns — real app errors still propagate normally.
 */

const NOISY_PATTERNS: RegExp[] = [
  /tabs:outgoing\.message\.ready/i,
  /No Listener:/i,
  /Receiving end does not exist/i,
  /Extension context invalidated/i,
  /chrome-extension:\/\//i,
  /moz-extension:\/\//i,
  /A listener indicated an asynchronous response/i,
];

function isNoise(message: unknown, source?: string): boolean {
  const text =
    typeof message === "string"
      ? message
      : message && typeof message === "object"
      ? String((message as { message?: unknown }).message ?? "")
      : "";
  if (NOISY_PATTERNS.some((re) => re.test(text))) return true;
  if (source && /-extension:\/\//.test(source)) return true;
  return false;
}

export default function ExtensionErrorSuppressor() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const onError = (event: ErrorEvent) => {
      if (isNoise(event.message, event.filename)) {
        event.stopImmediatePropagation();
        event.preventDefault();
      }
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message =
        typeof reason === "string"
          ? reason
          : reason && typeof reason === "object"
          ? String((reason as { message?: unknown }).message ?? reason)
          : "";
      if (isNoise(message)) {
        event.stopImmediatePropagation();
        event.preventDefault();
      }
    };

    // Capture phase ensures we run before Next.js' dev overlay listener.
    window.addEventListener("error", onError, true);
    window.addEventListener("unhandledrejection", onRejection, true);

    return () => {
      window.removeEventListener("error", onError, true);
      window.removeEventListener("unhandledrejection", onRejection, true);
    };
  }, []);

  return null;
}
