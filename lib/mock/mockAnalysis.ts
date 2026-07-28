import type { AnalysisResult } from "@/lib/schemas";

/**
 * Realistic mock result standing in for a real MCP server response.
 * Matches the example architecture: React + Vercel, Azure API Management,
 * Azure OpenAI, Blob Storage, PostgreSQL, Microsoft Entra ID.
 */
export const MOCK_ANALYSIS_RESULT: AnalysisResult = {
  architectureSummary: [
    "React frontend hosted on Vercel",
    "Azure API Management gateway",
    "Azure OpenAI service",
    "Azure Blob Storage for uploaded documents",
    "PostgreSQL database",
    "Microsoft Entra ID authentication",
  ],
  findings: [
    {
      title: "Public API exposure without strong gateway controls",
      severity: "High",
      description:
        "Attackers may abuse exposed API endpoints, submit malicious or oversized payloads, or bypass intended usage controls.",
      recommendation:
        "Require signed JWT validation on every route, enforce per-client rate limiting, and place a WAF in front of the gateway.",
      frameworkTags: ["OWASP API4:2023", "OWASP LLM01", "MITRE ATT&CK T1190", "NIST 800-53 SC-5"],
    },
    {
      title: "Sensitive uploaded documents sent to AI services",
      severity: "High",
      description:
        "Sensitive or regulated data could be exposed through unsafe document handling or AI prompt injection.",
      recommendation:
        "Scan uploaded files, classify data before processing, use private storage access, and add prompt-injection filtering.",
      frameworkTags: ["OWASP LLM02", "OWASP LLM01", "NIST AI RMF Map", "ISO 42001 A.6"],
    },
    {
      title: "Database access from application services",
      severity: "Medium",
      description:
        "Weak network segmentation or exposed credentials could allow unauthorized database access.",
      recommendation:
        "Use private networking, managed identities, least-privilege database roles, and secrets stored in Azure Key Vault.",
      frameworkTags: ["OWASP API8:2023", "MITRE ATT&CK T1078", "NIST 800-53 AC-6"],
    },
  ],
  attackPaths: [
    {
      path: "Internet User → Vercel Frontend → API Gateway → Azure OpenAI",
      scenario: "Prompt injection, API abuse, excessive requests, unauthorized access.",
      mitigation: "Enforce authentication and schema validation at the gateway; apply rate limiting.",
    },
  ],
  mermaidCode: `flowchart LR
    user((Internet User))
    frontend[Frontend - Vercel]
    idp((Microsoft Entra ID))
    gateway[API Gateway]
    ai[Azure OpenAI]
    storage[(Blob Storage)]
    db[(PostgreSQL)]
    user -->|sign-in| idp
    user --> frontend
    frontend --> gateway
    gateway --> ai
    gateway --> db
    gateway --> storage
    classDef security fill:#0ea5e9,stroke:#0369a1,color:#fff;
    class idp security;
    class gateway security;`,
};
