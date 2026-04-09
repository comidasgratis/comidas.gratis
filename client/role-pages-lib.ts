import {
  agentChurch,
  agentFamily,
  FAKE_AGENTS,
  agentsWithProviderRole,
  distanceKm,
} from '../data/index.js';
import type { Agent } from '../data/index.js';

export type { Agent };
export { FAKE_AGENTS, agentsWithProviderRole, distanceKm };

export function defaultProviderAgent(): Agent {
  return structuredClone(agentChurch);
}

export function defaultReceiverAgent(): Agent {
  return structuredClone(agentFamily);
}
