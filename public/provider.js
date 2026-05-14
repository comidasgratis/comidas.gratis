import { defaultProviderAgent } from './role-pages-lib.js';
import {
  initSession,
  solidLogin,
  solidLogout,
  getSessionInfo,
  readAgentFromPod,
  writeAgentToPod,
} from './solid-pod.js';

const STORAGE_KEY = 'comidas.gratis.provider.v4';

function parseCoord(value) {
  const t = String(value).trim();
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

function parseProvisions(input) {
  return String(input)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function locationRowCount() {
  return document.querySelectorAll('#location-rows .location-row').length;
}

function rebuildLocationSelects() {
  const n = locationRowCount();
  for (const sel of document.querySelectorAll('.location-select')) {
    const prev = sel.value;
    sel.replaceChildren();
    for (let i = 0; i < n; i++) {
      const opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = `Location #${i + 1}`;
      sel.appendChild(opt);
    }
    if (prev && Number(prev) < n) sel.value = prev;
    else if (n > 0) sel.value = '0';
  }
}

function addLocationRow(container, tpl, data) {
  const node = tpl.content.cloneNode(true);
  const row = node.querySelector('.location-row');
  if (data) {
    row.querySelector('[data-field="loc-name"]').value = data.name ?? '';
    row.querySelector('[data-field="loc-lat"]').value =
      data.coordinates != null ? String(data.coordinates.lat) : '';
    row.querySelector('[data-field="loc-lng"]').value =
      data.coordinates != null ? String(data.coordinates.lng) : '';
    row.querySelector('[data-field="loc-details"]').value = data.details ?? '';
  }
  container.appendChild(node);
  rebuildLocationSelects();
}

function addAvailabilityRow(container, tpl, data) {
  const node = tpl.content.cloneNode(true);
  const row = node.querySelector('.availability-row');
  container.appendChild(node);
  rebuildLocationSelects();
  const sel = row.querySelector('[data-field="location-index"]');
  if (data && typeof data.locationIndex === 'number' && sel.options[data.locationIndex]) {
    sel.value = String(data.locationIndex);
  }
  if (data?.schedule) {
    row.querySelector('[data-field="start"]').value = data.schedule.start ?? '';
    row.querySelector('[data-field="end"]').value = data.schedule.end ?? '';
  }
  if (data?.provisions) {
    row.querySelector('[data-field="provisions"]').value = data.provisions.join(', ');
  }
}

function collectLocations() {
  const out = [];
  for (const row of document.querySelectorAll('#location-rows .location-row')) {
    const name = row.querySelector('[data-field="loc-name"]')?.value?.trim() ?? '';
    const lat = parseCoord(row.querySelector('[data-field="loc-lat"]')?.value ?? '');
    const lng = parseCoord(row.querySelector('[data-field="loc-lng"]')?.value ?? '');
    const details = row.querySelector('[data-field="loc-details"]')?.value?.trim() ?? '';
    if (!name || lat === undefined || lng === undefined) continue;
    out.push({
      name,
      coordinates: { lat, lng },
      details,
    });
  }
  return out;
}

function collectAvailabilities(locations) {
  const out = [];
  for (const row of document.querySelectorAll('#availability-rows .availability-row')) {
    const idx = Number(row.querySelector('[data-field="location-index"]')?.value ?? '0');
    const start = row.querySelector('[data-field="start"]')?.value?.trim() ?? '';
    const endRaw = row.querySelector('[data-field="end"]')?.value?.trim() ?? '';
    const provisions = parseProvisions(row.querySelector('[data-field="provisions"]')?.value ?? '');
    if (!start || !locations[idx]) continue;
    const schedule = endRaw ? { start, end: endRaw } : { start };
    out.push({
      schedule,
      location: locations[idx],
      provisions,
      role: 'provider',
    });
  }
  return out;
}

function locationIndexForAvailability(agent, av) {
  const loc = av.location;
  return agent.locations.findIndex(
    (l) =>
      l.name === loc.name &&
      l.coordinates.lat === loc.coordinates.lat &&
      l.coordinates.lng === loc.coordinates.lng,
  );
}

function fillForm(agent) {
  document.querySelector('#agent-name').value = agent.name ?? '';
  document.querySelector('#agent-id').value = agent['@id'] ?? '';

  const locContainer = document.querySelector('#location-rows');
  const locTpl = document.querySelector('#location-tpl');
  locContainer.replaceChildren();
  const locs = agent.locations?.length ? agent.locations : [{}];
  for (const loc of locs) {
    const hasData =
      (loc?.name != null && String(loc.name).trim() !== '') || loc?.coordinates != null;
    addLocationRow(locContainer, locTpl, hasData ? loc : null);
  }
  if (locationRowCount() === 0) {
    addLocationRow(locContainer, locTpl, null);
  }

  const avContainer = document.querySelector('#availability-rows');
  const avTpl = document.querySelector('#availability-tpl');
  avContainer.replaceChildren();
  const provAvs = (agent.availabilities ?? []).filter((av) => av.role === 'provider');
  const slots = provAvs.length > 0 ? provAvs : [{}];
  for (const av of slots) {
    const rawIdx = av.schedule?.start ? locationIndexForAvailability(agent, av) : 0;
    const idx = rawIdx >= 0 ? rawIdx : 0;
    addAvailabilityRow(avContainer, avTpl, {
      schedule: av.schedule,
      provisions: av.provisions,
      locationIndex: idx,
    });
  }
  rebuildLocationSelects();
}

function readAgentFromForm() {
  const locations = collectLocations();
  const availabilities = collectAvailabilities(locations);
  return {
    '@id': document.querySelector('#agent-id').value.trim(),
    name: document.querySelector('#agent-name').value.trim(),
    locations,
    availabilities,
  };
}

function loadProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProviderAgent();
    const parsed = JSON.parse(raw);
    if (
      !parsed?.['@id'] ||
      !Array.isArray(parsed.locations) ||
      !Array.isArray(parsed.availabilities)
    ) {
      return defaultProviderAgent();
    }
    return parsed;
  } catch {
    return defaultProviderAgent();
  }
}

function saveProfile(agent) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(agent));
}

function setStatus(el, message, isError) {
  el.textContent = message;
  el.classList.toggle('error', Boolean(isError));
}

function updateLoginUI(info) {
  const loggedOut = document.querySelector('#logged-out-view');
  const loggedIn = document.querySelector('#logged-in-view');
  if (!loggedOut || !loggedIn) return;
  if (info.isLoggedIn) {
    loggedOut.hidden = true;
    loggedIn.hidden = false;
    document.querySelector('#user-name').textContent = info.webId ?? '';
  } else {
    loggedOut.hidden = false;
    loggedIn.hidden = true;
  }
}

function wireLoginUI() {
  document.querySelector('#btn-login')?.addEventListener('click', () => {
    const issuer = document.querySelector('#oidc-issuer')?.value?.trim();
    if (issuer) solidLogin(issuer);
  });
  document.querySelector('#btn-logout')?.addEventListener('click', async () => {
    await solidLogout();
    updateLoginUI({ isLoggedIn: false });
  });
}

async function main() {
  const form = document.querySelector('#provider-form');
  const status = document.querySelector('#form-status');
  const locList = document.querySelector('#location-rows');
  const avList = document.querySelector('#availability-rows');
  const locTpl = document.querySelector('#location-tpl');
  const avTpl = document.querySelector('#availability-tpl');

  wireLoginUI();
  const session = await initSession();
  updateLoginUI(session);

  if (session.isLoggedIn) {
    try {
      const podAgent = await readAgentFromPod();
      if (podAgent) {
        fillForm(podAgent);
        saveProfile(podAgent);
        setStatus(status, 'Loaded from Solid Pod.');
      } else {
        fillForm(loadProfile());
      }
    } catch {
      fillForm(loadProfile());
    }
  } else {
    fillForm(loadProfile());
  }

  document.querySelector('#add-location').addEventListener('click', () => {
    addLocationRow(locList, locTpl, null);
  });

  document.querySelector('#add-availability').addEventListener('click', () => {
    addAvailabilityRow(avList, avTpl, null);
  });

  locList.addEventListener('click', (e) => {
    if (e.target.closest('[data-action="remove-location"]')) {
      const row = e.target.closest('.location-row');
      if (row && locationRowCount() > 1) {
        row.remove();
        rebuildLocationSelects();
      }
    }
  });

  avList.addEventListener('click', (e) => {
    if (e.target.closest('[data-action="remove-availability"]')) {
      const row = e.target.closest('.availability-row');
      if (row && avList.querySelectorAll('.availability-row').length > 1) {
        row.remove();
      }
    }
  });

  document.querySelector('#reset-demo').addEventListener('click', () => {
    const fresh = defaultProviderAgent();
    fillForm(fresh);
    saveProfile(fresh);
    setStatus(status, 'Restored demo defaults and saved.');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const agentName = document.querySelector('#agent-name').value.trim();
    if (!agentName) {
      setStatus(status, 'Display name is required.', true);
      return;
    }
    const agent = readAgentFromForm();
    if (agent.locations.length === 0) {
      setStatus(status, 'Add at least one complete location (name, lat, lng).', true);
      return;
    }
    if (agent.availabilities.length === 0) {
      setStatus(status, 'Add at least one availability with a start time.', true);
      return;
    }
    saveProfile(agent);

    if (getSessionInfo().isLoggedIn) {
      try {
        await writeAgentToPod(agent);
        setStatus(status, 'Saved to Solid Pod and local storage.');
      } catch (err) {
        setStatus(status, `Saved locally. Pod write failed: ${err.message}`, true);
      }
    } else {
      setStatus(status, 'Saved to local storage in this browser.');
    }
  });
}

main();
