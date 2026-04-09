/** Decimal degrees for geospatial matching (WGS84). */
export type GeoPoint = { lat: number; lng: number };

export type Schedule = { start: string; end?: string };

export type Provision = string;

export type Location = {
  name: string;
  coordinates: GeoPoint;
  details: string;
};

/** When and where an agent offers or receives food, with provisions for provider role. */
export type Availability = {
  schedule: Schedule;
  location: Location;
  provisions: Provision[];
  role: 'provider' | 'receiver';
  details?: string;
};

/** Identity plus known places and all scheduled availability windows. */
export type Agent = {
  '@id': string;
  name: string;
  locations: Location[];
  availabilities: Availability[];
  flags?: string[];
};

export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function agentHasProviderRole(agent: Agent): boolean {
  return agent.availabilities.some((av) => av.role === 'provider');
}

export function agentHasReceiverRole(agent: Agent): boolean {
  return agent.availabilities.some((av) => av.role === 'receiver');
}

export function agentsWithProviderRole(agents: Agent[]): Agent[] {
  return agents.filter(agentHasProviderRole);
}

export function agentsWithReceiverRole(agents: Agent[]): Agent[] {
  return agents.filter(agentHasReceiverRole);
}
