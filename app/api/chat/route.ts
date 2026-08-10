import { NextRequest, NextResponse } from "next/server";

/**
 * Simulated /api/chat route (Step 4a-3).
 *
 * Purpose: let the chat panel UI be tested end-to-end (user message in,
 * tool-activity + assistant message out) WITHOUT a real LLM or API key.
 *
 * Step 4b will replace the body of this function with a real call to
 * OpenAI/Azure OpenAI using tool-calling. The response SHAPE below is
 * deliberately built to match what a real tool-calling response looks like,
 * so swapping in 4b should mostly mean changing what fills `events`, not
 * how the frontend reads it.
 */

type ToolEvent = {
  role: "tool";
  label: string;
  status: "done";
  result: string;
};

type Finding = {
  severity: "high" | "medium" | "low";
  title: string;
};

type AssistantEvent = {
  role: "assistant";
  content: string;
  findings?: Finding[];
};

// A small bank of canned responses so different questions don't all look identical.
// Very rough keyword matching — good enough for testing the UI, not real analysis.
function buildSimulatedResponse(userMessage: string): (ToolEvent | AssistantEvent)[] {
  const lower = userMessage.toLowerCase();

  if (lower.includes("auth") || lower.includes("login")) {
    return [
      { role: "tool", label: "Checking authentication flow", status: "done", result: "Reviewed identity provider configuration" },
      { role: "tool", label: "Checking token handling", status: "done", result: "Inspected how tokens are passed between services" },
      {
        role: "assistant",
        content: "Here's what I found looking at authentication specifically.",
        findings: [
          { severity: "medium", title: "Token expiry not mentioned — confirm short-lived tokens are used" },
          { severity: "low", title: "Consider enabling MFA if not already required" },
        ],
      },
    ];
  }

  if (lower.includes("storage") || lower.includes("blob") || lower.includes("file")) {
    return [
      { role: "tool", label: "Reviewing storage access controls", status: "done", result: "Checked container-level permissions" },
      { role: "tool", label: "Checking encryption settings", status: "done", result: "Verified encryption-at-rest configuration" },
      {
        role: "assistant",
        content: "Here's what stood out around file storage.",
        findings: [
          { severity: "high", title: "Confirm storage containers are not set to public access" },
          { severity: "low", title: "Consider enabling soft delete for accidental file removal" },
        ],
      },
    ];
  }

  // Default / fallback response
  return [
    { role: "tool", label: "Analyzing message", status: "done", result: "Parsed follow-up question" },
    {
      role: "assistant",
      content:
        "This is a simulated response for testing the UI (Step 4a-3). Once a real model is wired in (Step 4b), I'll be able to reason about your specific architecture here.",
    },
  ];
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const userMessage: string = body?.message ?? "";

  // Simulate network/processing delay so the UI's loading states are testable.
  await new Promise((resolve) => setTimeout(resolve, 700));

  const events = buildSimulatedResponse(userMessage);

  return NextResponse.json({ events });
}
