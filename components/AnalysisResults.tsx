"use client";

import { useState } from "react";
import { LayoutGrid, ShieldAlert, Route, Workflow, Info } from "lucide-react";
import type { AnalysisResult, Severity } from "@/lib/schemas";
import MermaidDiagram from "./MermaidDiagram";

interface Props {
  result: AnalysisResult;
}

type TabId = "overview" | "findings" | "attackPaths" | "diagram";

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "findings", label: "Findings", icon: ShieldAlert },
  { id: "attackPaths", label: "Attack Paths", icon: Route },
  { id: "diagram", label: "Diagram", icon: Workflow },
];

const SEVERITY_STYLES: Record<Severity, string> = {
  Critical: "bg-critical/15 text-critical border-critical/40",
  High: "bg-high/15 text-high border-high/40",
  Medium: "bg-medium/15 text-medium border-medium/40",
  Low: "bg-low/15 text-low border-low/40",
};

function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${SEVERITY_STYLES[severity]}`}
    >
      {severity}
    </span>
  );
}

export default function AnalysisResults({ result }: Props) {
  const [tab, setTab] = useState<TabId>("overview");

  return (
    <div className="mt-6 rounded-lg border border-panelBorder bg-panel">
      <div className="flex flex-wrap gap-1 border-b border-panelBorder p-2">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition ${
              tab === id
                ? "bg-accentSoft/15 text-accent"
                : "text-slate-300 hover:bg-white/5 hover:text-slate-100"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      <div className="p-5">
        {tab === "overview" && (
          <div>
            <p className="mb-2 font-mono text-xs uppercase tracking-widest text-slate-300">
              Architecture Summary
            </p>
            <ul className="space-y-1.5">
              {result.architectureSummary.map((item, i) => (
                <li key={i} className="flex gap-2 text-sm text-slate-200">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {tab === "findings" && (
          <div className="space-y-4">
            {result.findings.map((f, i) => (
              <div key={i} className="rounded-md border border-panelBorder bg-panel2 p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="font-medium text-slate-100">
                    {i + 1}. {f.title}
                  </h3>
                  <SeverityBadge severity={f.severity} />
                </div>
                <p className="text-sm text-slate-300">
                  <span className="text-slate-300">Risk: </span>
                  {f.description}
                </p>
                <p className="mt-2 text-sm text-slate-200">
                  <span className="text-accent">Recommendation: </span>
                  {f.recommendation}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5 border-t border-dashed border-panelBorder pt-3">
                  {f.frameworkTags.map((tag) => {
  const colorClass = tag.startsWith("OWASP")
    ? "bg-indigo/10 text-indigo border-indigo/30"
    : tag.startsWith("MITRE")
    ? "bg-purple/10 text-purple border-purple/30"
    : tag.startsWith("NIST")
    ? "bg-teal/10 text-teal border-teal/30"
    : tag.startsWith("ISO")
    ? "bg-pink/10 text-pink border-pink/30"
    : "bg-panel2 text-slate-300 border-panelBorder";
  return (
    <span
      key={tag}
      className={`rounded border px-2 py-0.5 font-mono text-[10px] font-medium ${colorClass}`}
    >
      {tag}
    </span>
  );
})}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "attackPaths" && (
          <div className="space-y-4">
            {result.attackPaths.map((ap, i) => (
              <div key={i} className="rounded-md border border-panelBorder bg-panel2 p-4">
                <p className="font-mono text-sm text-accent">{ap.path}</p>
                <p className="mt-2 text-sm text-slate-300">
                  <span className="text-slate-300">Scenario: </span>
                  {ap.scenario}
                </p>
                <p className="mt-1 text-sm text-slate-200">
                  <span className="text-low">Mitigation: </span>
                  {ap.mitigation}
                </p>
              </div>
            ))}
          </div>
        )}

        {tab === "diagram" && <MermaidDiagram mermaidCode={result.mermaidCode} />}
      </div>

      <div className="flex items-start gap-2 border-t border-panelBorder p-4 text-xs text-slate-300">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <p>
          This is an educational security assessment tool intended for demonstration purposes. It
          does not replace a professional security review, penetration test, or compliance audit.
        </p>
      </div>
    </div>
  );
}
