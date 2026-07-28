"use client";

import { ShieldAlert, Sparkles } from "lucide-react";

interface Template {
  id: string;
  name: string;
  description: string;
}

const TEMPLATES: Template[] = [
  {
    id: "doc-processing",
    name: "AI Document Processing App",
    description:
      "React frontend hosted on Vercel. Users authenticate with Microsoft Entra ID. The frontend sends requests through Azure API Management to Azure Functions. Users upload PDF documents to Azure Blob Storage. Azure OpenAI summarizes documents. PostgreSQL stores user profiles and document metadata.",
  },
  {
    id: "support-chatbot",
    name: "Customer Support AI Chatbot",
    description:
      "Next.js application hosted on Vercel. Users log in through Auth0. The application sends customer questions to an API gateway, which calls Azure OpenAI. Conversation history is stored in PostgreSQL. Uploaded customer files are stored in Azure Blob Storage.",
  },
  {
    id: "dev-assistant",
    name: "Internal Developer Assistant",
    description:
      "Internal React application hosted on Vercel. Employees authenticate through Microsoft Entra ID. The application connects to Azure OpenAI and a GitHub repository API. Secrets are stored in Azure Key Vault. Logs are sent to Microsoft Sentinel.",
  },
];

interface Props {
  value: string;
  onChange: (value: string) => void;
  onAnalyze: () => void;
  isLoading: boolean;
}

export default function ArchitectureInput({ value, onChange, onAnalyze, isLoading }: Props) {
  return (
    <div className="rounded-lg border border-panelBorder bg-panel p-5">
      <div className="mb-4 flex items-center gap-2">
        <ShieldAlert className="h-4 w-4 text-accent" />
        <h2 className="font-mono text-xs uppercase tracking-widest text-slate-400">
          Describe the architecture
        </h2>
      </div>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. A React app on Vercel calls an API gateway, which calls Azure OpenAI. Uploaded files go to Blob Storage."
        rows={7}
        maxLength={4000}
        className="w-full resize-y rounded-md border border-panelBorder bg-panel2 p-3 text-sm text-slate-200 placeholder:text-slate-600 focus:border-accent focus:outline-none"
      />
      <div className="mt-1 text-xs text-slate-600">{value.length} / 4000 characters</div>

      <div className="mt-4">
        <p className="mb-2 font-mono text-xs uppercase tracking-widest text-slate-500">
          Or start from an example
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange(t.description)}
              className="rounded-md border border-panelBorder bg-panel2 p-3 text-left text-xs text-slate-300 transition hover:border-accent/60"
            >
              <div className="mb-1 font-medium text-slate-200">{t.name}</div>
              <div className="line-clamp-2 text-slate-500">{t.description}</div>
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={onAnalyze}
        disabled={isLoading || value.trim().length < 20}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-md bg-accentSoft px-4 py-2.5 text-sm font-medium text-[#04141f] transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Sparkles className="h-4 w-4" />
        {isLoading ? "Analyzing…" : "Analyze Architecture"}
      </button>
    </div>
  );
}
