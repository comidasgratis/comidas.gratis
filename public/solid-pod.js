import {
  solidLogin as _solidLogin,
  handleRedirect,
  solidLogoutUser,
  getSessionInfo,
  getAuthFetch,
} from './js/auth/solid-auth.js';

export { getSessionInfo };

const AGENT_PATH = "comidas-gratis/agent.ttl";

// ---------------------------------------------------------------------------
// Session management
// ---------------------------------------------------------------------------

export async function initSession() {
  return handleRedirect();
}

export function solidLogin(oidcIssuer) {
  return _solidLogin(oidcIssuer, window.location.href);
}

export async function solidLogout() {
  await solidLogoutUser();
}

// ---------------------------------------------------------------------------
// WebID profile → storage URL
// ---------------------------------------------------------------------------

export async function getStorageUrl() {
  const { webId } = getSessionInfo();
  if (!webId) return null;

  const authFetch = getAuthFetch();
  const resp = await authFetch(webId, {
    headers: { Accept: "text/turtle" },
  });
  if (!resp.ok) return null;

  const turtle = await resp.text();
  const storagePredicates = [
    "http://www.w3.org/ns/pim/space#storage",
    "http://www.w3.org/ns/solid/terms#storage",
  ];

  for (const pred of storagePredicates) {
    const match = findObject(turtle, pred);
    if (match) return match;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Pod CRUD
// ---------------------------------------------------------------------------

function agentUrl(storageUrl) {
  const base = storageUrl.endsWith("/") ? storageUrl : `${storageUrl}/`;
  return `${base}${AGENT_PATH}`;
}

export async function readAgentFromPod() {
  const storage = await getStorageUrl();
  if (!storage) return null;

  const url = agentUrl(storage);
  const authFetch = getAuthFetch();
  const resp = await authFetch(url, {
    headers: { Accept: "text/turtle" },
  });
  if (!resp.ok) return null;

  const turtle = await resp.text();
  return parseAgentTurtle(turtle, url);
}

export async function writeAgentToPod(agent) {
  const storage = await getStorageUrl();
  if (!storage) throw new Error("No Pod storage URL found");

  const url = agentUrl(storage);
  const turtle = serializeAgentTurtle(agent);

  const authFetch = getAuthFetch();
  const resp = await authFetch(url, {
    method: "PUT",
    headers: { "Content-Type": "text/turtle" },
    body: turtle,
  });
  if (!resp.ok) {
    throw new Error(`Failed to write to Pod: ${resp.status} ${resp.statusText}`);
  }
}

// ---------------------------------------------------------------------------
// Turtle parsing (minimal, for our known data shape)
// ---------------------------------------------------------------------------

function findObject(turtle, predicate) {
  const escaped = predicate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`<${escaped}>\\s+<([^>]+)>`, 'm');
  const m = turtle.match(re);
  return m ? m[1] : null;
}

function parseAgentTurtle(turtle, baseUrl) {
  const lines = turtle.split('\n');
  const prefixes = {};
  const triples = [];

  for (const line of lines) {
    const trimmed = line.trim();
    const prefixMatch = trimmed.match(/^@prefix\s+(\w*):\s+<([^>]+)>\s*\.$/);
    if (prefixMatch) {
      prefixes[prefixMatch[1]] = prefixMatch[2];
      continue;
    }
    if (!trimmed || trimmed.startsWith('#') || trimmed === '.') continue;
    triples.push(trimmed);
  }

  const resolve = (term) => {
    if (!term) return '';
    if (term.startsWith('<') && term.endsWith('>')) return term.slice(1, -1);
    const colonIdx = term.indexOf(':');
    if (colonIdx >= 0) {
      const prefix = term.slice(0, colonIdx);
      const local = term.slice(colonIdx + 1);
      if (prefixes[prefix]) return prefixes[prefix] + local;
    }
    return term;
  };

  const unquote = (term) => {
    if (!term) return '';
    const m = term.match(/^"((?:[^"\\]|\\.)*)"(?:\^\^.+)?$/);
    return m ? m[1] : term;
  };

  const subjects = {};
  let currentSubject = null;
  const fullText = triples.join(' ');
  const statements = fullText.split(/\s*\.\s*/);

  for (const stmt of statements) {
    if (!stmt.trim()) continue;
    const parts = stmt.trim().split(/\s*;\s*/);
    for (let i = 0; i < parts.length; i++) {
      const tokens = parts[i].trim().match(/(?:<[^>]+>|"(?:[^"\\]|\\.)*"(?:\^\^<[^>]+>)?|_:\w+|\S+)/g);
      if (!tokens) continue;
      if (i === 0 && tokens.length >= 3) {
        currentSubject = resolve(tokens[0]);
        if (!subjects[currentSubject]) subjects[currentSubject] = [];
        subjects[currentSubject].push([resolve(tokens[1]), tokens.slice(2).join(' ')]);
      } else if (i > 0 && currentSubject && tokens.length >= 2) {
        subjects[currentSubject].push([resolve(tokens[0]), tokens.slice(1).join(' ')]);
      }
    }
  }

  const COMIDAS = 'https://comidas.gratis/vocab#';
  const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
  const FOAF_NAME = 'http://xmlns.com/foaf/0.1/name';
  const WGS84_LAT = 'http://www.w3.org/2003/01/geo/wgs84_pos#lat';
  const WGS84_LONG = 'http://www.w3.org/2003/01/geo/wgs84_pos#long';
  const ICAL_DTSTART = 'http://www.w3.org/2002/12/cal/ical#dtstart';
  const ICAL_DTEND = 'http://www.w3.org/2002/12/cal/ical#dtend';
  const ICAL_LOCATION = 'http://www.w3.org/2002/12/cal/ical#location';
  const ICAL_SUMMARY = 'http://www.w3.org/2002/12/cal/ical#summary';

  const getProps = (subj, pred) => {
    if (!subjects[subj]) return [];
    return subjects[subj].filter(([p]) => p === pred).map(([, o]) => o);
  };
  const getProp = (subj, pred) => getProps(subj, pred)[0];

  const agentSubjects = Object.entries(subjects)
    .filter(([, props]) => props.some(([p, o]) => p === RDF_TYPE && resolve(o) === `${COMIDAS}Agent`))
    .map(([s]) => s);

  if (agentSubjects.length === 0) return null;

  const agentId = agentSubjects[0];
  const name = unquote(getProp(agentId, FOAF_NAME) || '""');

  const locationRefs = getProps(agentId, `${COMIDAS}hasLocation`).map(resolve);
  const locations = locationRefs.map((ref) => ({
    name: unquote(getProp(ref, FOAF_NAME) || '""'),
    coordinates: {
      lat: parseFloat(unquote(getProp(ref, WGS84_LAT) || '"0"')),
      lng: parseFloat(unquote(getProp(ref, WGS84_LONG) || '"0"')),
    },
    details: unquote(getProp(ref, `${COMIDAS}details`) || '""'),
  }));

  const avRefs = getProps(agentId, `${COMIDAS}availability`).map(resolve);
  const availabilities = avRefs.map((ref) => {
    const schedRef = resolve(getProp(ref, `${COMIDAS}schedule`) || '');
    const locRef = resolve(getProp(ref, ICAL_LOCATION) || '');
    const start = unquote(getProp(schedRef, ICAL_DTSTART) || '""');
    const endVal = getProp(schedRef, ICAL_DTEND);
    const schedule = endVal ? { start, end: unquote(endVal) } : { start };

    const location = {
      name: unquote(getProp(locRef, FOAF_NAME) || '""'),
      coordinates: {
        lat: parseFloat(unquote(getProp(locRef, WGS84_LAT) || '"0"')),
        lng: parseFloat(unquote(getProp(locRef, WGS84_LONG) || '"0"')),
      },
      details: unquote(getProp(locRef, `${COMIDAS}details`) || '""'),
    };

    const provisions = getProps(ref, `${COMIDAS}provision`).map(unquote);
    const role = unquote(getProp(ref, `${COMIDAS}role`) || '"receiver"');
    const details = getProp(ref, ICAL_SUMMARY);

    const av = { schedule, location, provisions, role };
    if (details) av.details = unquote(details);
    return av;
  });

  const flags = getProps(agentId, `${COMIDAS}flag`).map(unquote);
  const agent = { '@id': agentId, name, locations, availabilities };
  if (flags.length > 0) agent.flags = flags;
  return agent;
}

// ---------------------------------------------------------------------------
// Turtle serialization
// ---------------------------------------------------------------------------

let _blankCounter = 0;
function freshBlank() {
  return `_:b${++_blankCounter}`;
}

export function serializeAgentTurtle(agent) {
  const lines = [];
  lines.push('@prefix comidas: <https://comidas.gratis/vocab#> .');
  lines.push('@prefix foaf: <http://xmlns.com/foaf/0.1/> .');
  lines.push('@prefix ical: <http://www.w3.org/2002/12/cal/ical#> .');
  lines.push('@prefix wgs84: <http://www.w3.org/2003/01/geo/wgs84_pos#> .');
  lines.push('@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .');
  lines.push('@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .');
  lines.push('');

  const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const lit = (s) => `"${esc(s)}"`;
  const dbl = (n) => `"${n}"^^xsd:double`;
  const namedOrBlank = (id) => id.startsWith('_:') ? id : `<${id}>`;

  const agentNode = namedOrBlank(agent['@id']);
  lines.push(`${agentNode} rdf:type comidas:Agent ;`);
  lines.push(`  foaf:name ${lit(agent.name)} .`);
  lines.push('');

  for (const loc of agent.locations) {
    const locId = freshBlank();
    lines.push(`${agentNode} comidas:hasLocation ${locId} .`);
    lines.push(`${locId} foaf:name ${lit(loc.name)} ;`);
    lines.push(`  wgs84:lat ${dbl(loc.coordinates.lat)} ;`);
    lines.push(`  wgs84:long ${dbl(loc.coordinates.lng)} ;`);
    lines.push(`  comidas:details ${lit(loc.details)} .`);
    lines.push('');
  }

  for (const av of agent.availabilities) {
    const avId = freshBlank();
    const schedId = freshBlank();
    const locId = freshBlank();

    lines.push(`${agentNode} comidas:availability ${avId} .`);

    lines.push(`${schedId} ical:dtstart ${lit(av.schedule.start)} .`);
    if (av.schedule.end) {
      lines.push(`${schedId} ical:dtend ${lit(av.schedule.end)} .`);
    }

    lines.push(`${locId} foaf:name ${lit(av.location.name)} ;`);
    lines.push(`  wgs84:lat ${dbl(av.location.coordinates.lat)} ;`);
    lines.push(`  wgs84:long ${dbl(av.location.coordinates.lng)} ;`);
    lines.push(`  comidas:details ${lit(av.location.details)} .`);

    lines.push(`${avId} comidas:schedule ${schedId} ;`);
    lines.push(`  ical:location ${locId} ;`);
    lines.push(`  comidas:role ${lit(av.role)} .`);
    if (av.details) {
      lines.push(`${avId} ical:summary ${lit(av.details)} .`);
    }
    for (const p of av.provisions) {
      lines.push(`${avId} comidas:provision ${lit(p)} .`);
    }
    lines.push('');
  }

  if (agent.flags) {
    for (const flag of agent.flags) {
      lines.push(`${agentNode} comidas:flag ${lit(flag)} .`);
    }
  }

  return lines.join('\n');
}
