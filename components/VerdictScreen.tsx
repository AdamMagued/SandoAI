'use client';

import { useEffect, useState } from 'react';

interface VerdictProps {
  sandwich: string;
  reasoning: string;
  confidence: number;
  urgency: string;
}

export default function VerdictScreen({ sandwich, reasoning, confidence, urgency }: VerdictProps) {
  const [displayedSandwich, setDisplayedSandwich] = useState('');
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    let i = 0;
    const interval = window.setInterval(() => {
      setDisplayedSandwich(sandwich.slice(0, i));
      i++;
      if (i > sandwich.length) {
        window.clearInterval(interval);
        setShowContent(true);
      }
    }, 100);
    return () => window.clearInterval(interval);
  }, [sandwich]);

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-card-bg border border-foreground/30 rounded-lg shadow-[0_0_30px_rgba(0,255,65,0.1)] max-w-2xl mx-auto my-12 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-2 text-[10px] uppercase opacity-40 font-mono">
        Status: {urgency}
      </div>
      
      <div className="text-sm uppercase tracking-widest text-text-dim mb-4">
        [ SYSTEM VERDICT ]
      </div>

      <h2 className="text-5xl md:text-7xl font-black mb-6 terminal-glow text-center">
        {displayedSandwich}
        <span className="animate-pulse">_</span>
      </h2>

      <div className={`transition-all duration-1000 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div className="flex items-center gap-4 mb-8">
          <div className="h-1 flex-grow bg-foreground/20">
            <div 
              className="h-full bg-foreground transition-all duration-1000 ease-out" 
              style={{ width: `${confidence}%` }}
            />
          </div>
          <div className="font-mono text-xl">
            {confidence}% <span className="text-xs uppercase text-text-dim">Confidence</span>
          </div>
        </div>

        <p className="text-lg md:text-xl font-mono leading-relaxed text-center italic border-l-4 border-foreground/50 pl-6 py-2 bg-foreground/5">
          "{reasoning}"
        </p>

        <div className="mt-12 flex flex-col items-center gap-4">
          <div className="text-[10px] uppercase opacity-50">
            Cryptographic Signatures Verified via Solana
          </div>
        </div>
      </div>
    </div>
  );
}
