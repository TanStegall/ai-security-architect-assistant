import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

/**
 * Step 4b: Real Claude-powered /api/chat route with tool-calling.
 *
 * Replaces the Step 4a-3 keyword-matching simulation. Claude now genuinely
 * decides which security checks are relevant to the user's message, "runs"
 * them (via a stub function below — see NOTE), and produces structured
 * findings through the report_findings tool. The response shape returned
 * to the frontend (`{ events: [...] }`) is unchanged, so ChatPanel.tsx
 * doesn't need to change.
 *
 * NOTE on check_component_security: this is still a STUB. It doesn't
 * actually scan your infrastructure — it returns a short canned assessment
 * so the tool-calling loop has something to work with. Step 4c will swap
 * this stub for real MCP server calls that inspect actual cloud resources.
 */

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You are a security architecture review assistant embedded in a dashboard tool. A user has described a software architecture (frontend, backend, hosting, auth, storage, etc.) and may ask follow-up questions about it.

Your job:
1. Identify which security-relevant components are worth checking based on what the user described or asked about (e.g. authentication, storage, network exposure, secrets management, logging).
2. For each relevant component, call the check_component_security tool to get an assessment.
3. Once you've gathered enough assessments, call report_findings with a short summary and a list of specific findings, each with a severity (high, medium, or low).

Only check components that are actually relevant to what the user described or asked — don't run every check every time. Keep the summary to 1-2 sentences. Findings should be short, specific, and actionable (mention the actual component or gap, not generic advice).`;

const tools: Anthropic.Tool[] = [
  {
    name: "check_component_security",
    description:
      "Runs a security assessment for a specific component type mentioned in the architecture (e.g. authentication, storage, network, secrets, logging). Returns a short assessment.",
    input_schema: {
      type: "object",
      properties: {
        component_type: {
          type: "string",
          enum: ["authentication", "storage", "network", "secrets", "logging", "other"],
          description: "The category of component being checked",
        },
        description: {
          type: "string",
          description: "Brief description of the specific component being checked, drawn from the user's architecture",
        },
      },
      required: ["component_type", "description"],
    },
  },
  {
    name: "report_findings",
    description: "Submits the final structured findings from the security review. Call this once, after all relevant checks are done.",
    input_schema: {
      type: "object",
      properties: {
        summary: {
          type: "string",
          description: "A 1-2 sentence summary of the review",
        },
        findings: {
          type: "array",
          items: {
            type: "object",
            properties: {
              severity: { type: "string", enum: ["high", "medium", "low"] },
              title: { type: "string", description: "A short, specific finding" },
            },
            required: ["severity", "title"],
          },
        },
      },
      required: ["summary", "findings"],
    },
  },
];

// STUB: simulates running a security check. Step 4c replaces this with
// real MCP server calls against actual infrastructure.
function runSecurityCheckStub(componentType: string, description: string): string {
  const canned: Record<string, string> = {
    authentication: "Reviewed identity provider and token handling configuration.",
    storage: "Checked container/bucket permissions and encryption-at-rest settings.",
    network: "Reviewed exposed endpoints and network-level access controls.",
    secrets: "Checked how credentials and API keys are stored and accessed.",
    logging: "Reviewed logging and monitoring coverage for this component.",
    other: "Reviewed general configuration for this component.",
  };
  const base = canned[componentType] ?? canned.other;
  return `${base} (Target: ${description})`;
}

interface ToolEvent {
  role: "tool";
  label: string;
  status: "done";
  result: string;
}

interface AssistantEvent {
  role: "assistant";
  content: string;
  findings?: { severity: "high" | "medium" | "low"; title: string }[];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userMessage: string = body?.message ?? "";

    const events: (ToolEvent | AssistantEvent)[] = [];

    const messages: Anthropic.MessageParam[] = [{ role: "user", content: userMessage }];

    // Tool-calling loop: keep going until Claude stops requesting tools.
    let guard = 0;
    while (guard < 6) {
      guard++;

      const response = await anthropic.messages.create({
        model: "claude-sonnet-5",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        tools,
        messages,
      });

      messages.push({ role: "assistant", content: response.content });

      if (response.stop_reason !== "tool_use") {
        // Claude finished without calling report_findings — fall back to its text.
        const textBlock = response.content.find((b) => b.type === "text");
        events.push({
          role: "assistant",
          content: textBlock?.type === "text" ? textBlock.text : "Review complete.",
        });
        break;
      }

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      let finishedWithFindings = false;

      for (const block of response.content) {
        if (block.type !== "tool_use") continue;

        if (block.name === "check_component_security") {
          const input = block.input as { component_type: string; description: string };
          const result = runSecurityCheckStub(input.component_type, input.description);

          events.push({
            role: "tool",
            label: `Checking ${input.component_type}`,
            status: "done",
            result,
          });

          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: result,
          });
        }

        if (block.name === "report_findings") {
          const input = block.input as {
            summary: string;
            findings: { severity: "high" | "medium" | "low"; title: string }[];
          };

          events.push({
            role: "assistant",
            content: input.summary,
            findings: input.findings,
          });

          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: "Findings recorded.",
          });

          finishedWithFindings = true;
        }
      }

      messages.push({ role: "user", content: toolResults });

      if (finishedWithFindings) break;
    }

    return NextResponse.json({ events });
  } catch (err) {
    console.error("Chat route error:", err);
    return NextResponse.json(
      { events: [{ role: "assistant", content: "Something went wrong calling Claude. Check the server terminal for details." }] },
      { status: 500 }
    );
  }
}
