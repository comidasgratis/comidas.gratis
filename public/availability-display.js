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
