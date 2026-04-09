import {
  defaultReceiverAgent,
  FAKE_AGENTS,
  agentsWithProviderRole,
  distanceKm,
} from './role-pages-lib.js';
import {
  groupAvailabilitiesByLocation,
  formatSchedule,
  providerAvailabilitiesAtLocation,
} from './availability-display.js';

const STORAGE_KEY = 'comidas.gratis.receiver.v4';

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function parseCoord(value) {
  const t = String(value).trim();
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

function parseFlags(input) {
  const parts = String(input)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length ? parts : undefined;
}

function locKey(loc) {
  return `${loc.name}|${loc.coordinates.lat}|${loc.coordinates.lng}`;
}

function collectReceiverAvailabilityRows(container) {
  const rows = container.querySelectorAll('.presence-row');
  const out = [];
  for (const row of rows) {
    const start = row.querySelector('[data-field="start"]')?.value?.trim() ?? '';
    const endRaw = row.querySelector('[data-field="end"]')?.value?.trim() ?? '';
    const name = row.querySelector('[data-field="location"]')?.value?.trim() ?? '';
    const lat = parseCoord(row.querySelector('[data-field="lat"]')?.value ?? '');
    const lng = parseCoord(row.querySelector('[data-field="lng"]')?.value ?? '');
    const details = row.querySelector('[data-field="details"]')?.value?.trim() ?? '';
    if (!start || !name) continue;
    if (lat === undefined || lng === undefined) continue;
    const schedule = endRaw ? { start, end: endRaw } : { start };
    out.push({
      schedule,
      location: { name, coordinates: { lat, lng }, details },
      provisions: [],
      role: 'receiver',
    });
  }
  return out;
}

function internLocations(availabilities) {
  const map = new Map();
  for (const av of availabilities) {
    const k = locKey(av.location);
    if (!map.has(k)) map.set(k, av.location);
    else av.location = map.get(k);
  }
}

function readReceiverAgentFromForm() {
  const availabilities = collectReceiverAvailabilityRows(
    document.querySelector('#presence-rows'),
  );
  internLocations(availabilities);
  const uniqueLocs = [];
  const seen = new Set();
  for (const av of availabilities) {
    const k = locKey(av.location);
    if (!seen.has(k)) {
      seen.add(k);
      uniqueLocs.push(av.location);
    }
  }
  return {
    '@id': document.querySelector('#agent-id').value.trim(),
    name: document.querySelector('#agent-name').value.trim(),
    locations: uniqueLocs,
    availabilities,
    flags: parseFlags(document.querySelector('#flags').value),
  };
}

function addPresenceRow(container, tpl, data) {
  const node = tpl.content.cloneNode(true);
  const row = node.querySelector('.presence-row');
  if (data) {
    row.querySelector('[data-field="start"]').value = data.schedule?.start ?? '';
    row.querySelector('[data-field="end"]').value = data.schedule?.end ?? '';
    row.querySelector('[data-field="location"]').value = data.location?.name ?? '';
    row.querySelector('[data-field="lat"]').value =
      data.location?.coordinates != null ? String(data.location.coordinates.lat) : '';
    row.querySelector('[data-field="lng"]').value =
      data.location?.coordinates != null ? String(data.location.coordinates.lng) : '';
    row.querySelector('[data-field="details"]').value = data.location?.details ?? '';
  }
  container.appendChild(node);
}

function fillForm(agent) {
  document.querySelector('#agent-name').value = agent.name ?? '';
  document.querySelector('#agent-id').value = agent['@id'] ?? '';
  document.querySelector('#flags').value = (agent.flags ?? []).join(', ');

  const list = document.querySelector('#presence-rows');
  const tpl = document.querySelector('#presence-tpl');
  list.replaceChildren();
  const ravs = (agent.availabilities ?? []).filter((av) => av.role === 'receiver');
  const slots = ravs.length > 0 ? ravs : [{}];
  for (const av of slots) {
    const hasData =
      Boolean(av?.schedule?.start) || Boolean(av?.location?.name);
    addPresenceRow(list, tpl, hasData ? av : null);
  }
}

function loadProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultReceiverAgent();
    const parsed = JSON.parse(raw);
    if (!parsed?.['@id'] || !Array.isArray(parsed.availabilities)) {
      return defaultReceiverAgent();
    }
    return parsed;
  } catch {
    return defaultReceiverAgent();
  }
}

function saveProfile(agent) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(agent));
}

function nearbyForCoord(coord, providerAgents, maxKm) {
  const hits = [];
  for (const agent of providerAgents) {
    for (const av of agent.availabilities) {
      if (av.role !== 'provider') continue;
      const d = distanceKm(coord, av.location.coordinates);
      if (d <= maxKm) hits.push({ agent, av, d });
    }
  }
  hits.sort((a, b) => a.d - b.d);
  const byAgent = new Map();
  for (const h of hits) {
    const id = h.agent['@id'];
    const prev = byAgent.get(id);
    if (!prev || h.d < prev.d) {
      byAgent.set(id, { agent: h.agent, d: h.d, location: h.av.location });
    }
  }
  return [...byAgent.values()].sort((a, b) => a.d - b.d);
}

function renderNearby(agent, maxKm) {
  const root = document.querySelector('#nearby-sections');
  root.replaceChildren();

  const ravs = (agent.availabilities ?? []).filter((av) => av.role === 'receiver');
  if (ravs.length === 0) {
    const p = document.createElement('p');
    p.className = 'muted';
    p.textContent =
      'Add at least one receiver availability with coordinates to see nearby providers.';
    root.appendChild(p);
    return;
  }

  const catalog = agentsWithProviderRole(FAKE_AGENTS);
  const locationGroups = groupAvailabilitiesByLocation(ravs);

  locationGroups.forEach((g) => {
    const wrap = document.createElement('div');
    wrap.className = 'panel nearby-group';

    const loc = g.location;
    const h3 = document.createElement('h3');
    h3.textContent = loc.name || '(no label)';
    wrap.appendChild(h3);

    const coord = loc.coordinates;
    if (!coord) {
      const p = document.createElement('p');
      p.className = 'muted';
      p.textContent = 'No coordinates — add latitude and longitude for this location.';
      wrap.appendChild(p);
      root.appendChild(wrap);
      return;
    }

    const coordLine = document.createElement('div');
    coordLine.className = 'meta';
    coordLine.textContent = `${coord.lat.toFixed(4)}, ${coord.lng.toFixed(4)}`;
    wrap.appendChild(coordLine);

    if (loc.details) {
      const det = document.createElement('div');
      det.className = 'meta';
      det.textContent = loc.details;
      wrap.appendChild(det);
    }

    const schHead = document.createElement('p');
    schHead.className = 'schedules-heading';
    schHead.textContent = 'Your schedules at this location';
    wrap.appendChild(schHead);

    const schUl = document.createElement('ul');
    schUl.className = 'schedule-list limit-h';
    const sortedItems = [...g.items].sort((a, b) =>
      String(a.schedule?.start ?? '').localeCompare(String(b.schedule?.start ?? '')),
    );
    for (const av of sortedItems) {
      const li = document.createElement('li');
      li.textContent = formatSchedule(av);
      schUl.appendChild(li);
    }
    wrap.appendChild(schUl);

    const matches = nearbyForCoord(coord, catalog, maxKm);
    if (matches.length === 0) {
      const p = document.createElement('p');
      p.className = 'muted';
      p.textContent = `No demo providers within ${maxKm} km. Try increasing the radius.`;
      wrap.appendChild(p);
      root.appendChild(wrap);
      return;
    }

    const provHead = document.createElement('p');
    provHead.className = 'schedules-heading';
    provHead.textContent = 'Nearby provider agents';
    wrap.appendChild(provHead);

    const ul = document.createElement('ul');
    ul.className = 'card-list';
    for (const hit of matches) {
      const pa = hit.agent;
      const d = hit.d;
      const atLoc = providerAvailabilitiesAtLocation(pa, hit.location).sort((a, b) =>
        String(a.schedule?.start ?? '').localeCompare(String(b.schedule?.start ?? '')),
      );
      const li = document.createElement('li');
      li.className = 'card match';
      let body = `
        <strong>${escapeHtml(pa.name)}</strong>
        <div class="meta">${escapeHtml(hit.location.name)}</div>
        <div class="meta">${Math.round(d * 1000) / 1000} km away</div>
        <div class="meta">${escapeHtml(hit.location.details ?? '')}</div>
        <p class="schedules-heading" style="margin-top:0.4rem">Schedules at this site</p>
        <ul class="schedule-list">
      `;
      for (const pav of atLoc) {
        const prov = (pav.provisions ?? []).join(', ');
        const extra = prov ? ` · ${escapeHtml(prov)}` : '';
        body += `<li>${escapeHtml(formatSchedule(pav))}${extra}</li>`;
      }
      body += `</ul>`;
      li.innerHTML = body;
      ul.appendChild(li);
    }
    wrap.appendChild(ul);
    root.appendChild(wrap);
  });
}

function setStatus(el, message, isError) {
  el.textContent = message;
  el.classList.toggle('error', Boolean(isError));
}

function main() {
  const form = document.querySelector('#receiver-form');
  const status = document.querySelector('#form-status');
  const list = document.querySelector('#presence-rows');
  const tpl = document.querySelector('#presence-tpl');
  const radius = document.querySelector('#radius');
  const radiusValue = document.querySelector('#radius-value');

  let current = loadProfile();
  fillForm(current);
  renderNearby(current, Number(radius.value));

  radius.addEventListener('input', () => {
    radiusValue.textContent = radius.value;
  });

  radius.addEventListener('change', () => {
    renderNearby(current, Number(radius.value));
  });

  document.querySelector('#add-presence').addEventListener('click', () => {
    addPresenceRow(list, tpl, null);
  });

  list.addEventListener('click', (e) => {
    if (e.target.closest('[data-action="remove-row"]')) {
      const row = e.target.closest('.presence-row');
      if (row && list.querySelectorAll('.presence-row').length > 1) {
        row.remove();
      }
    }
  });

  document.querySelector('#reset-demo').addEventListener('click', () => {
    const fresh = defaultReceiverAgent();
    current = fresh;
    fillForm(fresh);
    saveProfile(fresh);
    renderNearby(current, Number(radius.value));
    setStatus(status, 'Restored demo defaults and saved.');
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const agentName = document.querySelector('#agent-name').value.trim();
    if (!agentName) {
      setStatus(status, 'Display name is required.', true);
      return;
    }
    const agent = readReceiverAgentFromForm();
    if (agent.availabilities.length === 0) {
      setStatus(status, 'Add at least one availability with start, location name, and coordinates.', true);
      return;
    }
    current = agent;
    saveProfile(agent);
    renderNearby(current, Number(radius.value));
    setStatus(status, 'Saved to local storage in this browser.');
  });
}

main();
