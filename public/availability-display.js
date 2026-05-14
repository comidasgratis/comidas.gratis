/**
 * Shared helpers: group availabilities by location for UI summaries.
 */

export function locationKey(loc) {
  if (!loc?.coordinates) return `n:${String(loc?.name ?? '')}`;
  return `${loc.name}|${loc.coordinates.lat}|${loc.coordinates.lng}`;
}

/**
 * @param {Array<{ location: object, schedule?: object, provisions?: string[], role?: string }>} availabilities
 * @returns {Array<{ location: object, items: typeof availabilities }>}
 */
export function groupAvailabilitiesByLocation(availabilities) {
  const map = new Map();
  for (const av of availabilities) {
    const k = locationKey(av.location);
    if (!map.has(k)) {
      map.set(k, { location: av.location, items: [] });
    }
    map.get(k).items.push(av);
  }
  return [...map.values()];
}

export function formatSchedule(av) {
  const s = av.schedule;
  if (!s?.start) return '—';
  return s.end ? `${s.start} – ${s.end}` : s.start;
}

/**
 * Provider availabilities at the same physical location as `refLocation` (by key).
 */
export function providerAvailabilitiesAtLocation(agent, refLocation) {
  const k = locationKey(refLocation);
  return agent.availabilities.filter(
    (av) => av.role === 'provider' && locationKey(av.location) === k,
  );
}

const scheduleRe = /^(\d{4})-(\d{2})-(\d{2})\s*T(\d{1,2}):(\d{2})(am|pm)$/i;

export function parseScheduleDate(str) {
  if (!str) return null;
  const m = scheduleRe.exec(str);
  if (!m) return null;
  let hour = parseInt(m[4], 10);
  const min = parseInt(m[5], 10);
  const ampm = m[6].toLowerCase();
  if (ampm === 'am' && hour === 12) hour = 0;
  else if (ampm === 'pm' && hour !== 12) hour += 12;
  return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10), hour, min);
}

export function dateToHours(date) {
  return date.getHours() + date.getMinutes() / 60;
}
