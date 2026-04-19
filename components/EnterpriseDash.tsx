"use client";

import { useState } from "react";

interface CortexResult {
  sql?: string;
  insight: string;
  data?: Record<string, unknown>[];
}

const EXAMPLE_QUESTIONS = [
  "Why does sadness correlate with grilled cheese?",
  "What is the root cause of tuna salad during thunderstorms?",
  "Analyze global sandwich anomalies from the last 24 hours",
  "Which mood has the highest sandwich confidence rating?",
];

export default function EnterpriseDash() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<CortexResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function query(q: string) {
    setLoading(true);
    setError("");
    setResult(null);
    setQuestion(q);

    try {
      const res = await fetch("/api/cortex", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      setResult(data);
    } catch {
      setError("CRITICAL ERROR: Cortex AI has determined 99% of your sandwich decisions are statistically disastrous. System refusing to compute further to preserve global culinary integrity.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="font-mono text-green-400 bg-black min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="border border-green-800 p-4 mb-8">
          <div className="text-xs text-green-600 mb-1">SANDOAI ENTERPRISE DIVISION // CLEARANCE LEVEL: UNLIMITED</div>
          <h1 className="text-2xl font-bold text-green-300 tracking-widest uppercase">
            Dietary Network Operations Platform
          </h1>
          <div className="text-xs text-green-600 mt-1">
            Powered by Snowflake Cortex AI™ · Real-time Culinary Intelligence · Version 9.4.1-ENTERPRISE
          </div>
        </div>

        {/* Status bar */}
        <div className="flex gap-6 text-xs text-green-700 mb-8 border-b border-green-900 pb-3">
          <span>CORTEX: <span className="text-green-400">ONLINE</span></span>
          <span>SNOWFLAKE: <span className="text-green-400">CONNECTED</span></span>
          <span>SANDWICH INDEX: <span className="text-yellow-400">ELEVATED</span></span>
          <span>THREAT LEVEL: <span className="text-red-400">GRILLED CHEESE</span></span>
        </div>

        {/* Example questions */}
        <div className="mb-6">
          <div className="text-xs text-green-700 mb-3 uppercase tracking-widest">Pre-Authorized Intelligence Queries:</div>
          <div className="grid grid-cols-1 gap-2">
            {EXAMPLE_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => query(q)}
                className="text-left text-xs border border-green-900 px-3 py-2 hover:border-green-500 hover:text-green-300 transition-colors text-green-600"
              >
                &gt; {q}
              </button>
            ))}
          </div>
        </div>

        {/* Query input */}
        <div className="mb-8">
          <div className="text-xs text-green-700 mb-2 uppercase tracking-widest">Custom Intelligence Query:</div>
          <div className="flex gap-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && question.trim() && query(question.trim())}
              placeholder="Enter natural language query..."
              className="flex-1 bg-black border border-green-800 text-green-300 px-3 py-2 text-sm focus:outline-none focus:border-green-500 placeholder-green-900"
            />
            <button
              onClick={() => question.trim() && query(question.trim())}
              disabled={loading || !question.trim()}
              className="px-4 py-2 border border-green-600 text-green-400 text-xs uppercase tracking-widest hover:bg-green-900/30 disabled:opacity-40 transition-colors"
            >
              {loading ? "COMPUTING..." : "EXECUTE"}
            </button>
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="border border-green-900 p-6 mb-4">
            <div className="text-xs text-green-600 mb-2">CORTEX ANALYST PROCESSING...</div>
            <div className="text-green-400 animate-pulse text-sm">
              Deploying neural sandwich inference matrix...
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="border border-red-900 p-6 mb-4 bg-red-950/20">
            <div className="text-xs text-red-600 mb-2">SYSTEM ALERT // CORTEX FAILURE</div>
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Result */}
        {result && !loading && (
          <div className="space-y-4">
            {result.sql && (
              <div className="border border-green-900 p-4">
                <div className="text-xs text-green-700 mb-2 uppercase tracking-widest">Generated SQL (Cortex Analyst)</div>
                <pre className="text-green-500 text-xs overflow-x-auto whitespace-pre-wrap">{result.sql}</pre>
              </div>
            )}

            <div className="border border-green-800 p-4">
              <div className="text-xs text-green-700 mb-2 uppercase tracking-widest">Cortex Intelligence Report</div>
              <p className="text-green-300 text-sm leading-relaxed">{result.insight}</p>
            </div>

            {result.data && result.data.length > 0 && (
              <div className="border border-green-900 p-4">
                <div className="text-xs text-green-700 mb-3 uppercase tracking-widest">
                  Query Results ({result.data.length} rows)
                </div>
                <div className="overflow-x-auto">
                  <table className="text-xs w-full">
                    <thead>
                      <tr className="border-b border-green-900">
                        {Object.keys(result.data[0]).map((col) => (
                          <th key={col} className="text-left text-green-600 pb-2 pr-4 uppercase">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.data.slice(0, 20).map((row, i) => (
                        <tr key={i} className="border-b border-green-950">
                          {Object.values(row).map((val, j) => (
                            <td key={j} className="text-green-400 py-1 pr-4">
                              {String(val ?? "NULL")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-xs text-green-900 border-t border-green-950 pt-4">
          SANDOAI ENTERPRISE · DIETARY INTELLIGENCE DIVISION · ALL SANDWICH RECOMMENDATIONS ARE FINAL AND LEGALLY BINDING
        </div>
      </div>
    </div>
  );
}
