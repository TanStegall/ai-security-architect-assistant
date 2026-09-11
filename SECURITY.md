# Security & Framework Alignment

This document maps SecureArch's actual, implemented security controls against three industry frameworks: the **OWASP Top 10 for LLM Applications (2026)**, the **OWASP Top 10 for Agentic Applications (2026)**, and the **NIST AI Risk Management Framework (AI RMF)**. It's written honestly -- gaps and accepted tradeoffs are called out explicitly, not glossed over, because a credible security document says what *isn't* covered as clearly as what is.

**Scope note:** SecureArch is a portfolio-scale deployment (single Azure App Service instance, no authentication, open access by design) rather than a production system handling real user data. Some gaps below (auth, logging/monitoring) are deliberate, documented tradeoffs appropriate to that scope -- not oversights.

---

## OWASP Top 10 for LLM Applications (2026)

The 2026 edition significantly reordered the list from 2025 based on real incident data: Excessive Agency jumped from 6th to 3rd, Unbounded Consumption rose from 10th to 6th, and System Prompt Leakage was renamed and broadened into Hidden Context Exposure. This mapping uses the current 2026 order.

| # | Risk | Status | How it's addressed |
|---|------|--------|---------------------|
| LLM01 | **Prompt Injection** | Mitigated & verified | User input is wrapped in `<user_input>` tags with an explicit system-prompt instruction to treat content as data, never as commands. The model is further instructed to flag injection attempts as findings rather than silently ignoring them. Verified empirically by an automated test suite (`test-injection.ts`) that fires real injection payloads at a live server -- and it now runs as a required CI gate on every push, blocking deployment if it fails. |
| LLM02 | **Sensitive Information Disclosure** | Mostly N/A / low exposure | The app doesn't handle end-user PII -- inputs are architecture descriptions, not personal data. Secrets (`ANTHROPIC_API_KEY`, MCP token) are server-only, gitignored locally, and stored as Azure App Settings / GitHub Actions secrets; they never reach the client. |
| LLM03 | **Excessive Agency** | Mitigated, strongest area | This is the risk that jumped the most in the 2026 ranking, and it's this app's strongest control area. Every available tool is strictly read-only (`search_compliance_controls`, `get_compliance_control_detail`) or a structured data-submission tool (`report_findings`) -- nothing writes, deletes, or triggers a real-world action. The tool set is small, fixed, and not user- or model-extensible. A hard loop guard caps the agent at 10 tool-calling iterations, preventing runaway loops. |
| LLM04 | **Supply Chain** | Mitigated | `npm audit --audit-level=high` runs as a CI gate on every push, failing the build if a high/critical vulnerability is found. Dependabot is enabled for weekly automated update checks on both npm packages and GitHub Actions versions. One remaining accepted risk: the third-party MCP compliance server is an inherited trust boundary -- if compromised, its data flows directly into the model's context. |
| LLM05 | **Data and Model Poisoning** | N/A by design | The app uses a hosted model (Claude) with no fine-tuning or training data under the app's control -- that responsibility sits with Anthropic. No local embeddings or training pipeline exists to poison. |
| LLM06 | **Unbounded Consumption** | Mostly mitigated | Rate limiting (15 requests / 10 minutes per IP), a bounded `max_tokens` (4096) per model call, and the 10-iteration tool-call loop guard all cap runaway usage. The rate limiter is in-memory and per-instance -- a known, acceptable limitation at current scale, not a production-grade quota system with hard spending caps. |
| LLM07 | **Misinformation** | Partial, inherent limitation | Findings are required to cite real controls from a live compliance framework server rather than being generated from the model's general knowledge, meaningfully reducing fabricated citations. However, the model's *interpretation* of the user's described architecture is not independently fact-checked -- mitigated by grounding, not eliminated. |
| LLM08 | **Hidden Context Exposure** (formerly System Prompt Leakage) | Mitigated | The system prompt is defined server-side only and never included in, or derivable from, any API response. This category was broadened in 2026 to cover RAG data, MCP tool schemas, and formatting rules, not just the system prompt -- none of those are exposed to the client in this app either. |
| LLM09 | **Vector and Embedding Weaknesses** | N/A | The app uses no vector database, embeddings, or RAG pipeline -- compliance control lookups go through a structured MCP tool call, not similarity search. |
| LLM10 | **Improper Output Handling** | Mitigated | React auto-escapes all rendered text (no `dangerouslySetInnerHTML` anywhere), so model output can't execute as script. Every tool-call result is validated at runtime (`validateRawFinding`) against the expected schema before being trusted or rendered; malformed findings are dropped and the user is told when that happens. |

---

## OWASP Top 10 for Agentic Applications (2026)

OWASP draws an explicit boundary between its two lists: the LLM Top 10 covers the model as a component inside an application, while the Agentic Top 10 applies once "the model becomes an actor, with tools it can call, memory it carries between sessions, and consequences it sets in motion downstream." SecureArch's tool-calling loop (up to 10 iterations against an MCP server) means it sits partly in agentic territory, so this framework is relevant even though the app is intentionally kept simple.

The 2026 Agentic Top 10 (ASI01-ASI10) covers ten themes: planning, tool use, identity, supply chain, code execution, memory, inter-agent communication, cascading failures, human-agent trust, and rogue agents. Rather than force a numbered mapping I can't fully verify against the official ranking, here's an honest assessment of how SecureArch relates to each theme:

- **Tool use / identity**: The agent's tools are read-only and fixed -- there's no delegated identity or credential the agent could misuse, since it can't write or act on anything.
- **Code execution**: Not applicable -- the app never executes model-generated code.
- **Memory / persistent state**: Not applicable -- each request is stateless; there's no persistent agent memory across sessions that could be poisoned or exploited.
- **Inter-agent communication**: Not applicable -- this is a single-agent system with no coordination between multiple agents.
- **Cascading failures**: Low risk by design -- the hard 10-iteration loop guard and entirely read-only tool set mean a misbehaving agent run has no destructive action to cascade into.
- **Human-agent trust**: A genuine, honest residual risk -- users could over-trust the findings this tool produces without independent verification, the same limitation noted under Misinformation (LLM07) above.
- **Rogue agents**: Low risk by design -- with no write access and no autonomy beyond a single bounded review loop, there's no path for the agent to act against its intended purpose in a way that matters.
- **Planning / supply chain**: Covered above under the LLM Top 10 (LLM04) and the read-only tool design.

**Honest limitation:** this section is a good-faith self-assessment against the Agentic Top 10's themes, not a formal audit against the official numbered ASI01-ASI10 categories, since a precise mapping would require deeper engagement with the official 2026 publication than this project's scope calls for.

---

## NIST AI Risk Management Framework (AI RMF)

The NIST AI RMF organizes risk management into four functions rather than a numbered checklist. Here's how this project's actual process maps to each:

### Govern
*Establishing policies, accountability, and culture around AI risk.*

- This document itself, plus the project's `README`, its commit history, and its test suite constitute the governance artifacts for this project -- there's no separate formal AI governance program, which is appropriate at this scale.
- Security decisions (e.g., accepting no-auth for this deployment) are documented as explicit tradeoffs rather than silent gaps.

### Map
*Understanding context, intended use, and risks specific to the system.*

- The five-layer security review conducted for this app (input, output, model, infrastructure, agentic) is this project's Map exercise.
- The system's context is explicitly scoped: a read-only compliance-lookup assistant with no write access to any real infrastructure, which meaningfully bounds the blast radius of most identified risks (see LLM03 and the Agentic Top 10 section above).

### Measure
*Testing, evaluating, and quantifying whether controls actually work.*

- The automated prompt-injection test suite (`test-injection.ts`) empirically fires real attack payloads against a live server and checks the model's actual behavior -- and now runs on every push as a CI gate.
- Runtime output validation (`validateRawFinding`) is a continuous, in-production Measure control on every request.
- `npm audit` running on every push is a Measure control for the dependency supply chain.

### Manage
*Prioritizing and acting on identified risks, including accepting some deliberately.*

- Concrete mitigations in place: rate limiting, the tool-call loop guard, input length caps, prompt-injection delimiting, dependency vulnerability scanning, and CI-gated security testing that blocks deployment on failure.
- Concrete risk acceptances, made explicitly rather than by omission: no authentication (open access, appropriate for a portfolio deployment), and no logging/monitoring/alerting on abuse patterns.

---

## Summary

Of the ten 2026 OWASP LLM risk categories, **six are fully mitigated**, **two don't apply** to this architecture, and **two carry a documented, low-severity residual risk** (supply-chain trust in the MCP server, and inherent LLM judgment-layer misinformation risk that grounding reduces but can't eliminate). Against the newer Agentic Top 10, the app's deliberately narrow, read-only, bounded design means most agentic-specific risks don't meaningfully apply -- with human-agent trust remaining the one genuine, honestly-disclosed residual risk.

Across the NIST AI RMF's four functions, this project has concrete artifacts for all four -- most notably real, automated, adversarial testing (Measure) enforced as a CI/CD gate rather than only a written policy (Govern).
