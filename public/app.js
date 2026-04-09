/**
 * Vanilla UI: wires the ComidasMatchingStore web component to the page.
 * Depends on /register-store.js (bundled from client/register-store.ts).
 */
import './register-store.js';
import {
  groupAvailabilitiesByLocation,
  formatSchedule,
} from './availability-display.js';

/** @param {HTMLElement & { state: object }} store */
function agentNameById(store, id) {
  const a = store.state.agents.find((x) => x['@id'] === id);
  return a ? a.name : id;
}

/** @param {{ availabilities: Array<{ role: string }> }} agent */
function providerAvailabilities(agent) {
  return agent.availabilities.filter((av) => av.role === 'provider');
}

/** @param {{ availabilities: Array<{ role: string }> }} agent */
function receiverAvailabilities(agent) {
  return agent.availabilities.filter((av) => av.role === 'receiver');
}

function coordStr(loc) {
  const c = loc?.coordinates;
  return c ? `${c.lat.toFixed(4)}, ${c.lng.toFixed(4)}` : '—';
}

function renderProviderCard(p) {
  const pavs = providerAvailabilities(p);
  const groups = groupAvailabilitiesByLocation(pavs);
  let inner = `<strong>${escapeHtml(p.name)}</strong>`;
  for (const g of groups) {
    const loc = g.location;
    const items = [...g.items].sort((a, b) =>
      String(a.schedule?.start ?? '').localeCompare(String(b.schedule?.start ?? '')),
    );
    inner += `<div class="location-block">`;
    inner += `<div class="meta loc-title">${escapeHtml(loc.name ?? '—')} · ${escapeHtml(coordStr(loc))}</div>`;
    if (loc.details) {
      inner += `<div class="meta">${escapeHtml(loc.details)}</div>`;
    }
    inner += `<ul class="schedule-list">`;
    for (const av of items) {
      const prov = (av.provisions ?? []).join(', ');
      const line = escapeHtml(formatSchedule(av));
      const extra = prov ? ` · ${escapeHtml(prov)}` : '';
      inner += `<li>${line}${extra}</li>`;
    }
    inner += `</ul></div>`;
  }
  return inner;
}

function renderReceiverCard(r) {
  const ravs = receiverAvailabilities(r);
  const groups = groupAvailabilitiesByLocation(ravs);
  const flags = r.flags?.length ? ` · ${r.flags.join(', ')}` : '';
  let inner = `<strong>${escapeHtml(r.name)}${escapeHtml(flags)}</strong>`;
  for (const g of groups) {
    const loc = g.location;
    const items = [...g.items].sort((a, b) =>
      String(a.schedule?.start ?? '').localeCompare(String(b.schedule?.start ?? '')),
    );
    inner += `<div class="location-block">`;
    inner += `<div class="meta loc-title">${escapeHtml(loc.name ?? '—')} · ${escapeHtml(coordStr(loc))}</div>`;
    if (loc.details) {
      inner += `<div class="meta">${escapeHtml(loc.details)}</div>`;
    }
    inner += `<ul class="schedule-list limit-h">`;
    for (const av of items) {
      inner += `<li>${escapeHtml(formatSchedule(av))}</li>`;
    }
    inner += `</ul></div>`;
  }
  return inner;
}

/** @param {HTMLElement & { state: object }} store */
function render(store) {
  const providerList = document.querySelector('#provider-list');
  const receiverList = document.querySelector('#receiver-list');
  const matchList = document.querySelector('#match-list');
  const matchesEmpty = document.querySelector('#matches-empty');

  const agents = store.state.agents ?? [];
  const providers = agents.filter((a) =>
    a.availabilities.some((av) => av.role === 'provider'),
  );
  const receivers = agents.filter((a) =>
    a.availabilities.some((av) => av.role === 'receiver'),
  );

  providerList.replaceChildren(
    ...providers.map((p) => {
      const li = document.createElement('li');
      li.className = 'card';
      li.innerHTML = renderProviderCard(p);
      return li;
    }),
  );

  receiverList.replaceChildren(
    ...receivers.map((r) => {
      const li = document.createElement('li');
      li.className = 'card';
      li.innerHTML = renderReceiverCard(r);
      return li;
    }),
  );

  const matches = store.state.matches;
  matchesEmpty.classList.toggle('hidden', matches.length > 0);
  matchList.replaceChildren(
    ...matches.map((m) => {
      const li = document.createElement('li');
      li.className = 'card match';
      const pName = agentNameById(store, m.providerAgentId);
      const rName = agentNameById(store, m.receiverAgentId);
      const idx = m.receiverAvailabilityIndex ?? m.presenceIndex;
      const recv = agents.find((a) => a['@id'] === m.receiverAgentId);
      const rav = recv?.availabilities?.[idx];
      const locName = rav?.location?.name;
      const locPart = locName
        ? `${escapeHtml(locName)} → `
        : `Availability #${idx + 1} → `;
      li.innerHTML = `
        <strong>${escapeHtml(rName)}</strong>
        <div class="meta">${locPart}<strong>${escapeHtml(pName)}</strong></div>
        <div class="meta">${m.distanceKm} km apart (≤ ${store.state.maxMatchKm} km)</div>
      `;
      return li;
    }),
  );
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function main() {
  const store = document.querySelector('#store');
  if (!store || !('seedDemoData' in store)) {
    console.error('comidas-matching-store missing; run: deno task bundle');
    return;
  }

  store.seedDemoData();

  const radius = document.querySelector('#radius');
  const radiusValue = document.querySelector('#radius-value');
  const reloadBtn = document.querySelector('#reload-demo');

  radius.addEventListener('input', () => {
    radiusValue.textContent = radius.value;
  });

  radius.addEventListener('change', () => {
    store.setMaxMatchKm(Number(radius.value));
    render(store);
  });

  reloadBtn.addEventListener('click', () => {
    store.seedDemoData();
    store.setMaxMatchKm(Number(radius.value));
    render(store);
  });

  store.addEventListener('change', () => render(store));
  render(store);
}

main();
