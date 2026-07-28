"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  mermaidCode: string;
}

/**
 * Strips constructs we never want rendered from diagram code (click
 * handlers, javascript: links, raw HTML) as defense-in-depth, even though
 * our own data source is trusted right now. This matters more once
 * Chunk 4 connects a live MCP server as the data source.
 */
function sanitizeMermaid(code: string): string {
  return code
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim().toLowerCase();
      if (trimmed.startsWith("click ")) return false;
      if (trimmed.includes("javascript:")) return false;
      if (trimmed.includes("<script")) return false;
      return true;
    })
    .map((line) => line.replace(/<[^>]*>/g, ""))
    .join("\n");
}

export default function MermaidDiagram({ mermaidCode }: Props) {
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSvg(null);
    setError(null);

    async function render() {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          securityLevel: "strict",
          themeVariables: {
            background: "#0d1420",
            primaryColor: "#111722",
            primaryTextColor: "#e5edf5",
            primaryBorderColor: "#38bdf8",
            lineColor: "#38bdf8",
            fontFamily: "JetBrains Mono, monospace",
          },
        });

        const clean = sanitizeMermaid(mermaidCode);
        const id = `mermaid-${Math.random().toString(36).slice(2)}`;
        const { svg: renderedSvg } = await mermaid.render(id, clean);
        if (!cancelled) setSvg(renderedSvg);
      } catch (err) {
        console.error("Mermaid render failed:", err);
        if (!cancelled) setError("Unable to render the diagram — invalid Mermaid syntax.");
      }
    }

    render();
    return () => {
      cancelled = true;
    };
  }, [mermaidCode]);

  if (error) {
    return (
      <div className="flex items-start gap-2 rounded-md border border-high/40 bg-high/10 p-4 text-sm text-high">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>{error}</p>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="rounded-md border border-panelBorder bg-panel2 p-4">
        <p className="font-mono text-xs text-slate-600">Rendering diagram…</p>
      </div>
    );
  }

  return (
    <div
      className="overflow-x-auto rounded-md border border-panelBorder bg-panel2 p-4 [&_svg]:mx-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
