# Project writeup: SecureArch

## The problem

Security architecture reviews are usually manual, slow, and inconsistent — a human reads a design doc, mentally cross-references it against whatever frameworks they happen to know well, and writes up findings that vary in quality depending on their mood and expertise that day. I wanted to see whether an LLM, given real tool access to live compliance data instead of relying on its own training knowledge, could do a genuinely useful first-pass version of that review — grounded in real, citable controls rather than plausible-sounding hallucination.

## What I built

SecureArch takes a plain-text or PDF architecture description and returns structured findings — component, specific issue, severity, and concrete remediation — each one backed by a real control from a live MCP (Model Context Protocol) compliance server covering NIST 800-53, HIPAA, SOC 2, ISO 42001, EU AI Act, OWASP, and MITRE. The model doesn't just describe a control's textbook definition; it's required to explain what's *specifically* wrong with *this* architecture, using the user's own terminology for components.

## Key technical decisions, and why

**Tool-calling over RAG.** Rather than embedding compliance documents into a vector store, I connected directly to an MCP server via structured tool calls (`search_compliance_controls`, `get_compliance_control_detail`). This meant no embedding pipeline to maintain, no vector-store poisoning risk, and always-current control data — since the server itself owns the source of truth.

**A hard tool-call loop guard.** Early on I capped the agent loop at 10 iterations. This wasn't a performance optimization — it's a real security control (see `SECURITY.md`), preventing a runaway or manipulated agent loop from spiraling into unbounded API cost or unexpected behavior.

**Next.js standalone output for deployment**, not the default build. This came out of a real, painful debugging process (see below) — it turned out to be both a reliability fix and a meaningfully leaner deployment.

**Prompt-injection defense that's actually tested, not just declared.** I wrapped user input in explicit `<user_input>` delimiters and instructed the model to treat injected instructions as findings, not commands — but the more important decision was building an automated test suite (`test-injection.ts`) that fires real injection payloads at the live endpoint and checks the model's actual behavior, then wiring that test into CI as a deploy-blocking gate. "I asked the model nicely" and "I proved it resists this" are very different claims, and I wanted to be able to make the second one honestly.

## What went wrong, and how it got fixed

The deployment to Azure App Service was, honestly, the hardest part of this whole project — not because any single step was hard, but because of how many independent, unrelated failures stacked on top of each other:

1. **Quota exceeded on the Free (F1) App Service tier** — resolved by scaling to Basic (B1).
2. **Empty Startup Command** — Azure had no idea how to actually launch the app.
3. **Application Logging was off** — meaning every earlier failure was invisible; I was debugging blind until I found this.
4. **`node_modules/.bin` was missing after deploy** — GitHub's artifact upload/download steps had mangled the symlinks npm needs to actually run `next`. The package (`next`) was there; the executable pointer to it wasn't.
5. **No production build (`.next`) existed on the server** — the deployed code had never actually been built there.
6. **Switching to Next.js `standalone` output** to fix the deployment properly, rather than continuing to patch around a fragile full-`node_modules` deploy — which then required a different Startup Command (`node server.js` instead of `npm run start`).
7. **A stale, duplicate GitHub Actions workflow** (targeting an entirely different, unused Azure Container App resource) that had been silently failing on every single push the whole time — cleaned up once discovered.
8. **Azure's own Oryx build system re-running `npm run build` on the server** against a package that only contained the standalone output, not the source — fixed by explicitly disabling `SCM_DO_BUILD_DURING_DEPLOYMENT`.

Each of these individually was a small, findable fix once diagnosed — the real lesson was in the diagnostic process itself: Azure's Log Stream can show nothing at all even when something is actively wrong, and the actual container logs (found via Kudu's File Manager, not the live log stream) were consistently the most reliable source of truth.

## What I'd do differently

- **Enable Application Logging from the very start** of any Azure deployment, before the first push — not after several rounds of debugging blind.
- **Use `output: 'standalone'` from day one** for any Next.js app deployed to a server (rather than a serverless platform built for Next.js specifically) — it would have avoided the entire `node_modules`/symlink saga.
- **Wire the injection test into CI immediately** after writing it, rather than leaving it as a manually-run script for a while first. A security control that isn't enforced automatically is a control that's one distracted afternoon away from silently regressing.

## What's next (if I kept going)

The `SECURITY.md` review is explicit about what's deliberately out of scope for this portfolio deployment — authentication, request logging/monitoring, and coordinated (rather than per-instance) rate limiting. If this were headed toward real production use rather than a portfolio piece, those would be the next three things to build, in that order.
