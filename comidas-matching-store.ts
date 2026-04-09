import { CPXStore } from '@chapeaux/cpx-store';
import {
  distanceKm,
  type Agent,
  FAKE_AGENTS,
  agentsWithProviderRole,
} from './data/index.js';

export type ProviderReceiverMatch = {
  providerAgentId: string;
  receiverAgentId: string;
  receiverAvailabilityIndex: number;
  distanceKm: number;
};

export type ComidasMatchingState = {
  agents: Agent[];
  matches: ProviderReceiverMatch[];
  maxMatchKm: number;
};

function computeMatches(agents: Agent[], maxKm: number): ProviderReceiverMatch[] {
  const providerSide = agentsWithProviderRole(agents);
  const out: ProviderReceiverMatch[] = [];

  for (const recvAgent of agents) {
    recvAgent.availabilities.forEach((av, availabilityIndex) => {
      if (av.role !== 'receiver') return;
      const rc = av.location.coordinates;
      let best: ProviderReceiverMatch | null = null;
      for (const provAgent of providerSide) {
        for (const pav of provAgent.availabilities) {
          if (pav.role !== 'provider') continue;
          const pc = pav.location.coordinates;
          const d = distanceKm(rc, pc);
          if (d > maxKm) continue;
          if (!best || d < best.distanceKm) {
            best = {
              providerAgentId: provAgent['@id'],
              receiverAgentId: recvAgent['@id'],
              receiverAvailabilityIndex: availabilityIndex,
              distanceKm: Math.round(d * 1000) / 1000,
            };
          }
        }
      }
      if (best) out.push(best);
    });
  }

  return out;
}

export class ComidasMatchingStore extends CPXStore {
  declare state: ComidasMatchingState;

  constructor() {
    super({
      agents: [],
      matches: [],
      maxMatchKm: 8,
    });
  }

  seedDemoData(): void {
    this.state.agents = [...FAKE_AGENTS];
    this.recomputeMatches();
  }

  recomputeMatches(): void {
    this.state.matches = computeMatches(this.state.agents, this.state.maxMatchKm);
  }

  setMaxMatchKm(km: number): void {
    this.state.maxMatchKm = km;
    this.recomputeMatches();
  }
}

const tag = 'comidas-matching-store';
if (!customElements.get(tag)) {
  customElements.define(tag, ComidasMatchingStore);
}
