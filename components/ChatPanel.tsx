import { useState, useRef, useEffect } from "react";
import { Send, CheckCircle2, Loader2, ShieldAlert, ShieldCheck } from "lucide-react";

/**
 * Message data model
 *
 * As of Step 4a-3, handleSend() calls the simulated /api/chat route.
 * Step 4b will swap that route's internals for a real LLM call — this
 * component's fetch call and message shape shouldn't need to change.
 */

type Severity = "high" | "medium" | "low";

interface Finding {
  severity: Severity;
  title: string;
}

interface UserMessage {
  role: "user";
  content: string;
}

interface AssistantMessageType {
  role: "assistant";
  content: string;
  findings?: Finding[];
}

interface ToolMessage {
  role: "tool";
  label: string;
  status: "running" | "done";
  result?: string;
}

type Message = UserMessage | AssistantMessageType | ToolMessage;

const SEVERITY_STYLES: Record<Severity, { color: string; bg: string; border: string }> = {
  high: { color: "#f87171", bg: "rgba(248,113,113,0.1)", border: "rgba(248,113,113,0.3)" },
  medium: { color: "#fbbf24", bg: "rgba(251,191,36,0.1)", border: "rgba(251,191,36,0.3)" },
  low: { color: "#4ade80", bg: "rgba(74,222,128,0.1)", border: "rgba(74,222,128,0.3)" },
};

const INITIAL_MESSAGES: Message[] = [
  {
    role: "user",
    content: "React app on Vercel calls an API gateway, which calls Azure OpenAI. Uploaded files go to Blob Storage.",
  },
  { role: "tool", label: "Checking authentication flow", status: "done", result: "No auth layer found between gateway and OpenAI" },
  { role: "tool", label: "Reviewing storage access controls", status: "done", result: "Blob Storage container permissions checked" },
  {
    role: "assistant",
    content: "I reviewed the architecture and found a few issues worth addressing before this goes further.",
    findings: [
      { severity: "high", title: "API gateway has no authentication in front of Azure OpenAI" },
      { severity: "medium", title: "Blob Storage container may allow public read access" },
      { severity: "low", title: "No rate limiting mentioned on the gateway" },
    ],
  },
];

function ToolActivity({ label, status, result }: ToolMessage) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "10px 14px",
        borderRadius: 8,
        background: "rgba(59,130,246,0.06)",
        border: "1px solid rgba(59,130,246,0.15)",
        margin: "6px 0",
        maxWidth: "85%",
      }}
    >
      <div style={{ marginTop: 2 }}>
        {status === "running" ? (
          <Loader2 size={14} color="#60a5fa" style={{ animation: "spin 1s linear infinite" }} />
        ) : (
          <CheckCircle2 size={14} color="#60a5fa" />
        )}
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.4 }}>
        <div style={{ color: "#93c5fd", fontFamily: "monospace", letterSpacing: 0.2 }}>{label}</div>
        {result && <div style={{ color: "#64748b", marginTop: 2 }}>{result}</div>}
      </div>
    </div>
  );
}

function UserBubble({ content }: { content: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", margin: "8px 0" }}>
      <div
        style={{
          background: "#2563eb",
          color: "#fff",
          padding: "10px 14px",
          borderRadius: "12px 12px 2px 12px",
          maxWidth: "80%",
          fontSize: 14,
          lineHeight: 1.5,
        }}
      >
        {content}
      </div>
    </div>
  );
}

function AssistantMessageBubble({ content, findings }: { content: string; findings?: Finding[] }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-start", margin: "8px 0" }}>
      <div
        style={{
          background: "#141e33",
          border: "1px solid #1e2a45",
          color: "#e2e8f0",
          padding: "12px 14px",
          borderRadius: "12px 12px 12px 2px",
          maxWidth: "85%",
          fontSize: 14,
          lineHeight: 1.5,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: findings ? 10 : 0 }}>
          <ShieldCheck size={14} color="#60a5fa" />
          <span style={{ fontSize: 11, letterSpacing: 1, color: "#64748b", textTransform: "uppercase" }}>
            Security Assistant
          </span>
        </div>
        <div>{content}</div>
        {findings && (
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
            {findings.map((f, i) => {
              const s = SEVERITY_STYLES[f.severity];
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 10px",
                    borderRadius: 6,
                    background: s.bg,
                    border: `1px solid ${s.border}`,
                  }}
                >
                  <ShieldAlert size={13} color={s.color} style={{ flexShrink: 0 }} />
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: 0.5,
                      textTransform: "uppercase",
                      color: s.color,
                      flexShrink: 0,
                    }}
                  >
                    {f.severity}
                  </span>
                  <span style={{ fontSize: 13, color: "#cbd5e1" }}>{f.title}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  async function handleSend() {
    const text = input.trim();
    if (!text || isSending) return;

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setIsSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      if (!res.ok) throw new Error(`Request failed: ${res.status}`);

      const data: { events: Message[] } = await res.json();
      setMessages((prev) => [...prev, ...data.events]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Something went wrong reaching the analysis service. Check the terminal for errors and try again.",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 500,
        background: "#0c1526",
        border: "1px solid #1e2a45",
        borderRadius: 10,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid #1e2a45",
          fontSize: 11,
          letterSpacing: 1.5,
          color: "#64748b",
          textTransform: "uppercase",
        }}
      >
        Analysis Chat
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>
        {messages.map((m, i) => {
          if (m.role === "user") return <UserBubble key={i} content={m.content} />;
          if (m.role === "tool") return <ToolActivity key={i} {...m} />;
          return <AssistantMessageBubble key={i} content={m.content} findings={m.findings} />;
        })}
        {isSending && <ToolActivity role="tool" label="Thinking..." status="running" />}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: 12, borderTop: "1px solid #1e2a45", display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Ask a follow-up question..."
          disabled={isSending}
          style={{
            flex: 1,
            background: "#0f1c33",
            border: "1px solid #1e2a45",
            borderRadius: 8,
            padding: "10px 12px",
            color: "#e2e8f0",
            fontSize: 13,
            outline: "none",
            opacity: isSending ? 0.6 : 1,
          }}
        />
        <button
          onClick={handleSend}
          disabled={isSending}
          style={{
            background: "#2563eb",
            border: "none",
            borderRadius: 8,
            width: 40,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: isSending ? "default" : "pointer",
            opacity: isSending ? 0.6 : 1,
          }}
        >
          <Send size={16} color="#fff" />
        </button>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
