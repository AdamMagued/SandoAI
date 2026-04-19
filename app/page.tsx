'use client';

import { useState } from 'react';
import Webcam from '../components/Webcam';
import VerdictScreen from '../components/VerdictScreen';
import SolanaButton from '../components/SolanaButton';
import Ticker from '../components/Ticker';

export interface ResultData {
  sandwich: string;
  reasoning: string;
  confidence: number;
  urgency: string;
}

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [loadingState, setLoadingState] = useState('');
  const [result, setResult] = useState<ResultData | null>(null);

  const startOracleProcess = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      // 1. Mood Detection (Adam)
      setLoadingState('ANALYZING EMOTIONAL DECOMPOSITION...');
      const moodRes = await fetch('/api/mood', { method: 'POST' });
      const { mood, description } = await moodRes.json();

      // 2. Weather Context (Adam)
      setLoadingState('PROBING ATMOSPHERIC ANOMALIES...');
      const weatherRes = await fetch('/api/weather');
      const weather = await weatherRes.json();

      // 3. Sandwich Oracle (Adam)
      setLoadingState('CONSULTING THE ANCIENT DELI...');
      const oracleRes = await fetch('/api/sandwich', {
        method: 'POST',
        body: JSON.stringify({ mood, weather }),
      });
      const data: ResultData = await oracleRes.json();
      setResult(data);

      // 4. Telemetry (Lakshay) - Async background
      setLoadingState('UPLOADING TELEMETRY TO SNOWFLAKE...');
      fetch('/api/telemetry', {
        method: 'POST',
        body: JSON.stringify(data),
      }).catch(console.error);

      // 5. Voice (Adam)
      setLoadingState('SYNTHESIZING DRAMATIC VERDICT...');
      const voiceRes = await fetch('/api/voice', {
        method: 'POST',
        body: JSON.stringify({ text: `${data.sandwich}. ${data.reasoning}` }),
      });
      if (voiceRes.ok) {
        const audioBlob = await voiceRes.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.play();
      } else {
        // Fallback to browser speech
        const utterance = new SpeechSynthesisUtterance(`${data.sandwich}. ${data.reasoning}`);
        window.speechSynthesis.speak(utterance);
      }

    } catch (err) {
      console.error('Oracle failure', err);
      // Failsafe error
      setResult({
        sandwich: 'Hardboiled Existentialism',
        reasoning: 'The system has collapsed under the weight of your indecision. Eat anything. Or nothing. It does not matter.',
        confidence: 99.9,
        urgency: 'SYSTEM_FAILURE'
      });
    } finally {
      setLoading(false);
      setLoadingState('');
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Ticker />
      
      <div className="flex-grow max-w-4xl mx-auto w-full px-6 py-12">
        {!result && (
          <div className="flex flex-col gap-12 items-center">
            <div className="w-full max-w-2xl">
              <Webcam />
            </div>

            <button
              onClick={startOracleProcess}
              disabled={loading}
              className={`
                px-12 py-6 text-2xl font-black transition-all duration-300 transform active:scale-95
                ${loading 
                  ? 'bg-foreground/20 text-foreground/50 cursor-not-allowed border border-foreground/30' 
                  : 'bg-foreground text-background hover:shadow-[0_0_50px_rgba(0,255,65,0.4)] hover:-translate-y-1'
                }
              `}
            >
              {loading ? (
                <div className="flex flex-col items-center gap-2">
                  <span className="animate-pulse">{loadingState}</span>
                </div>
              ) : (
                'COMMENCE DIETARY ANALYSIS'
              )}
            </button>
            
            {!loading && (
              <p className="text-text-dim text-xs font-mono uppercase tracking-widest opacity-60">
                Warning: AI-generated culinary advice may cause philosophical distress.
              </p>
            )}
          </div>
        )}

        {result && (
          <div className="animate-in fade-in duration-1000">
            <VerdictScreen {...result} />
            
            <div className="flex justify-center mt-8 gap-6">
              <SolanaButton sandwich={result.sandwich} />
              <button 
                onClick={() => setResult(null)}
                className="px-8 py-4 border border-foreground/20 hover:border-foreground/50 text-xs transition-colors"
              >
                [ RESET ANALYZER ]
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
