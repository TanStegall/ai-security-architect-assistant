"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import ArchitectureInput from "@/components/ArchitectureInput";
import ChatPanel from "@/components/ChatPanel";
import { MOCK_ANALYSIS_RESULT } from "@/lib/mock/mockAnalysis";
import type { AnalysisResult } from "@/lib/schemas";

type View = "dashboard" | "assessment";

export default function Home() {
  const [view, setView] = useState<View>("dashboard");
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
    <div className="app">
      <Sidebar activeView={view} onNavigate={setView} findingsCount={0} />

      <div className="main">
        <Topbar crumb={view === "dashboard" ? "Dashboard" : "Assessment"} />

        {view === "dashboard" && (
          <section className="view active">
            <div className="page-head">
              <div>
                <h1>Dashboard</h1>
                <p className="page-sub">No assessment has run yet.</p>
              </div>
              <div className="head-actions">
                <button className="btn btn-danger" onClick={() => setView("assessment")}>
                  Run assessment
                </button>
              </div>
            </div>

            <div className="exposure clear">
              <div className="exposure-head">
                <div>
                  <h2>What&apos;s exposed</h2>
                  <p>Failed controls appear here, ranked by how much of the architecture they leave open.</p>
                </div>
                <span className="rank-tag">Ranked by exposure</span>
              </div>
              <div className="exposure-empty">
                <b>No assessment has run yet</b>
                Describe your architecture on the Assessment screen. Every finding is checked against a live
                control from a real compliance framework.
              </div>
            </div>
          </section>
        )}

        {view === "assessment" && (
          <section className="view active">
            <div className="page-head">
              <div>
                <h1>Assessment</h1>
                <p className="page-sub">
                  Describe the architecture in plain English. Each finding must cite a real control before it can
                  be reported.
                </p>
              </div>
            </div>

            <div className="assess-grid">
              <div className="panel">
                <div className="panel-head">
                  <h3>Architecture</h3>
                </div>
                <div className="panel-body">
                  <ArchitectureInput
                    value={description}
                    onChange={setDescription}
                    onAnalyze={handleAnalyze}
                    isLoading={isLoading}
                  />
                </div>
              </div>

              <div className="panel">
                <div className="panel-head">
                  <h3>Live control lookup</h3>
                </div>
                <div className="panel-body" style={{ minHeight: 400 }}>
                  <ChatPanel />
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}


