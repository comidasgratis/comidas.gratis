# RDF Wrappers and Solid Pod Integration
_Session on 2026-05-14 with Claude Code (Opus 4.6)_

---

## 1. Create RDF wrapper classes using @rdfjs/wrapper

**User:** Using the wrapper https://rdf.js.org/wrapper/ take our existing data model in `data/model.ts` and create wrapping classes that will allow us to read/write RDF.

**Claude:**

Researched the `@rdfjs/wrapper` v0.34.0 API (TermWrapper, DatasetWrapper, property helpers) and the `@solid/object` library which extends it with Solid-specific classes (WebID Agent, vocabulary constants).

### Decisions made via user input
- **Vocabularies:** Use well-known RDF vocabularies (WGS84 for coordinates, FOAF for names, ICAL for schedules) plus a custom `https://comidas.gratis/vocab#` namespace for domain-specific predicates.
- **RDF implementation:** N3.js for DataFactory and DatasetCore (Store).
- **File location:** New `data/rdf.ts`, keep existing `receiver.ts` as-is.
- **Coordinates:** Flatten lat/long directly onto LocationRdf (no separate GeoPoint wrapper) per user preference.
- **Base class:** Extend `@solid/object`'s `Agent` class (which already has FOAF/VCARD profile properties) per user preference.

### Version compatibility discovery
`@solid/object@0.5.0` depends on `@rdfjs/wrapper@^0.32.0`, which has a different API than v0.34.0:
- v0.32.0 uses **instance methods**: `this.singular()`, `this.singularNullable()`, `this.overwrite()`, `this.overwriteNullable()`, `this.objects()`
- v0.34.0 uses **static helpers**: `RequiredFrom.subjectPredicate()`, `OptionalFrom.subjectPredicate()`, `SetFrom.subjectPredicate()`

The code was written against the v0.32.0 API to stay compatible with `@solid/object`.

### Files created/modified

**`vocabulary.ts`** — Namespace constants:
- `FOAF` (name), `ICAL` (dtstart, dtend, location, summary), `RDF` (type), `WGS84` (lat, long)
- `COMIDAS` — custom predicates (details, hasLocation, availability, provision, role, flag, schedule) and class IRIs (Agent, Location, Schedule, Availability)

**`data/rdf.ts`** — Wrapper classes:
- `ScheduleRdf` extends `TermWrapper` — start/end via ICAL predicates
- `LocationRdf` extends `TermWrapper` — name (FOAF), lat/lng (WGS84), details (COMIDAS)
- `AvailabilityRdf` extends `TermWrapper` — schedule, location (linked), provisions (Set), role, details
- `ComidasAgent` extends `@solid/object Agent` — inherits name/email/phone/storage; adds locations, availabilities, flags as Sets
- `ComidasDataset` extends `DatasetWrapper` — `allAgents()` via `instancesOf`
- Conversion functions: `agentToRdf`/`agentFromRdf`, `locationToRdf`/`locationFromRdf`, `scheduleToRdf`/`scheduleFromRdf`, `availabilityToRdf`/`availabilityFromRdf`
- Factory: `createComidasDataset(agents, dataset, factory)`

**`data/index.ts`** — Added `export * from './rdf.js'`

**`deno.json`** — Added dependencies: `@solid/object@^0.5.0`, `@rdfjs/wrapper@^0.32.0`, `@rdfjs/types@^2.0.0`, `n3@^1.26.0`, `@types/n3@^1.21.0`

---

## 2. Wire up RDF model to application — Solid Pod integration

**User:** Wire up the new RDF model implementation to the application.

**Claude:** Asked about scope; user indicated this was the right time to offload data to a user's Solid Pod.

### Decisions
- **Scope:** Read/write agent data to the user's Solid Pod (not just store-level integration)
- **Auth approach:** Initially tried `@inrupt/solid-client-authn-browser` v4.0.0, but its bundle emitted `node:module`, `node:crypto`, `node:events`, `node:buffer` imports that browsers can't resolve. Replaced with a vanilla Solid-OIDC implementation adapted from the `vlntr.rsvp` project using only native browser APIs.

### Files created/modified

**`public/js/auth/solid-auth.js`** — Solid-OIDC authentication (adapted from vlntr.rsvp):
- `solidLogin(issuer, redirectUrl)` — full OIDC authorization code flow with PKCE + DPoP
- `handleRedirect()` — completes login after IdP redirect, exchanges code for tokens
- `getSessionInfo()` — returns `{ isLoggedIn, webId }`
- `solidLogoutUser()` — clears session from localStorage/sessionStorage
- `getAuthFetch()` — returns a fetch wrapper that attaches DPoP proofs or Bearer tokens
- Session persisted in localStorage; DPoP private key stored as JWK

**`public/js/auth/oidc-discovery.js`** — OIDC discovery (`.well-known/openid-configuration`) + dynamic client registration

**`public/js/auth/dpop.js`** — DPoP proof generation (ES256 via Web Crypto API), JWT signing, base64url encoding

**`public/js/utils/uuid.js`** — UUID v4 via `crypto.getRandomValues` (works in insecure contexts unlike `crypto.randomUUID`)

**`public/solid-pod.js`** — Pod I/O module (vanilla ES module, no bundler):
- `initSession()` — handles OIDC redirect callback, restores previous session
- `solidLogin(oidcIssuer)` — triggers OIDC redirect to current page
- `solidLogout()` — app-level logout
- `getStorageUrl()` — fetches WebID profile as Turtle, finds `pim:storage` or `solid:storage` URL
- `readAgentFromPod()` — GET `{storage}/comidas-gratis/agent.ttl`, parse Turtle, return plain Agent
- `writeAgentToPod(agent)` — serialize Agent to Turtle, PUT to Pod
- Includes inline Turtle parsing/serialization for the comidas.gratis data shape (no N3.js dependency in browser)

**`public/client-id.jsonld`** — Solid OIDC client identifier document for dynamic registration (localhost + comidas.gratis redirect URIs)

**`client/solid-pod.ts`** — Server-side reference implementation using N3.js + `@solid/object` WebIdDataset + `data/rdf.ts` wrappers (not used in browser; kept for potential server-side use)

**`public/index.html`**, **`public/provider.html`**, **`public/receiver.html`** — Added Solid login UI section (OIDC issuer input + login/logout buttons)

**`public/provider.js`** — Added Solid Pod integration:
- On load: `initSession()` → if logged in, `readAgentFromPod()` → fill form
- On save: `writeAgentToPod(agent)` when logged in, plus localStorage
- Wire login/logout buttons, show user WebID when logged in
- localStorage fallback preserved when not logged in

**`public/receiver.js`** — Same Pod integration pattern as provider.js

**`public/app.js`** — Added login UI wiring for overview page

**`public/styles.css`** — Added `.solid-login` styles for the login bar

**`server.ts`** — Added `.jsonld` MIME type mapping

---

## Dependencies in deno.json

| Package | Version | Purpose |
|---------|---------|---------|
| `@solid/object` | ^0.5.0 | RDF mapping classes for Solid (WebID Agent, vocabularies) |
| `@rdfjs/wrapper` | ^0.32.0 | Base TermWrapper/DatasetWrapper for RDF-to-JS mapping |
| `@rdfjs/types` | ^2.0.0 | TypeScript type definitions for RDF/JS interfaces |
| `n3` | ^1.26.0 | N3.js — RDF parser, writer, store, and data factory |
| `@types/n3` | ^1.21.0 | TypeScript definitions for N3.js |

Browser-side Solid auth uses no npm packages — only native Web Crypto, fetch, and localStorage.

---

## Architecture

```
Browser                                    Solid Pod
───────                                    ─────────
provider.js / receiver.js
  ↓ import
solid-pod.js (vanilla ES module, no bundler)
  ├── js/auth/solid-auth.js                → Solid-OIDC login (PKCE + DPoP)
  ├── js/auth/oidc-discovery.js            → OIDC discovery + client registration
  ├── js/auth/dpop.js                      → DPoP proof (Web Crypto API)
  └── inline Turtle parse/serialize        → Agent ↔ RDF conversion
                                              ↕ authenticated fetch
                                           {storage}/comidas-gratis/agent.ttl
```

### Data flow when logged in
1. User clicks "Log in with Solid" → OIDC redirect to identity provider
2. After redirect back → `handleRedirect()` exchanges code for tokens (PKCE + DPoP)
3. `getStorageUrl()` fetches WebID profile as Turtle → finds `pim:storage` URL
4. `readAgentFromPod()`: GET `{storage}/comidas-gratis/agent.ttl` → parse Turtle → plain Agent object
5. On save: plain Agent → serialize to Turtle → PUT to Pod with DPoP-authenticated fetch

### Fallback
When not logged in, localStorage continues to work exactly as before — no regression.

---

## RDF vocabulary mapping

| Model field | RDF predicate | Source |
|-------------|---------------|--------|
| Agent (type) | `rdf:type comidas:Agent` | Custom |
| Agent.name | `foaf:name` | FOAF |
| Agent.locations | `comidas:hasLocation` | Custom |
| Agent.availabilities | `comidas:availability` | Custom |
| Agent.flags | `comidas:flag` | Custom |
| Location.name | `foaf:name` | FOAF |
| Location.lat | `wgs84:lat` | WGS84 |
| Location.lng | `wgs84:long` | WGS84 |
| Location.details | `comidas:details` | Custom |
| Schedule.start | `ical:dtstart` | ICAL |
| Schedule.end | `ical:dtend` | ICAL |
| Availability.schedule | `comidas:schedule` | Custom |
| Availability.location | `ical:location` | ICAL |
| Availability.provisions | `comidas:provision` | Custom |
| Availability.role | `comidas:role` | Custom |
| Availability.details | `ical:summary` | ICAL |

---

## All new/untracked files

| File | Purpose |
|------|---------|
| `data/rdf.ts` | RDF wrapper classes + conversion functions (TypeScript, server-side) |
| `client/solid-pod.ts` | Server-side Pod I/O reference using N3.js + @solid/object |
| `public/solid-pod.js` | Browser-side Pod I/O (vanilla JS, Turtle parse/serialize) |
| `public/js/auth/solid-auth.js` | Solid-OIDC login, session management, authenticated fetch |
| `public/js/auth/oidc-discovery.js` | OIDC discovery + dynamic client registration |
| `public/js/auth/dpop.js` | DPoP proof generation (ES256 via Web Crypto) |
| `public/js/utils/uuid.js` | UUID v4 generator |
| `public/client-id.jsonld` | Solid OIDC client identifier document |
| `vocabulary.ts` | RDF namespace constants (FOAF, ICAL, RDF, WGS84, COMIDAS) |
