import {
  login,
  logout,
  handleIncomingRedirect,
  getDefaultSession,
  fetch as solidFetch,
} from "@inrupt/solid-client-authn-browser";
import { WebIdDataset } from "@solid/object";
import { Store, Parser, Writer, DataFactory } from "n3";
import type { Agent } from "../data/model.js";
import {
  ComidasDataset,
  agentToRdf,
  agentFromRdf,
} from "../data/rdf.js";

const AGENT_PATH = "comidas-gratis/agent.ttl";

// ---------------------------------------------------------------------------
// Session management
// ---------------------------------------------------------------------------

export async function initSession(): Promise<{
  isLoggedIn: boolean;
  webId?: string;
}> {
  const info = await handleIncomingRedirect({ restorePreviousSession: true });
  return { isLoggedIn: info?.isLoggedIn ?? false, webId: info?.webId };
}

export function getSessionInfo(): { isLoggedIn: boolean; webId?: string } {
  const { isLoggedIn, webId } = getDefaultSession().info;
  return { isLoggedIn, webId };
}

export async function solidLogin(oidcIssuer: string): Promise<void> {
  await login({
    oidcIssuer,
    redirectUrl: window.location.href,
    clientName: "comidas.gratis",
  });
}

export async function solidLogout(): Promise<void> {
  await logout({ logoutType: "app" });
}

// ---------------------------------------------------------------------------
// WebID profile → storage URL
// ---------------------------------------------------------------------------

export async function getStorageUrl(): Promise<string | null> {
  const { webId } = getDefaultSession().info;
  if (!webId) return null;

  const resp = await solidFetch(webId, {
    headers: { Accept: "text/turtle" },
  });
  if (!resp.ok) return null;

  const turtle = await resp.text();
  const store = new Store();
  const parser = new Parser({ baseIRI: webId });
  store.addQuads(parser.parse(turtle));

  const ds = new WebIdDataset(store, DataFactory);
  const agent = ds.mainSubject;
  if (!agent) return null;

  const urls = agent.storageUrls;
  for (const url of urls) return url;
  return null;
}

// ---------------------------------------------------------------------------
// Pod CRUD
// ---------------------------------------------------------------------------

function agentUrl(storageUrl: string): string {
  const base = storageUrl.endsWith("/") ? storageUrl : `${storageUrl}/`;
  return `${base}${AGENT_PATH}`;
}

export async function readAgentFromPod(): Promise<Agent | null> {
  const storage = await getStorageUrl();
  if (!storage) return null;

  const url = agentUrl(storage);
  const resp = await solidFetch(url, {
    headers: { Accept: "text/turtle" },
  });
  if (!resp.ok) return null;

  const turtle = await resp.text();
  const store = new Store();
  const parser = new Parser({ baseIRI: url });
  store.addQuads(parser.parse(turtle));

  const ds = new ComidasDataset(store, DataFactory);
  for (const a of ds.allAgents()) {
    return agentFromRdf(a);
  }
  return null;
}

export async function writeAgentToPod(agent: Agent): Promise<void> {
  const storage = await getStorageUrl();
  if (!storage) throw new Error("No Pod storage URL found");

  const url = agentUrl(storage);
  const store = new Store();
  agentToRdf(agent, store, DataFactory);

  const turtle = await new Promise<string>((resolve, reject) => {
    const writer = new Writer({ prefixes: {
      comidas: "https://comidas.gratis/vocab#",
      foaf: "http://xmlns.com/foaf/0.1/",
      ical: "http://www.w3.org/2002/12/cal/ical#",
      wgs84: "http://www.w3.org/2003/01/geo/wgs84_pos#",
    }});
    for (const quad of store) writer.addQuad(quad);
    writer.end((err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });

  const resp = await solidFetch(url, {
    method: "PUT",
    headers: { "Content-Type": "text/turtle" },
    body: turtle,
  });
  if (!resp.ok) {
    throw new Error(`Failed to write to Pod: ${resp.status} ${resp.statusText}`);
  }
}
