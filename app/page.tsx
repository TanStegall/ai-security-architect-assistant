"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import ArchitectureInput from "@/components/ArchitectureInput";
import AnalysisResults from "@/components/AnalysisResults";
import { MOCK_ANALYSIS_RESULT } from "@/lib/mock/mockAnalysis";
import type { AnalysisResult } from "@/lib/schemas";

export default function Home() {
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  function handleAnalyze() {
    setIsLoading(true);
    setResult(null);
    // Simulated delay standing in for a real MCP server call — replaced in Chunk 4.
    setTimeout(() => {
      setResult(MOCK_ANALYSIS_RESULT);
      setIsLoading(false);
    }, 800);
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4 border-b border-panelBorder pb-5">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="h-6 w-6 text-accent" />
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-100 sm:text-2xl">
              AI Security Architect Assistant
            </h1>
            <p className="font-mono text-xs text-slate-500 sm:text-sm">
              AI-powered cloud architecture threat modeling and security guidance
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-md border border-panelBorder bg-panel px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-slate-400">
            Mock Data Mode
          </span>
        </div>
      </header>

      <ArchitectureInput
        value={description}
        onChange={setDescription}
        onAnalyze={handleAnalyze}
        isLoading={isLoading}
      />

      {result && <AnalysisResults result={result} />}
    </main>
  );
}

