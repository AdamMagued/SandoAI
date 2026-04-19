'use client';

interface SolanaButtonProps {
  sandwich?: string;
}

export default function SolanaButton({ sandwich }: SolanaButtonProps) {
  return (
    <button 
      disabled
      className="bg-transparent border border-foreground/50 text-foreground px-8 py-4 font-mono text-lg hover:bg-foreground hover:text-background transition-all cursor-not-allowed opacity-50 relative group"
    >
      <span className="relative z-10">IMMORTALIZE ON SOLANA 🔗</span>
      <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 text-[10px] w-max opacity-0 group-hover:opacity-100 transition-opacity">
        AWAITING AHMED'S SMART CONTRACT INTEGRATION
      </div>
    </button>
  );
}
