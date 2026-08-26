"use client";

import { useRef, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import ArchitectureInput from "@/components/ArchitectureInput";
import ChatPanel, { ChatPanelHandle, Finding, Severity } from "@/components/ChatPanel";

type View = "dashboard" | "assessment" | "findings";

function parseControlId(title: string): { control: string; framework: string; description: string } {
  const match = title.match(/^\[(.+?)\]\s*(.*)/);
  if (match) {
    const full = match[1]; // e.g. "NIST 800-53 IA-2"
    const parts = full.split(" ");
    const framework = parts.slice(0, -1).join(" ") || full;
    return { control: full, framework, description: match[2] };
  }
  return { control: "—", framework: "Unspecified", description: title };
}

const SEV_COLOR: Record<Severity, string> = {
  high: "var(--red)",
  medium: "var(--sev-med)",
  low: "var(--sev-low)",
};

function SeverityDonut({ findings }: { findings: Finding[] }) {
  const total = findings.length;
  const high = findings.filter((f) => f.severity === "high").length;
  const medium = findings.filter((f) => f.severity === "medium").length;
  const low = findings.filter((f) => f.severity === "low").length;

  const r = 62;
  const circumference = 2 * Math.PI * r;
  const segments: { count: number; color: string }[] = [
    { count: high, color: "var(--red)" },
    { count: medium, color: "var(--sev-med)" },
    { count: low, color: "var(--sev-low)" },
  ];

  let offsetSoFar = 0;
  const arcs = segments.map((s, i) => {
    const fraction = total === 0 ? 0 : s.count / total;
    const dash = fraction * circumference;
    const arc = (
      <circle
        key={i}
        cx="80"
        cy="80"
        r={r}
        fill="none"
        stroke={s.color}
        strokeWidth="14"
        strokeDasharray={`${dash} ${circumference - dash}`}
        strokeDashoffset={-offsetSoFar}
        strokeLinecap="butt"
        transform="rotate(-90 80 80)"
      />
    );
    offsetSoFar += dash;
    return arc;
  });

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
      <svg width="160" height="160" viewBox="0 0 160 160">
        <circle cx="80" cy="80" r={r} fill="none" stroke="var(--line-soft)" strokeWidth="14" />
        {total > 0 && arcs}
        <text x="80" y="76" textAnchor="middle" fontSize="26" fontWeight="700" fill="var(--t-strong)">
          {total}
        </text>
        <text x="80" y="96" textAnchor="middle" fontSize="11" fill="var(--t-muted)">
          findings
        </text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {(["high", "medium", "low"] as Severity[]).map((sev) => {
          const count = findings.filter((f) => f.severity === sev).length;
          return (
            <div key={sev} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{ width: 8, height: 8, borderRadius: "50%", background: SEV_COLOR[sev], display: "inline-block" }}
              />
              <span style={{ fontSize: 12.5, color: "var(--t-body)", width: 60, textTransform: "capitalize" }}>{sev}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--t-strong)" }}>{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FrameworkBreakdown({ findings }: { findings: Finding[] }) {
  const counts = new Map<string, number>();
  findings.forEach((f) => {
    const { framework } = parseControlId(f.title);
    counts.set(framework, (counts.get(framework) ?? 0) + 1);
  });
  const entries = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const max = entries.length > 0 ? entries[0][1] : 1;

  if (entries.length === 0) {
    return <p style={{ fontSize: 13, color: "var(--t-muted)" }}>No frameworks cited yet.</p>;
  }

  return (
    <>
      {entries.map(([framework, count]) => (
        <div className="fw" key={framework}>
          <div className="fw-top">
            <span className="fw-name">{framework}</span>
            <span className="fw-num">
              <b>{count}</b> finding{count !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="bar">
            <span style={{ width: `${(count / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </>
  );
}

export default function Home() {
  const [view, setView] = useState<View>("dashboard");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const chatRef = useRef<ChatPanelHandle>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function handleAnalyze() {
    if (!description.trim()) return;
    setIsLoading(true);
    chatRef.current?.sendMessage(description);
    setTimeout(() => setIsLoading(false), 400);
  }

  function handleNewFindings(newFindings: Finding[]) {
    setFindings((prev) => [...prev, ...newFindings]);
  }

  function handleUploadClick() {
    setUploadError(null);
    fileInputRef.current?.click();
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
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

  const highCount = findings.filter((f) => f.severity === "high").length;
  const mediumCount = findings.filter((f) => f.severity === "medium").length;
  const lowCount = findings.filter((f) => f.severity === "low").length;
  const frameworksCited = new Set(findings.map((f) => parseControlId(f.title).framework)).size;

  const topFindings = [...findings]
    .sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return order[a.severity] - order[b.severity];
    })
    .slice(0, 3);

  return (
    <div className="app">
      <Sidebar activeView={view} onNavigate={setView} findingsCount={findings.length} />

      <div className="main">
        <Topbar crumb={view === "dashboard" ? "Dashboard" : view === "findings" ? "Findings" : "Assessment"} />

        {view === "dashboard" && (
          <section className="view active">
            <div className="page-head">
              <div>
                <h1>Dashboard</h1>
                <p className="page-sub">
                  {findings.length === 0 ? "No assessment has run yet." : `${findings.length} findings from your session.`}
                </p>
              </div>
              <div className="head-actions">
                <button className="btn btn-danger" onClick={() => setView("assessment")}>
                  Run assessment
                </button>
              </div>
            </div>

            {findings.length > 0 && (
              <div className="stats">
                <div className="stat">
                  <div className="stat-top">
                    <div className="stat-ico">
                      <svg viewBox="0 0 20 20"><path d="M10 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16Z" /></svg>
                    </div>
                    <span className="stat-label">Findings this session</span>
                  </div>
                  <div className="stat-value">{findings.length}</div>
                </div>
                <div className="stat">
                  <div className="stat-top">
                    <div className="stat-ico red">
                      <svg viewBox="0 0 20 20"><path d="M10 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16Z" /></svg>
                    </div>
                    <span className="stat-label">High severity</span>
                  </div>
                  <div className="stat-value danger">{highCount}</div>
                </div>
                <div className="stat">
                  <div className="stat-top">
                    <div className="stat-ico orange">
                      <svg viewBox="0 0 20 20"><path d="M10 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16Z" /></svg>
                    </div>
                    <span className="stat-label">Medium severity</span>
                  </div>
                  <div className="stat-value orange">{mediumCount}</div>
                </div>
                <div className="stat">
                  <div className="stat-top">
                    <div className="stat-ico amber">
                      <svg viewBox="0 0 20 20"><path d="M10 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16Z" /></svg>
                    </div>
                    <span className="stat-label">Low severity</span>
                  </div>
                  <div className="stat-value amber">{lowCount}</div>
                </div>
                <div className="stat">
                  <div className="stat-top">
                    <div className="stat-ico">
                      <svg viewBox="0 0 20 20"><path d="M10 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16Z" /></svg>
                    </div>
                    <span className="stat-label">Frameworks cited</span>
                  </div>
                  <div className="stat-value">{frameworksCited}</div>
                </div>
              </div>
            )}

            <div className={`exposure${findings.length === 0 ? " clear" : ""}`}>
              <div className="exposure-head">
                <div>
                  <h2>What&apos;s exposed</h2>
                  <p>Failed controls appear here, ranked by severity.</p>
                </div>
                <span className="rank-tag">Ranked by severity</span>
              </div>

              {findings.length === 0 ? (
                <div className="exposure-empty">
                  <b>No assessment has run yet</b>
                  Describe your architecture on the Assessment screen. Every finding is checked against a live
                  control from a real compliance framework.
                </div>
              ) : (
                <div className="top-fails">
                  {topFindings.map((f, i) => {
                    const { control, description: desc } = parseControlId(f.title);
                    return (
                      <div className="fail-card" key={i}>
                        <div className="cid mono">{control}</div>
                        <div className="txt">{desc}</div>
                        <div className="meta">
                          <span>{f.severity.toUpperCase()}</span>
                          <span className="dot" />
                          <span>This session</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        )}

        {view === "findings" && (
          <section className="view active">
            <div className="page-head">
              <div>
                <h1>Findings</h1>
                <p className="page-sub">
                  {findings.length === 0
                    ? "No findings yet — run an assessment to populate this list."
                    : `All ${findings.length} findings from this session.`}
                </p>
              </div>
            </div>

            {findings.length === 0 ? (
              <div className="panel">
                <div className="panel-body">
                  <div className="log-empty">
                    <b>Nothing here yet</b>
                    Findings will appear here as soon as you run an assessment.
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="grid-2" style={{ marginBottom: 16 }}>
                  <div className="panel">
                    <div className="panel-head">
                      <h3>Severity breakdown</h3>
                    </div>
                    <div className="panel-body">
                      <SeverityDonut findings={findings} />
                    </div>
                  </div>

                  <div className="panel">
                    <div className="panel-head">
                      <h3>By framework</h3>
                    </div>
                    <div className="panel-body">
                      <FrameworkBreakdown findings={findings} />
                    </div>
                  </div>
                </div>

                <div className="panel">
                  <div className="panel-head">
                    <h3>All findings</h3>
                  </div>
                  <table>
                    <thead>
                      <tr>
                        <th>Control</th>
                        <th>Finding</th>
                        <th>Severity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {findings.map((f, i) => {
                        const { control, description: desc } = parseControlId(f.title);
                        return (
                          <tr key={i}>
                            <td>
                              <div className="ctrl-id mono">{control}</div>
                            </td>
                            <td>
                              <div className="ctrl-req">{desc}</div>
                            </td>
                            <td>
                              <span className={`sev ${f.severity}`}>{f.severity}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
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
                  <ChatPanel ref={chatRef} onFindings={handleNewFindings} />
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
