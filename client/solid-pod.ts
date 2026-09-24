import { fetchRdf, RdfFetchError } from "@jeswr/fetch-rdf";
import { WebIdDataset } from "@solid/object";
import * as BrowserBuffer from "buffer";
import * as BrowserEvents from "events";
import { Store, Writer, DataFactory } from "n3";
import type { DatasetCore } from "@rdfjs/types";
import type { Agent } from "../data/model.js";
import { ComidasDataset, agentToRdf, agentFromRdf } from "../data/rdf.js";

// Keep the browser Buffer implementation in the bundle for stream dependencies.
void BrowserBuffer;
void BrowserEvents;

const AGENT_PATH = "comidas-gratis/agent.ttl";
const CONTAINER_PATH = "comidas-gratis/";

/**
 * Ensure the user is authenticated by attempting a write to their pod.
 * Public GETs return 200/404 without triggering auth; a PUT will 401,
 * causing the patched fetch to run the OIDC popup flow.
 */
export async function ensureAuthenticated(webId: string): Promise<string> {
  const storage = await getStorageUrl(webId);
  if (!storage) throw new Error("No Pod storage URL found in WebID profile");

  const base = storage.endsWith("/") ? storage : `${storage}/`;
  const containerUrl = `${base}${CONTAINER_PATH}`;

  // PUT to the container — if unauthenticated this 401s, triggering the
  // reactive auth flow (OIDC popup). After auth the retry creates the
  // container (or 409/200 if it already exists). Either outcome is fine.
  const resp = await fetch(containerUrl, {
    method: "PUT",
    headers: { "Content-Type": "text/turtle", "If-None-Match": "*" },
    body: "",
  });

  // 201 = created, 200/204 = existed, 412 = existed (If-None-Match failed) — all fine
  if (!resp.ok && resp.status !== 412) {
    throw new Error(`Auth probe failed: ${resp.status} ${resp.statusText}`);
  }

  return storage;
}

async function fetchTurtle(
  url: string,
): Promise<{ store: DatasetCore; etag: string | null }> {
  try {
    const result = await fetchRdf(url);
    return { store: result.dataset, etag: result.etag };
  } catch (error) {
    if (error instanceof RdfFetchError) {
      throw new FetchError(error.status ?? 0, error.url ?? url);
    }
    throw error;
  }
}

export class FetchError extends Error {
  readonly status: number;
  readonly url: string;
  constructor(status: number, url: string) {
    super(`Fetch failed: ${status} ${url}`);
    this.name = "FetchError";
    this.status = status;
    this.url = url;
  }
}

export async function getStorageUrl(webId: string): Promise<string | null> {
  const { store } = await fetchTurtle(webId);
  const profile = new WebIdDataset(store, DataFactory);
  const me = profile.mainSubject;
  if (!me) return null;
  for (const url of me.storageUrls) return url;
  return null;
}

function agentUrl(storageUrl: string): string {
  const base = storageUrl.endsWith("/") ? storageUrl : `${storageUrl}/`;
  return `${base}${AGENT_PATH}`;
}

export async function readAgentFromPod(webId: string): Promise<Agent | null> {
  const storage = await getStorageUrl(webId);
  if (!storage) return null;

  const url = agentUrl(storage);
  try {
    const { store } = await fetchTurtle(url);
    const ds = new ComidasDataset(store, DataFactory);
    for (const a of ds.allAgents()) {
      return agentFromRdf(a);
    }
    return null;
  } catch (e) {
    if (e instanceof FetchError && e.status === 404) return null;
    throw e;
  }
}

export async function writeAgentToPod(
  agent: Agent,
  webId: string,
): Promise<void> {
  const storage = await getStorageUrl(webId);
  if (!storage) throw new Error("No Pod storage URL found");

  const url = agentUrl(storage);

  let etag: string | null = null;
  try {
    const existing = await fetchTurtle(url);
    etag = existing.etag;
  } catch (e) {
    if (!(e instanceof FetchError && e.status === 404)) throw e;
  }

  const store = new Store();
  agentToRdf(agent, store, DataFactory);

  const turtle = await new Promise<string>((resolve, reject) => {
    const writer = new Writer({
      prefixes: {
        comidas: "https://comidas.gratis/vocab#",
        foaf: "http://xmlns.com/foaf/0.1/",
        ical: "http://www.w3.org/2002/12/cal/ical#",
        wgs84: "http://www.w3.org/2003/01/geo/wgs84_pos#",
      },
    });
    for (const quad of store) writer.addQuad(quad);
    writer.end((err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });

  const headers: Record<string, string> = {
    "Content-Type": "text/turtle",
  };
  if (etag) headers["If-Match"] = etag;

  const resp = await fetch(url, {
    method: "PUT",
    headers,
    body: turtle,
  });

  if (resp.status === 412) {
    throw new Error(
      "Conflict: the resource was modified by someone else. Reload and try again.",
    );
  }
  if (!resp.ok) {
    throw new Error(
      `Failed to write to Pod: ${resp.status} ${resp.statusText}`,
    );
  }
}
