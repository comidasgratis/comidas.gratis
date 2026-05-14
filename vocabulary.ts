export const FOAF = {
  name: "http://xmlns.com/foaf/0.1/name",
} as const;

export const ICAL = {
  dtstart: "http://www.w3.org/2002/12/cal/ical#dtstart",
  dtend: "http://www.w3.org/2002/12/cal/ical#dtend",
  location: "http://www.w3.org/2002/12/cal/ical#location",
  summary: "http://www.w3.org/2002/12/cal/ical#summary",
} as const;

export const RDF = {
  type: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
} as const;

export const WGS84 = {
  lat: "http://www.w3.org/2003/01/geo/wgs84_pos#lat",
  long: "http://www.w3.org/2003/01/geo/wgs84_pos#long",
} as const;

const NS = "https://comidas.gratis/vocab#";

export const COMIDAS = {
  details: `${NS}details`,
  hasLocation: `${NS}hasLocation`,
  availability: `${NS}availability`,
  provision: `${NS}provision`,
  role: `${NS}role`,
  flag: `${NS}flag`,
  schedule: `${NS}schedule`,

  Agent: `${NS}Agent`,
  Location: `${NS}Location`,
  Schedule: `${NS}Schedule`,
  Availability: `${NS}Availability`,
} as const;
