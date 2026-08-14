// Standalone connection test — NOT part of the app yet.
// Run this once to confirm your token and the server work before we
// wire real calls into route.ts.
//
// Setup:
//   npm install -D tsx
//   npm install @modelcontextprotocol/sdk
//
// Usage (PowerShell):
//   $env:KYORA_MCP_TOKEN="your-real-token"; npx tsx test-mcp-connection.ts

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const MCP_URL = "https://kyora-iq-mcp.onrender.com/mcp";
const TOKEN = process.env.KYORA_MCP_TOKEN;

async function main() {
  if (!TOKEN) {
    console.error("Missing KYORA_MCP_TOKEN environment variable. See usage comment at top of this file.");
    process.exit(1);
  }

  console.log("Connecting to Kyora IQ MCP server...");
  console.log("(First request may take up to ~50s if the server was asleep.)");

  const transport = new StreamableHTTPClientTransport(new URL(MCP_URL), {
    requestInit: {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
      },
    },
  });

  const client = new Client({ name: "test-client", version: "1.0.0" }, { capabilities: {} });

  await client.connect(transport);
  console.log("Connected.");

 const tools = await client.listTools();
  console.log(
    "Available tools:",
    tools.tools.map((t) => t.name)
  );

  const getControlTool = tools.tools.find((t) => t.name === "get_control");
  console.log("\nget_control input schema:");
  console.log(JSON.stringify(getControlTool?.inputSchema, null, 2));

  const result = await client.callTool({ name: "list_frameworks", arguments: {} });
  console.log("\nlist_frameworks result (first 500 chars):");
  const content = result.content as { type: string; text?: string }[];
  const textBlock = content.find((c) => c.type === "text");
  console.log(textBlock?.text?.slice(0, 500));

  await client.close();
}

main().catch((err) => {
  console.error("Connection test failed:", err);
  process.exit(1);
});
