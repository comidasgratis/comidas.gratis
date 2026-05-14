/**
 * Vanilla UI: wires the ComidasMatchingStore web component to the calendar view.
 * Depends on /register-store.js (bundled from client/register-store.ts).
 */
import './register-store.js';
import { createCalendar } from './calendar.js';
import { parseScheduleDate } from './availability-display.js';
import {
  initSession,
  solidLogin,
  solidLogout,
} from './solid-pod.js';

function agentNameById(store, id) {
  const a = store.state.agents.find((x) => x['@id'] === id);
  return a ? a.name : id;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDateRange(start, end) {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const s = `${months[start.getMonth()]} ${start.getDate()}`;
  const e = `${months[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`;
  if (start.getMonth() === end.getMonth() && start.getDate() === end.getDate()) {
    return `${s}, ${start.getFullYear()}`;
  }
  return `${s}–${e}`;
}

function renderFilteredMatches(store, rangeStart, rangeEnd) {
  const matchList = document.querySelector('#match-list');
  const matchesEmpty = document.querySelector('#matches-empty');
  const matchesRange = document.querySelector('#matches-range');
  const agents = store.state.agents ?? [];
  const matches = store.state.matches ?? [];

  matchesRange.textContent = formatDateRange(rangeStart, rangeEnd);

  const filtered = matches.filter((m) => {
    const recv = agents.find((a) => a['@id'] === m.receiverAgentId);
    if (!recv) return false;
    const av = recv.availabilities?.[m.receiverAvailabilityIndex];
    if (!av) return false;
    const start = parseScheduleDate(av.schedule?.start);
    if (!start) return false;
    let end = parseScheduleDate(av.schedule?.end);
    if (!end) {
      end = new Date(start);
      end.setHours(end.getHours() + 1);
    }
    return start < rangeEnd && end > rangeStart;
  });

  matchesEmpty.classList.toggle('hidden', filtered.length > 0);
  matchList.replaceChildren(
    ...filtered.map((m) => {
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
  wireLoginUI();
  const session = await initSession();
  updateLoginUI(session);

  const store = document.querySelector('#store');
  if (!store || !('seedDemoData' in store)) {
    console.error('comidas-matching-store missing; run: deno task bundle');
    return;
  }

  const calendar = createCalendar(document.querySelector('#calendar-root'), {
    onRangeChange(start, end) {
      renderFilteredMatches(store, start, end);
    },
  });

  function render() {
    calendar.setEvents(store.state.agents ?? []);
    const { start, end } = calendar.getRange();
    renderFilteredMatches(store, start, end);
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
    render();
  });

  reloadBtn.addEventListener('click', () => {
    store.seedDemoData();
    store.setMaxMatchKm(Number(radius.value));
    render();
  });

  store.addEventListener('change', () => render());
  render();
}

main();
