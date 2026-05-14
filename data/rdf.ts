import {
  TermWrapper,
  DatasetWrapper,
  LiteralAs,
  LiteralFrom,
  TermAs,
  TermFrom,
} from "@rdfjs/wrapper";
import type { DatasetCore, DataFactory } from "@rdfjs/types";
import { Agent as SolidAgent } from "@solid/object";
import { FOAF, ICAL, RDF, WGS84, COMIDAS } from "../vocabulary.js";
import type {
  Agent,
  Availability,
  Location,
  Schedule,
} from "./model.js";

// ---------------------------------------------------------------------------
// Wrapper classes
// ---------------------------------------------------------------------------

export class ScheduleRdf extends TermWrapper {
  get start(): string {
    return this.singular(ICAL.dtstart, LiteralAs.string);
  }
  set start(value: string) {
    this.overwrite(ICAL.dtstart, value, LiteralFrom.string);
  }

  get end(): string | undefined {
    return this.singularNullable(ICAL.dtend, LiteralAs.string);
  }
  set end(value: string | undefined) {
    this.overwriteNullable(ICAL.dtend, value, LiteralFrom.string);
  }
}

export class LocationRdf extends TermWrapper {
  get name(): string {
    return this.singular(FOAF.name, LiteralAs.string);
  }
  set name(value: string) {
    this.overwrite(FOAF.name, value, LiteralFrom.string);
  }

  get lat(): number {
    return this.singular(WGS84.lat, LiteralAs.number);
  }
  set lat(value: number) {
    this.overwrite(WGS84.lat, value, LiteralFrom.double);
  }

  get lng(): number {
    return this.singular(WGS84.long, LiteralAs.number);
  }
  set lng(value: number) {
    this.overwrite(WGS84.long, value, LiteralFrom.double);
  }

  get details(): string {
    return this.singular(COMIDAS.details, LiteralAs.string);
  }
  set details(value: string) {
    this.overwrite(COMIDAS.details, value, LiteralFrom.string);
  }
}

export class AvailabilityRdf extends TermWrapper {
  get schedule(): ScheduleRdf {
    return this.singular(COMIDAS.schedule, TermAs.instance(ScheduleRdf));
  }
  set schedule(value: ScheduleRdf) {
    this.overwrite(COMIDAS.schedule, value, TermFrom.instance);
  }

  get location(): LocationRdf {
    return this.singular(ICAL.location, TermAs.instance(LocationRdf));
  }
  set location(value: LocationRdf) {
    this.overwrite(ICAL.location, value, TermFrom.instance);
  }

  get provisions(): Set<string> {
    return this.objects(COMIDAS.provision, LiteralAs.string, LiteralFrom.string);
  }

  get role(): string {
    return this.singular(COMIDAS.role, LiteralAs.string);
  }
  set role(value: "provider" | "receiver") {
    this.overwrite(COMIDAS.role, value, LiteralFrom.string);
  }

  get details(): string | undefined {
    return this.singularNullable(ICAL.summary, LiteralAs.string);
  }
  set details(value: string | undefined) {
    this.overwriteNullable(ICAL.summary, value, LiteralFrom.string);
  }
}

export class ComidasAgent extends SolidAgent {
  get id(): string {
    return this.value;
  }

  override get name(): string | null {
    return super.name;
  }
  set name(value: string) {
    this.overwrite(FOAF.name, value, LiteralFrom.string);
  }

  get locations(): Set<LocationRdf> {
    return this.objects(
      COMIDAS.hasLocation,
      TermAs.instance(LocationRdf),
      TermFrom.instance,
    );
  }

  get availabilities(): Set<AvailabilityRdf> {
    return this.objects(
      COMIDAS.availability,
      TermAs.instance(AvailabilityRdf),
      TermFrom.instance,
    );
  }

  get flags(): Set<string> {
    return this.objects(COMIDAS.flag, LiteralAs.string, LiteralFrom.string);
  }
}

export class ComidasDataset extends DatasetWrapper {
  allAgents(): Iterable<ComidasAgent> {
    return this.instancesOf(COMIDAS.Agent, ComidasAgent);
  }
}

// ---------------------------------------------------------------------------
// Plain model → RDF
// ---------------------------------------------------------------------------

export function scheduleToRdf(
  schedule: Schedule,
  dataset: DatasetCore,
  factory: DataFactory,
): ScheduleRdf {
  const node = new ScheduleRdf(factory.blankNode(), dataset, factory);
  node.start = schedule.start;
  if (schedule.end !== undefined) node.end = schedule.end;
  return node;
}

export function locationToRdf(
  location: Location,
  dataset: DatasetCore,
  factory: DataFactory,
): LocationRdf {
  const node = new LocationRdf(factory.blankNode(), dataset, factory);
  node.name = location.name;
  node.lat = location.coordinates.lat;
  node.lng = location.coordinates.lng;
  node.details = location.details;
  return node;
}

export function availabilityToRdf(
  av: Availability,
  dataset: DatasetCore,
  factory: DataFactory,
): AvailabilityRdf {
  const node = new AvailabilityRdf(factory.blankNode(), dataset, factory);
  node.schedule = scheduleToRdf(av.schedule, dataset, factory);
  node.location = locationToRdf(av.location, dataset, factory);
  node.role = av.role;
  if (av.details !== undefined) node.details = av.details;
  for (const p of av.provisions) node.provisions.add(p);
  return node;
}

export function agentToRdf(
  agent: Agent,
  dataset: DatasetCore,
  factory: DataFactory,
): ComidasAgent {
  const node = new ComidasAgent(agent["@id"], dataset, factory);

  dataset.add(
    factory.quad(
      factory.namedNode(agent["@id"]),
      factory.namedNode(RDF.type),
      factory.namedNode(COMIDAS.Agent),
    ),
  );

  node.name = agent.name;

  for (const loc of agent.locations) {
    node.locations.add(locationToRdf(loc, dataset, factory));
  }
  for (const av of agent.availabilities) {
    node.availabilities.add(availabilityToRdf(av, dataset, factory));
  }
  if (agent.flags) {
    for (const flag of agent.flags) node.flags.add(flag);
  }

  return node;
}

// ---------------------------------------------------------------------------
// RDF → plain model
// ---------------------------------------------------------------------------

export function scheduleFromRdf(node: ScheduleRdf): Schedule {
  const s: Schedule = { start: node.start };
  if (node.end !== undefined) s.end = node.end;
  return s;
}

export function locationFromRdf(node: LocationRdf): Location {
  return {
    name: node.name,
    coordinates: { lat: node.lat, lng: node.lng },
    details: node.details,
  };
}

export function availabilityFromRdf(node: AvailabilityRdf): Availability {
  const av: Availability = {
    schedule: scheduleFromRdf(node.schedule),
    location: locationFromRdf(node.location),
    provisions: [...node.provisions],
    role: node.role as "provider" | "receiver",
  };
  if (node.details !== undefined) av.details = node.details;
  return av;
}

export function agentFromRdf(node: ComidasAgent): Agent {
  const agent: Agent = {
    "@id": node.id,
    name: node.name!,
    locations: [...node.locations].map(locationFromRdf),
    availabilities: [...node.availabilities].map(availabilityFromRdf),
  };
  const flags = [...node.flags];
  if (flags.length > 0) agent.flags = flags;
  return agent;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createComidasDataset(
  agents: Agent[],
  dataset: DatasetCore,
  factory: DataFactory,
): ComidasDataset {
  const ds = new ComidasDataset(dataset, factory);
  for (const agent of agents) agentToRdf(agent, dataset, factory);
  return ds;
}
