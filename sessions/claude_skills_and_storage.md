# Solid Skills and Storage Setup
_Session on 2026-06-11 with Claude Code (Opus 4.6)_

---

## 1. Install Solid AI Coding guide and skills

**User:** Follow the instructions in `solid-ai-coding/README.md` to install the Solid-related skills (ignore the general engineering skills).

**Claude:**

### Steps taken

1. **Downloaded guide files** — `AGENTS.md` and `CLAUDE.md` copied to project root from `jeswr/solid-ai-coding`
2. **Configured context7 MCP server** — added at user scope for fetching current Solid library documentation:
   ```
   claude mcp add --scope user --transport http context7 https://mcp.context7.com/mcp
   ```
3. **Installed 10 Solid skills** via `npx skills add jeswr/solid-ai-coding -a claude-code`

### Skills installed

| Skill | Covers |
|-------|--------|
| `solid-fetch-rdf` | `@jeswr/fetch-rdf` API reference |
| `solid-object` | `@solid/object` API reference + `ProfileAgent` rendering reference class |
| `solid-reactive-authentication` | `@solid/reactive-authentication` API reference + login/IdP-selection UX spec |
| `solid-server-matrix` | Diagnosing CSS / ESS / NSS differences |
| `solid-type-index` | Reading, writing, and bootstrapping Type Index registries |
| `solid-scale-and-sharding` | Collection sharding, index resources, client-side querying |
| `solid-notifications` | Live-sync via Solid Notifications Protocol and legacy NSS channel |
| `solid-test-infrastructure` | Playwright + local CSS test harness, account seeding, client-credentials fixtures |
| `solid-client-id` | Static Client Identifier Documents — template, Next.js hosting, provider wiring |
| `accessible-html-links` | Native `<a href>` + WCAG link-purpose rules |

### Files added

| File/Directory | Purpose |
|----------------|---------|
| `AGENTS.md` | Solid AI coding guide (Solid-specific rules + general engineering rules) |
| `CLAUDE.md` | One-line import (`@AGENTS.md`) for Claude Code |
| `.claude/skills/` | 10 Solid skill directories installed by `npx skills` |
| `.agents/skills/` | Mirror of skills for other agent tools |

### General engineering skills (skipped)

Per user request, the following categories of third-party skills were **not** installed: TDD, vitest, Playwright, Node, TypeScript advanced types, responsive design, semantic HTML, web design guidelines, design engineering, web typography, color mode/theme, code review, and find-skills.

---

## 2. Replace auth + pod I/O with the recommended Solid stack

**User:** Use appropriate skills to save data to the logged in user's Solid pod storage under an appropriately named resource.

**Claude:**

### Problem

The app saves/loads agent data (name, locations, availabilities) to `{storage}/comidas-gratis/agent.ttl` in the user's Solid pod. The existing implementation used a hand-rolled OIDC/DPoP auth flow (`public/js/auth/`) and hand-built Turtle parsing/serialization (`public/solid-pod.js`) — both banned by `AGENTS.md`. The existing `data/rdf.ts` already had proper `@rdfjs/wrapper` + `@solid/object` + `n3` wrappers but they weren't wired into the pod I/O path.

### Solution

Replaced auth with `@solid/reactive-authentication` (via the skill-bundled `WebIdDPoPTokenProvider`) and pod reads with `@jeswr/fetch-rdf`, keeping the existing RDF wrappers and `n3.Writer` serialization.

### Dependencies added/updated (`deno.json`)

| Package | Version | Purpose |
|---------|---------|---------|
| `@solid/reactive-authentication` | `^0.1.2` | Popup-based OIDC auth, patches `globalThis.fetch` |
| `@jeswr/fetch-rdf` | `^0.1.0` | Fetch + parse Solid RDF resources |
| `oauth4webapi` | `^3.0.0` | OIDC protocol (dep of `WebIdDPoPTokenProvider`) |
| `dpop` | `^2.1.0` | DPoP proof generation (dep of `WebIdDPoPTokenProvider`) |
| `@solid/object` | `^0.5.0` → `^0.6.0` | Needed `Agent.oidcIssuer` for `login-ux.ts` |

### Auth changes

- **Before**: Hand-rolled OIDC/DPoP in `public/js/auth/` with full-page redirect and issuer-first login (user enters OIDC issuer URL)
- **After**: `@solid/reactive-authentication` with popup-based flow and WebID-first login (user enters their WebID; issuer resolved from profile via `WebIdDPoPTokenProvider`)
- Static client ID at `/client-id.jsonld` (already existed, updated `redirect_uris` to point to `/callback.html`)
- `allowInsecureLoopback: true` for local CSS dev

### Pod I/O changes

- **Reads**: `fetchRdf(url)` → `ComidasDataset` → `agentFromRdf()` (proper RDF parsing replaces hand-built regex Turtle parser)
- **Writes**: `agentToRdf()` → `n3.Writer` → conditional `PUT` with `If-Match: <etag>` (proper serialization replaces hand-built Turtle string concatenation)
- All `fetch` calls go through the auth-patched `globalThis.fetch` — no explicit auth wrappers needed

### Files created

| File | Purpose |
|------|---------|
| `client/solid-auth.ts` | Auth setup: `setupAuth()`, `promptAndStoreWebId()`, `getStoredWebId()`, `clearStoredWebId()` |
| `client/webid-token-provider.ts` | Custom `TokenProvider` with WebID-driven issuer resolution (copied from skill) |
| `client/login-ux.ts` | WebID validation, issuer resolution, recent accounts (copied from skill) |
| `public/callback.html` | Popup callback page: `opener.postMessage(location.href)` |

### Files modified

| File | Change |
|------|--------|
| `deno.json` | Added deps; added `solid-auth.ts` and `solid-pod.ts` to bundle task |
| `client/solid-pod.ts` | Rewrote: removed `@inrupt/solid-client-authn-browser`, uses `fetchRdf` + patched `fetch` |
| `public/provider.js` | New auth imports; `setupAuth()` + WebID-based login/save flow |
| `public/receiver.js` | Same auth pattern as provider.js |
| `public/app.js` | Same auth pattern (lighter — no pod read/write on index page) |
| `public/provider.html` | Added `<authorization-code-flow>` element; removed OIDC issuer input |
| `public/receiver.html` | Same HTML changes |
| `public/index.html` | Same HTML changes |
| `public/client-id.jsonld` | `redirect_uris` → `callback.html` only; scope → `openid webid` |

### Files deleted

| File | Reason |
|------|--------|
| `public/js/auth/solid-auth.js` | Hand-rolled OIDC flow replaced by `@solid/reactive-authentication` |
| `public/js/auth/oidc-discovery.js` | Hand-rolled discovery replaced |
| `public/js/auth/dpop.js` | Hand-rolled DPoP replaced |
| `public/js/utils/uuid.js` | Only used by old auth |
