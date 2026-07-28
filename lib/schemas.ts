import { z } from "zod";

/** Severity levels used throughout the UI for risk + badge coloring. */
export const SeveritySchema = z.enum(["Critical", "High", "Medium", "Low"]);
export type Severity = z.infer<typeof SeveritySchema>;

/** A single security risk/finding, tagged against relevant frameworks. */
export const FindingSchema = z.object({
  title: z.string(),
  severity: SeveritySchema,
  description: z.string(),
  recommendation: z.string(),
  frameworkTags: z.array(z.string()), // e.g. ["OWASP LLM01", "MITRE ATT&CK T1190"]
});
export type Finding = z.infer<typeof FindingSchema>;

/** A single attack path scenario. */
export const AttackPathSchema = z.object({
  path: z.string(),
  scenario: z.string(),
  mitigation: z.string(),
});
export type AttackPath = z.infer<typeof AttackPathSchema>;

/** The full analysis result returned for one architecture description. */
export const AnalysisResultSchema = z.object({
  architectureSummary: z.array(z.string()),
  findings: z.array(FindingSchema),
  attackPaths: z.array(AttackPathSchema),
  mermaidCode: z.string(),
});
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;

/** Input validation for the architecture description the user types in. */
export const AnalyzeRequestSchema = z.object({
  architectureDescription: z
    .string()
    .trim()
    .min(20, "Please describe the architecture in a bit more detail (min 20 characters).")
    .max(4000, "Architecture description is too long (max 4000 characters)."),
});
export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;
