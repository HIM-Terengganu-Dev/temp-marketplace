import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, BrainCircuit, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";

interface AiAnalysisProps {
  startDate: string;
  endDate: string;
  activePreset: string;
  totals: {
    revenue: number;
    spend: number;
    roas: number;
    cogs: number;
    profit: number;
    margin: number;
  };
  shops: any[];
  comparison: {
    gmv: number;
    spend: number;
    roas: number;
  };
}

export function AiAnalysis({
  startDate,
  endDate,
  activePreset,
  totals,
  shops,
  comparison,
}: AiAnalysisProps) {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<{ code?: string; message: string } | null>(null);

  const fetchAnalysis = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/analysis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startDate,
          endDate,
          activePreset,
          totals,
          shops,
          comparison,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw { code: data.error, message: data.message || "Failed to generate analysis." };
      }

      setAnalysis(data.analysis);
    } catch (err: any) {
      console.error("AI Analysis error:", err);
      setError({
        code: err.code || "UNKNOWN",
        message: err.message || "An unexpected error occurred.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to render markdown-like highlights or list items simply
  const renderFormattedText = (text: string) => {
    return text.split("\n").map((line, idx) => {
      // Bold transformations
      let processed = line;
      const boldRegex = /\*\*(.*?)\*\*/g;
      const parts = [];
      let lastIndex = 0;
      let match;

      while ((match = boldRegex.exec(line)) !== null) {
        if (match.index > lastIndex) {
          parts.push(line.substring(lastIndex, match.index));
        }
        parts.push(
          <strong key={match.index} className="text-amber-400 font-semibold">
            {match[1]}
          </strong>
        );
        lastIndex = boldRegex.lastIndex;
      }
      if (lastIndex < line.length) {
        parts.push(line.substring(lastIndex));
      }

      const content = parts.length > 0 ? parts : processed;

      if (line.startsWith("### ")) {
        return (
          <h4 key={idx} className="text-sm font-bold text-white mt-4 mb-2 flex items-center gap-1.5 border-b border-white/5 pb-1">
            {line.replace("### ", "")}
          </h4>
        );
      }
      if (line.startsWith("## ")) {
        return (
          <h3 key={idx} className="text-base font-bold text-white mt-4 mb-2">
            {line.replace("## ", "")}
          </h3>
        );
      }
      if (line.startsWith("# ")) {
        return (
          <h2 key={idx} className="text-lg font-black text-white mt-4 mb-2">
            {line.replace("# ", "")}
          </h2>
        );
      }
      if (line.startsWith("- ") || line.startsWith("* ")) {
        return (
          <li key={idx} className="text-xs text-zinc-300 leading-relaxed ml-4 list-disc my-1">
            {content}
          </li>
        );
      }
      if (line.trim() === "") {
        return <div key={idx} className="h-2" />;
      }
      return (
        <p key={idx} className="text-xs text-zinc-300 leading-relaxed my-1">
          {content}
        </p>
      );
    });
  };

  return (
    <Card className="relative overflow-hidden border border-purple-500/20 dark:border-purple-500/30 bg-gradient-to-br from-purple-950/20 via-zinc-900/50 to-zinc-950/50 backdrop-blur-md rounded-2xl shadow-xl shadow-purple-950/5">
      <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl" />
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm font-bold flex items-center gap-2 text-white">
          <BrainCircuit className="h-4.5 w-4.5 text-purple-400 animate-pulse" />
          Gemini AI Overview Analysis
        </CardTitle>
        {analysis && !isLoading && (
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchAnalysis}
            className="h-7 px-2.5 rounded-lg text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 text-[10px] font-bold gap-1 cursor-pointer"
          >
            <RefreshCw className="h-3 w-3" />
            Re-Analyze
          </Button>
        )}
      </CardHeader>
      <CardContent className="min-h-[120px] flex flex-col justify-center">
        {!analysis && !isLoading && !error && (
          <div className="text-center py-6">
            <p className="text-xs text-zinc-400 mb-4 max-w-md mx-auto">
              Get an instant, actionable breakdown of your GMV, spend, and ROAS across all Shopee and TikTok shops for this period.
            </p>
            <Button
              onClick={fetchAnalysis}
              className="bg-gradient-to-r from-purple-600 to-indigo-650 hover:from-purple-500 hover:to-indigo-550 text-white rounded-xl px-5 h-9 text-xs font-bold gap-1.5 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 transition-all duration-300 cursor-pointer"
            >
              <Sparkles className="h-4 w-4 text-amber-300" />
              Analyze Performance
            </Button>
          </div>
        )}

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
            <div className="relative flex items-center justify-center">
              <div className="h-10 w-10 rounded-full border-2 border-t-purple-500 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
              <BrainCircuit className="h-5 w-5 text-purple-400 absolute" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold text-white">Synthesizing data...</p>
              <p className="text-[10px] text-zinc-500">Gemini is checking shop metrics & profitability</p>
            </div>
          </div>
        )}

        {error && (
          <div className="border border-red-500/20 bg-red-500/5 rounded-xl p-4 flex gap-3 items-start my-2">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-white">AI Analysis Failed</p>
              <p className="text-xs text-zinc-400">{error.message}</p>
              {error.code === "API_KEY_MISSING" && (
                <div className="bg-zinc-950/50 p-2.5 rounded-lg border border-white/5 mt-3 text-[10px] text-zinc-500 leading-normal">
                  To fix: Open your <code className="text-amber-400 font-mono">.env.local</code> file and add:
                  <pre className="text-zinc-300 font-mono mt-1 select-all bg-black/45 p-1 rounded">GEMINI_API_KEY=&quot;your_api_key_here&quot;</pre>
                  Get a free key from <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer" className="text-purple-400 underline hover:text-purple-300">Google AI Studio</a>.
                </div>
              )}
            </div>
          </div>
        )}

        {analysis && !isLoading && (
          <div className="space-y-1 py-1 max-h-[400px] overflow-y-auto pr-1">
            {renderFormattedText(analysis)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
