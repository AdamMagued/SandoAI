"use client";

import { useState } from 'react';

export default function SolanaButton({ sandwich }: { sandwich: string }) {
  const [status, setStatus] = useState<string>('');

  const handleCopyBlink = async () => {
    try {
      if (!sandwich) {
          setStatus('Sandwich is required.');
          return;
      }
      
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const encodedUrl = encodeURIComponent(`${appUrl}/api/actions?sandwich=${sandwich}`);
      const blinkUrl = `https://dial.to/?action=solana-action:${encodedUrl}`;

      await navigator.clipboard.writeText(blinkUrl);
      setStatus('Copied to clipboard! Paste this in Discord to mint!');
    } catch {
      setStatus('Insufficient cryptographic cheese. Your sandwich remains mortal.');
    }
  };

  return (
    <div className="flex flex-col items-center gap-2 mt-4">
      <button 
        onClick={handleCopyBlink}
        className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-colors shadow-lg shadow-purple-500/30"
      >
        Immortalize on Solana 🔗
      </button>
      {status && (
        <p className="text-sm font-mono text-purple-300 mt-2 text-center max-w-sm">
          {status}
        </p>
      )}
    </div>
  );
}
