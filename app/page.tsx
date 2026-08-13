"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import ArchitectureInput from "@/components/ArchitectureInput";
import AnalysisResults from "@/components/AnalysisResults";
import ChatPanel from "@/components/ChatPanel";
import { MOCK_ANALYSIS_RESULT } from "@/lib/mock/mockAnalysis";
import type { AnalysisResult } from "@/lib/schemas";

export default function Home() {
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  function handleAnalyze() {
    setIsLoading(true);
    setResult(null);
    setTimeout(() => {
      setResult(MOCK_ANALYSIS_RESULT);
      setIsLoading(false);
    }, 800);
  }

  return (
   <div className="grid h-screen grid-cols-1 lg:grid-cols-[1fr_380px] grid-rows-[auto_1fr] overflow-hidden">
      <header className="col-span-1 flex flex-wrap items-center justify-between gap-4 border-b border-panelBorder px-6 py-4 lg:col-span-2">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="h-5 w-5 text-accent" />
          <div>
            <h1 className="text-base font-semibold tracking-tight text-slate-100 sm:text-lg">
              AI Security Architect Assistant
            </h1>
            <p className="font-mono text-[11px] text-slate-500">
              Dashboard + conversational analysis, side by side
            </p>
          </div>
        </div>
        <span className="rounded-md border border-panelBorder bg-panel px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-slate-400">
          Mock Data Mode
        </span>
      </header>

      <main className="min-h-0 overflow-y-auto px-6 py-6">
        <div className="flex flex-col gap-6">
          <ArchitectureInput
            value={description}
            onChange={setDescription}
            onAnalyze={handleAnalyze}
            isLoading={isLoading}
          />
          {result && <AnalysisResults result={result} />}
        </div>
      </main>

     <aside className="hidden min-h-0 border-l border-panelBorder lg:flex lg:flex-col">
  <div className="h-full p-3">
    <ChatPanel />
  </div>
</aside>
    </div>
  );
}

