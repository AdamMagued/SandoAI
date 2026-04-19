"use client";

import { useState } from "react";
import Webcam from "./Webcam";
import VerdictReveal, {
  type VerdictPayload,
  type VerdictContext,
} from "./VerdictReveal";
import Ticker from "./Ticker";
import JudgeQrPanel from "./JudgeQrPanel";

interface State {
  verdict: VerdictPayload;
  context: VerdictContext;
}

export default function HomeExperience() {
  const [state, setState] = useState<State | null>(null);

  return (
    <div className="flex w-full flex-col items-stretch gap-8">
      <div className="flex w-full flex-col gap-6">
        <Webcam
          onVerdict={(verdict, mood, weather) => {
            setState({
              verdict,
              context: {
                mood: mood.mood,
                weather: weather.condition,
                city: weather.city,
                timeOfDay: weather.timeOfDay,
                localHour: weather.localHour,
              },
            });
          }}
        />
        {state && (
          <VerdictReveal
            verdict={state.verdict}
            context={state.context}
            onUpdateVerdict={(v) =>
              setState((prev) =>
                prev ? { ...prev, verdict: { ...prev.verdict, ...v } } : prev
              )
            }
          />
        )}
      </div>

      <Ticker />
      <JudgeQrPanel />
    </div>
  );
}
