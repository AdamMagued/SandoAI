"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export default function JudgeQrPanel() {
  const [dataUrl, setDataUrl] = useState<string>("");
  const [origin, setOrigin] = useState<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    const url = window.location.origin;
    QRCode.toDataURL(url, {
      margin: 1,
      width: 192,
      color: { dark: "#22c55e", light: "#000000" },
    })
      .then((data) => {
        if (cancelled) return;
        setOrigin(url);
        setDataUrl(data);
      })
      .catch(() => {
        if (cancelled) return;
        setOrigin(url);
        setDataUrl("");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <aside
      aria-label="Live ticker QR code for judges"
      className="w-full max-w-3xl rounded-lg border border-green-900 bg-black p-4 font-mono text-green-300"
    >
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start sm:gap-5">
        <div className="rounded bg-black p-2 ring-1 ring-green-900">
          {dataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={dataUrl}
              alt="Scan to open SandoAI on your phone"
              width={160}
              height={160}
            />
          ) : (
            <div className="h-40 w-40 animate-pulse bg-green-950" />
          )}
        </div>
        <div className="flex-1 text-xs leading-6">
          <div className="uppercase tracking-[0.3em] text-green-500">
            Judges · Scan to Watch Live
          </div>
          <p className="mt-1 text-green-400">
            Point a phone camera here. The Sandwich Threat Matrix will update
            in real time as new verdicts are deployed.
          </p>
          {origin && (
            <p className="mt-2 break-all text-green-700">{origin}</p>
          )}
        </div>
      </div>
    </aside>
  );
}
