"use client";

import { useRef, useEffect, useState, useCallback } from "react";

interface MoodResult {
  mood: string;
  description: string;
}

interface WeatherResult {
  condition: string;
  temp: number;
  severity: string;
  city: string;
}

interface SandwichVerdict {
  sandwich: string;
  reasoning: string;
  confidence: number;
  urgency: string;
}

interface WebcamProps {
  onVerdict?: (verdict: SandwichVerdict, mood: MoodResult, weather: WeatherResult) => void;
  onLoading?: (loading: boolean) => void;
}

export default function Webcam({ onVerdict, onLoading }: WebcamProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [streaming, setStreaming] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [status, setStatus] = useState("");
  const [analysisError, setAnalysisError] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [mood, setMood] = useState<MoodResult | null>(null);
  const [fallbackMood, setFallbackMood] = useState("");

  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setStreaming(true);
        }
      } catch {
        setCameraError("Camera not available. Use mood selector below.");
      }
    }
    startCamera();

    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const captureFrame = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;
    const video = videoRef.current;
    if (!video.videoWidth || !video.videoHeight) return null;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.8);
  }, []);

  async function playVoice(text: string) {
    try {
      const res = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (res.ok && res.headers.get("Content-Type")?.includes("audio")) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.play();
        audio.onended = () => URL.revokeObjectURL(url);
        return;
      }
    } catch {}

    // Fallback to browser TTS
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.85;
      window.speechSynthesis.speak(utterance);
    }
  }

  async function analyze() {
    if (analyzing) return;
    setAnalyzing(true);
    onLoading?.(true);
    setAnalysisError("");

    try {
      // Step 1: Get mood
      let detectedMood: MoodResult;
      if (streaming) {
        setStatus("Scanning your emotional wavelength...");
        const image = captureFrame();
        if (!image) throw new Error("Failed to capture frame");
        const moodRes = await fetch("/api/mood", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image }),
        });
        detectedMood = await moodRes.json();
      } else {
        // Fallback manual mood
        detectedMood = {
          mood: fallbackMood || "contemplative",
          description: "manually selected",
        };
      }
      setMood(detectedMood);

      // Step 2: Get weather
      setStatus("Consulting the atmospheric data stream...");
      const weatherRes = await fetch("/api/weather?city=Cairo");
      const weather: WeatherResult = await weatherRes.json();

      // Step 3: Get sandwich verdict
      setStatus("Deploying Gemini Oracle...");
      const sandwichRes = await fetch("/api/sandwich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mood: detectedMood, weather }),
      });
      const verdict: SandwichVerdict = await sandwichRes.json();

      // Step 4: Play voice
      setStatus("Broadcasting verdict...");
      const voiceText = `YOUR SANDWICH IS: ${verdict.sandwich}. ${verdict.reasoning}`;
      await playVoice(voiceText);

      setStatus("");
      onVerdict?.(verdict, detectedMood, weather);
    } catch (err) {
      setAnalysisError("System failure. The sandwich remains unknown.");
      console.error(err);
    } finally {
      setAnalyzing(false);
      onLoading?.(false);
    }
  }

  const MOOD_OPTIONS = [
    "melancholic", "joyful", "anxious", "contemplative",
    "existential", "euphoric", "furious", "serene",
  ];

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <div className="relative w-full max-w-md rounded-lg overflow-hidden border border-zinc-700 bg-black">
        {streaming ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full"
          />
        ) : (
          <div className="flex items-center justify-center h-48 text-zinc-500 text-sm">
            {cameraError || "Camera unavailable"}
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {!streaming && (
        <div className="w-full max-w-md">
          <p className="text-zinc-400 text-xs mb-2">Manual mood override:</p>
          <select
            className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 rounded px-3 py-2 text-sm"
            value={fallbackMood}
            onChange={(e) => setFallbackMood(e.target.value)}
          >
            <option value="">Select mood...</option>
            {MOOD_OPTIONS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      )}

      {mood && (
        <p className="text-zinc-400 text-xs">
          Detected: <span className="text-green-400 font-mono">{mood.mood}</span> — {mood.description}
        </p>
      )}

      {status && (
        <p className="text-yellow-400 text-xs font-mono animate-pulse">{status}</p>
      )}

      {analysisError && (
        <p className="text-red-400 text-xs">{analysisError}</p>
      )}

      <button
        onClick={analyze}
        disabled={analyzing}
        className="px-8 py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold rounded-full text-sm uppercase tracking-widest transition-colors"
      >
        {analyzing ? "Computing..." : "What should I eat?"}
      </button>
    </div>
  );
}
