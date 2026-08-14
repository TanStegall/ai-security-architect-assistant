import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MCP_URL = "https://kyora-iq-mcp.onrender.com/mcp";
const MCP_TOKEN = process.env.KYORA_MCP_TOKEN;

let mcpClientPromise: Promise<Client> | null = null;

function getMcpClient(): Promise<Client> {
  if (!mcpClientPromise) {
    mcpClientPromise = (async () => {
      if (!MCP_TOKEN) throw new Error("Missing KYORA_MCP_TOKEN environment variable.");

      const transport = new StreamableHTTPClientTransport(new URL(MCP_URL), {
        requestInit: {
          headers: { Authorization: `Bearer ${MCP_TOKEN}` },
        },
      });

      const client = new Client({ name: "ai-security-architect-assistant", version: "1.0.0" }, { capabilities: {} });
      await client.connect(transport);
      return client;
    })();
  }
  return mcpClientPromise;
}

function extractText(result: Awaited<ReturnType<Client["callTool"]>>): string {
  const content = result.content as { type: string; text?: string }[];
  const textBlock = content.find((c) => c.type === "text");
  return textBlock?.text ?? "No result returned.";
}

const SYSTEM_PROMPT = `You are a security architecture review assistant embedded in a dashboard tool. A user has described a software architecture (frontend, backend, hosting, auth, storage, etc.) and may ask follow-up questions about it.

You have access to a real compliance framework reference server (NIST 800-53, HIPAA, SOC 2, ISO 42001, EU AI Act, OWASP, MITRE, and more). Your findings must be grounded in actual controls from this server, not general opinion.

Your job:
1. Identify which security-relevant areas are worth checking based on what the user described or asked about (e.g. authentication, storage, network exposure, secrets management, logging).
2. Use search_compliance_controls to find real controls relevant to each area. Use get_compliance_control_detail if you need the full text of a specific control before citing it.
3. Once you have enough grounded findings, call report_findings with a short summary and a list of specific findings. Each finding's title MUST reference the specific framework and control ID it's based on, e.g. "[NIST 800-53 AC-3] Confirm the API gateway enforces access control before reaching Azure OpenAI."

Only search for controls relevant to what the user actually described or asked — don't search everything every time. Aim to gather 2-4 relevant controls, then stop searching and report. Keep the summary to 1-2 sentences. If you cannot find a relevant control for something, do not fabricate one — either search again with different terms or omit that point.

Important: once you have gathered enough grounded findings, call report_findings immediately in that same turn. Do not send a plain-text message announcing that you are ready or that you have enough information — go straight to calling the tool.`;

const tools: Anthropic.Tool[] = [
  {
    name: "search_compliance_controls",
    description:
      "Searches real compliance controls across all supported frameworks (NIST 800-53, HIPAA, SOC 2, ISO 42001, EU AI Act, OWASP, MITRE) by keyword. Use this to find controls relevant to a specific architecture component.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Keyword(s) to search for, e.g. 'access control', 'encryption at rest', 'authentication'" },
      },
      required: ["query"],
    },
  },
  {
    name: "get_compliance_control_detail",
    description: "Gets the full text, guidance, and cross-framework mappings for one specific control, once you know its framework and control ID.",
    input_schema: {
      type: "object",
      properties: {
        framework_id: { type: "string", description: "e.g. 'nist-800-53', 'hipaa-security-rule'" },
        control_id: { type: "string", description: "e.g. 'AC-3'" },
      },
      required: ["framework_id", "control_id"],
    },
  },
  {
    name: "report_findings",
    description: "Submits the final structured findings from the security review. Call this once, after gathering enough grounded findings.",
    input_schema: {
      type: "object",
      properties: {
        summary: { type: "string", description: "A 1-2 sentence summary of the review" },
        findings: {
          type: "array",
          items: {
            type: "object",
            properties: {
              severity: { type: "string", enum: ["high", "medium", "low"] },
              title: {
                type: "string",
                description: "Must start with [FRAMEWORK CONTROL_ID] followed by the specific, actionable finding",
              },
            },
            required: ["severity", "title"],
          },
        },
      },
      required: ["summary", "findings"],
    },
  },
];

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

    const mcpClient = await getMcpClient();

    let hasReportedFindings = false;
    let guard = 0;

    while (guard < 10) {
      guard++;

      const response = await anthropic.messages.create({
        model: "claude-sonnet-5",
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        tools,
        messages,
      });

      messages.push({ role: "assistant", content: response.content });

      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
      );

      if (toolUseBlocks.length === 0) {
        if (hasReportedFindings) {
          const textBlock = response.content.find((b) => b.type === "text");
          if (textBlock?.type === "text" && textBlock.text.trim()) {
            events.push({ role: "assistant", content: textBlock.text });
          }
          break;
        }

        if (guard < 10) {
          messages.push({
            role: "user",
            content:
              "Now call the report_findings tool with your summary and findings based on everything you've gathered so far. Do not reply with plain text.",
          });
          continue;
        }

        const textBlock = response.content.find((b) => b.type === "text");
        events.push({
          role: "assistant",
          content: textBlock?.type === "text" ? textBlock.text : "Review complete.",
        });
        break;
      }

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      let finishedWithFindings = false;

      for (const block of toolUseBlocks) {
        if (block.name === "search_compliance_controls") {
          const input = block.input as { query: string };
          const mcpResult = await mcpClient.callTool({
            name: "search_controls",
            arguments: { query: input.query },
          });
          const resultText = extractText(mcpResult);

          events.push({
            role: "tool",
            label: `Searching compliance controls: "${input.query}"`,
            status: "done",
            result: resultText.slice(0, 150) + (resultText.length > 150 ? "..." : ""),
          });

          toolResults.push({ type: "tool_result", tool_use_id: block.id, content: resultText });
          continue;
        }

        if (block.name === "get_compliance_control_detail") {
          const input = block.input as { framework_id: string; control_id: string };
          const mcpResult = await mcpClient.callTool({
            name: "get_control",
            arguments: { framework: input.framework_id, control_id: input.control_id },
          });
          const resultText = extractText(mcpResult);

          events.push({
            role: "tool",
            label: `Looking up ${input.framework_id} ${input.control_id}`,
            status: "done",
            result: resultText.slice(0, 150) + (resultText.length > 150 ? "..." : ""),
          });

          toolResults.push({ type: "tool_result", tool_use_id: block.id, content: resultText });
          continue;
        }

        if (block.name === "report_findings") {
          const input = block.input as {
            summary: string;
            findings: { severity: "high" | "medium" | "low"; title: string }[];
          };

          events.push({ role: "assistant", content: input.summary, findings: input.findings });
          toolResults.push({ type: "tool_result", tool_use_id: block.id, content: "Findings recorded." });
          finishedWithFindings = true;
          hasReportedFindings = true;
          continue;
        }

        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: "Tool not implemented." });
      }

      messages.push({ role: "user", content: toolResults });

      if (finishedWithFindings) break;
    }

    return NextResponse.json({ events });
  } catch (err) {
    console.error("Chat route error:", err);
    return NextResponse.json(
      {
        events: [
          {
            role: "assistant",
            content: "Something went wrong reaching Claude or the compliance server. Check the server terminal for details.",
          },
        ],
      },
      { status: 500 }
    );
  }
}
