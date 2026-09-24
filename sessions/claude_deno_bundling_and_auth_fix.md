# Deno Bundling Fixes and Auth Trigger Fix

_Session on 2026-07-09 with Claude Code (Sonnet 5), continuing from [`claude_skills_and_storage.md`](./claude_skills_and_storage.md)_

---

## 1. CORS errors from `node:` protocol imports

**User:** Reported browser console errors:
```
Access to script at 'node:module' from origin 'http://localhost:8080' has been blocked by CORS policy...
Access to script at 'node:buffer' from origin 'http://localhost:8080' has been blocked...
```

**Problem:** The previous session's `deno bundle` output for `public/solid-auth.js` and `public/solid-pod.js` contained static ESM imports like `import { Buffer } from "node:buffer"` — Node.js built-in module specifiers that browsers can't resolve (browsers only support `chrome:`, `http(s):`, `data:`, etc. as script origins).

### Root cause investigation

- `deno bundle --platform browser` was expected to polyfill Node built-ins for browser targets but didn't eliminate all of them.
- Traced the static `import from "node:buffer"` to `n3@2.0.3`'s `N3Lexer.js`, which itself only has `import { Buffer } from 'buffer'` (the **npm package name**, no `node:` prefix) — Deno's bundler was the one rewriting the bare `buffer` specifier to the Node built-in `node:buffer` during resolution.
- `n3@2.0.3` was pulled in as a **transitive dependency of `@jeswr/fetch-rdf`** (which pins `n3@^2.0.3`), even though the project's own `deno.json` pinned `n3@^1.26.0` for direct use. Two `n3` versions ended up installed side by side.
- Tried several approaches to force a single `n3` resolution or polyfill the specifier, none of which worked with Deno's npm resolution:
  - `package.json` `"overrides"` — ignored by Deno's npm installer
  - `deno.json` `"patch"` field — doesn't accept `npm:` specifiers
  - `deno.json` `"scopes"` — doesn't affect npm-internal resolution, only Deno's own import map
  - Import map entries mapping `"node:buffer"` / `"buffer"` to polyfill packages — didn't intercept npm-package-internal resolution either

### Fix: stop depending on the Node-focused package entirely

The user's framing reset the approach: **`@jeswr/fetch-rdf` is part of a Node-ecosystem-focused workstream** (its own `n3@^2.0.3` pin, Node-oriented tooling assumptions) that doesn't fit a Deno-first project. Rather than fighting Deno's bundler to polyfill around it, removed the dependency.

Changes:
- **Removed** `@jeswr/fetch-rdf`, `oauth4webapi`, `dpop` from `deno.json` imports — these were only needed for the skill-bundled `WebIdDPoPTokenProvider` (WebID-first custom token provider) and `login-ux.ts` helpers from the previous session.
- **Removed** `client/webid-token-provider.ts` and `client/login-ux.ts` (copied from the `solid-reactive-authentication` skill in the prior session) — deleted since they depended on `@jeswr/fetch-rdf`.
- **Rewrote `client/solid-auth.ts`** to use the published `DPoPTokenProvider` directly from `@solid/reactive-authentication` (its built-in host-map issuer resolution) instead of the custom WebID-driven provider. Simpler, fewer deps, no `n3@2.0.3` in the dependency graph for this module.
- **Rewrote `client/solid-pod.ts`** to parse Turtle with `n3.Parser` directly (`new Parser({ baseIRI: url }).parse(turtle)`) instead of `@jeswr/fetch-rdf`'s `fetchRdf()`. Added a local `FetchError` class mirroring the shape of `RdfFetchError` (`.status`, `.url`) for 404 handling.
- **Result**: `solid-auth.js` bundle shrank from 643KB (204 modules) to 75KB (19 modules); `solid-pod.js` shrank from 650KB (214 modules) to ~380KB (148 modules) — and pulled in only `n3@1.26.0`.

### Remaining single `node:buffer` reference

Even with only `n3@1.26.0` in the graph, one static import remained in `solid-pod.js` (which uses `n3.Parser`, unlike `solid-auth.js` which doesn't touch `n3` at all): `n3@1.26.0`'s `N3Lexer.js` also does `import { Buffer } from 'buffer'`, and Deno's bundler still rewrites that bare specifier to `node:buffer` regardless of `--platform browser`.

**Workaround**: added a `sed` post-process step to the `bundle` task in `deno.json` that rewrites the one `import { Buffer } from "node:buffer"` line to import from an inline `data:` URI shim exporting `globalThis.Buffer`:
```
sed -i 's|from "node:buffer"|from "data:text/javascript,export var Buffer=globalThis.Buffer"|g' ./public/solid-pod.js
```
This works because n3's own CJS-compiled dependency chain already provides a `Buffer` polyfill on `globalThis` elsewhere in the bundle; the shim just satisfies the one static ESM import site.

### Final `deno.json` imports (Deno-focused set)

| Package | Version | Purpose |
|---|---|---|
| `@rdfjs/wrapper` | `^0.32.0` | TermWrapper base classes |
| `@rdfjs/types` | `^2.0.0` | RDF/JS type definitions |
| `@solid/object` | `^0.6.0` | WebID profile / container typed wrappers |
| `@solid/reactive-authentication` | `^0.1.2` | Popup OIDC auth, patches `globalThis.fetch` |
| `n3` | `^1.26.0` | RDF store, Turtle parse/serialize |
| `@types/n3` | `^1.21.0` | n3 type definitions |

Dropped: `@jeswr/fetch-rdf`, `oauth4webapi`, `dpop` (all pulled in via the now-removed custom `WebIdDPoPTokenProvider`).

---

## 2. Login button didn't trigger the OIDC popup

**User:** "Login doesn't seem like it is actually working. I put my WebID in and clicked 'Log in with Solid' but never got the app authorization."

### Root cause

`@solid/reactive-authentication`'s `DPoPTokenProvider` is **reactive** — it only runs the OIDC flow when it intercepts a `401` response from the patched `fetch`. The login button's handler only did:
1. Store the WebID in `localStorage`
2. Call `readAgentFromPod(webId)`, which:
   - GETs the public WebID profile → `200` (no auth needed, no 401)
   - GETs `{storage}/comidas-gratis/agent.ttl` → `404` if it doesn't exist yet (not `401`)

Since neither request ever produced a `401`, the auth provider never activated and no popup appeared.

### Fix: `ensureAuthenticated()` in `client/solid-pod.ts`

Added a function that deliberately triggers the auth flow by attempting a **write** (which pod servers protect) instead of a read:

```ts
export async function ensureAuthenticated(webId: string): Promise<string> {
  const storage = await getStorageUrl(webId);
  if (!storage) throw new Error("No Pod storage URL found in WebID profile");

  const base = storage.endsWith("/") ? storage : `${storage}/`;
  const containerUrl = `${base}comidas-gratis/`;

  // PUT to the container — 401s if unauthenticated, triggering the OIDC
  // popup via the patched fetch. After auth, the retry creates the
  // container (or 409/412 if it exists) — either outcome is fine.
  const resp = await fetch(containerUrl, {
    method: "PUT",
    headers: { "Content-Type": "text/turtle", "If-None-Match": "*" },
    body: "",
  });

  if (!resp.ok && resp.status !== 412) {
    throw new Error(`Auth probe failed: ${resp.status} ${resp.statusText}`);
  }
  return storage;
}
```

Updated `provider.js` and `receiver.js` login handlers to call `ensureAuthenticated(webId)` before `readAgentFromPod(webId)`, and to roll back (`clearStoredWebId()`, reset login UI) on failure instead of leaving a half-logged-in state.

### Files touched this session

| File | Change |
|---|---|
| `deno.json` | Removed `@jeswr/fetch-rdf`/`oauth4webapi`/`dpop`; added `sed` post-process to bundle task |
| `client/solid-auth.ts` | Rewritten to use published `DPoPTokenProvider` (no custom WebID provider) |
| `client/solid-pod.ts` | Rewritten to parse with `n3.Parser` directly; added `ensureAuthenticated()` |
| `client/webid-token-provider.ts` | Deleted (depended on `@jeswr/fetch-rdf`) |
| `client/login-ux.ts` | Deleted (depended on `@jeswr/fetch-rdf`) |
| `public/provider.html`, `receiver.html`, `index.html` | Re-added a WebID `<input>` (needed since `DPoPTokenProvider` has no built-in WebID prompt UI) |
| `public/provider.js`, `receiver.js` | Login handler now calls `ensureAuthenticated()` before reading pod data; error path resets login state |
| `public/app.js` | Same WebID-input + `setStoredWebId` pattern for the index page's lightweight login |
| `package.json` | Reverted the ineffective `"overrides"` field (Deno doesn't honor it) |

### Key lesson

`@solid/reactive-authentication`'s reactive model means **auth only ever triggers on a 401**. Any login UX built on top of it must ensure the very first authenticated action is a request that the server will actually reject unauthenticated — a public profile read or a 404 on a not-yet-created resource will silently skip the auth flow.
