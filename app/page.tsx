"use client";

import { useRef, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import ArchitectureInput from "@/components/ArchitectureInput";
import ChatPanel, { ChatPanelHandle } from "@/components/ChatPanel";

type View = "dashboard" | "assessment";

export default function Home() {
  const [view, setView] = useState<View>("dashboard");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const chatRef = useRef<ChatPanelHandle>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function handleAnalyze() {
    if (!description.trim()) return;
    setIsLoading(true);
    chatRef.current?.sendMessage(description);
    setTimeout(() => setIsLoading(false), 400);
  }

  function handleUploadClick() {
    setUploadError(null);
    fileInputRef.current?.click();
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // reset so selecting the same file again still fires onChange
    if (!file) return;

    if (file.type !== "application/pdf") {
      setUploadError("Only PDF files are supported.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("File is too large. Max size is 10MB.");
      return;
    }

    setUploadError(null);
    setIsExtracting(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/extract-pdf", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setUploadError(data.error ?? "Something went wrong reading that PDF.");
        return;
      }

      setDescription(data.text);
    } catch {
      setUploadError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setIsExtracting(false);
    }
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
                  Describe the architecture in plain English, or upload a PDF. Each finding must cite a real
                  control before it can be reported.
                </p>
              </div>
            </div>

            <div className="assess-grid">
              <div className="panel">
                <div className="panel-head">
                  <h3>Architecture</h3>
                  <button
                    className="btn btn-ghost"
                    style={{ marginLeft: "auto", height: 32, padding: "0 12px", fontSize: 12.5 }}
                    onClick={handleUploadClick}
                    disabled={isExtracting}
                  >
                    {isExtracting ? "Reading PDF…" : "Upload PDF"}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileSelected}
                    style={{ display: "none" }}
                  />
                </div>
                <div className="panel-body">
                  {uploadError && (
                    <div
                      style={{
                        fontSize: 12.5,
                        color: "var(--red-dark)",
                        background: "var(--red-soft)",
                        border: "1px solid #F7C9CD",
                        borderRadius: 6,
                        padding: "8px 10px",
                        marginBottom: 12,
                      }}
                    >
                      {uploadError}
                    </div>
                  )}
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
                  <ChatPanel ref={chatRef} />
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
