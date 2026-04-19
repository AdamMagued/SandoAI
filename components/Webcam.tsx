'use client';

export default function Webcam() {
  return (
    <div className="aspect-video bg-black border-2 border-dashed border-foreground/30 flex items-center justify-center text-text-dim font-mono relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-t from-foreground/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="z-10 text-center">
        [ WEBCAM SIGNAL OFFLINE ]
        <div className="text-[10px] mt-2 opacity-50">AWAITING ADAM'S IMPLEMENTATION</div>
      </div>
      <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-foreground/50" />
      <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-foreground/50" />
      <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-foreground/50" />
      <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-foreground/50" />
    </div>
  );
}
