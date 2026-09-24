// data/model.ts
function distanceKm(a, b) {
  const toRad = (d) => d * Math.PI / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
function agentHasProviderRole(agent) {
  return agent.availabilities.some((av) => av.role === "provider");
}
function agentsWithProviderRole(agents) {
  return agents.filter(agentHasProviderRole);
}

// data/fake/locations.ts
var locChurch = {
  name: "Church Location",
  coordinates: {
    lat: 36.123972,
    lng: -78.941778
  },
  details: "3rd Thurs and 4th Tues from 930 until food is gone (Feb\u2013Jun 2026)"
};
var locPantryEastDurham = {
  name: "East Durham, NC (approx.)",
  coordinates: {
    lat: 36.0012,
    lng: -78.8845
  },
  details: "Self-serve fridge; restocked weekday lunch"
};
var locMobileStop = {
  name: "Northeast Central Durham stop",
  coordinates: {
    lat: 36.0089,
    lng: -78.9014
  },
  details: "Curbside pickup at marked stop"
};
var locStudentFridge = {
  name: "Near East Durham fridge",
  coordinates: {
    lat: 36.0028,
    lng: -78.8831
  },
  details: "Back door, ring \u201Csupplies\u201D"
};
var locShelterLobby = {
  name: "Mobile Meals stop \u2014 lobby entrance",
  coordinates: {
    lat: 36.0091,
    lng: -78.9019
  },
  details: "Ask for intake \u2014 evening meals only"
};
var locRaleighKitchen = {
  name: "Raleigh, NC",
  coordinates: {
    lat: 35.7796,
    lng: -78.6382
  },
  details: "Control fixture: too far from Durham receivers for short-radius demos"
};
var locSouthDayTable = {
  name: "South Durham, NC",
  coordinates: {
    lat: 36.0523,
    lng: -78.9299
  },
  details: "Morning table outside community room"
};
var locWestHills = {
  name: "Hillsborough Rd corridor (approx.)",
  coordinates: {
    lat: 36.0793,
    lng: -79.041
  },
  details: "Appointment-only afternoon pantry"
};
var locEasternHub = {
  name: "Eastern Durham / Wake line (approx.)",
  coordinates: {
    lat: 36.0115,
    lng: -78.7848
  },
  details: "Weekend hub with bilingual intake"
};
var locMidRing = {
  name: "Eastern exurbs (approx.)",
  coordinates: {
    lat: 36.095,
    lng: -78.72
  },
  details: "Member surplus on Sunday mornings"
};
var locNorthCounty = {
  name: "North of Durham (approx.)",
  coordinates: {
    lat: 36.268,
    lng: -78.9299
  },
  details: "Weekend community lunch line"
};
var locSouthwestAg = {
  name: "SW of Durham (approx.)",
  coordinates: {
    lat: 35.9012,
    lng: -79.149
  },
  details: "Farm share pickup; bring bags"
};
var locFamilyWork = {
  name: "Work Address",
  coordinates: {
    lat: 36.079278,
    lng: -78.929861
  },
  details: "Weekday work hours"
};
var locFamilyHome = {
  name: "Home Address",
  coordinates: {
    lat: 36.0578,
    lng: -78.9325
  },
  details: "Evening at home \u2014 knock three times on the pipes"
};

// data/fake/family-weekdays.ts
function daysInMonthUTC(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}
function familyWeekdayReceiverAvailabilities() {
  const out = [];
  const year = 2026;
  const endMonth = 5;
  const endDay = 31;
  for (let month = 2; month <= endMonth; month++) {
    const dim = daysInMonthUTC(year, month);
    const dayStart = 1;
    const dayEnd = month === endMonth ? Math.min(endDay, dim) : dim;
    for (let day = dayStart; day <= dayEnd; day++) {
      const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
      if (weekday === 0 || weekday === 6) continue;
      const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      out.push({
        schedule: {
          start: `${iso} T8:30am`,
          end: `${iso} T5:30pm`
        },
        location: locFamilyWork,
        provisions: [],
        role: "receiver"
      });
      out.push({
        schedule: {
          start: `${iso} T6:00pm`,
          end: `${iso} T9:00pm`
        },
        location: locFamilyHome,
        provisions: [],
        role: "receiver",
        details: locFamilyHome.details
      });
    }
  }
  return out;
}

// data/fake/agents.ts
var churchSlotStarts = [
  "2026-02-19 T9:30am",
  "2026-02-24 T9:30am",
  "2026-03-19 T9:30am",
  "2026-03-24 T9:30am",
  "2026-04-16 T9:30am",
  "2026-04-28 T9:30am",
  "2026-05-21 T9:30am",
  "2026-05-26 T9:30am",
  "2026-06-18 T9:30am",
  "2026-06-23 T9:30am"
];
function churchAvailabilities() {
  return churchSlotStarts.map((start) => ({
    schedule: {
      start,
      end: void 0
    },
    location: locChurch,
    provisions: [
      "fruit",
      "meat",
      "dairy"
    ],
    role: "provider"
  }));
}
var agentChurch = {
  "@id": "https://comidas.gratis/church/profile/card#me",
  name: "Church Provider",
  locations: [
    locChurch
  ],
  availabilities: churchAvailabilities()
};
var agentFamily = {
  "@id": "https://comidas.gratis/family/profile/card#me",
  name: "Big Family",
  locations: [
    locFamilyWork,
    locFamilyHome
  ],
  availabilities: familyWeekdayReceiverAvailabilities(),
  flags: [
    "vegan"
  ]
};
var agentPantry = {
  "@id": "https://comidas.gratis/east-durham-pantry/profile/card#me",
  name: "East Durham Community Fridge",
  locations: [
    locPantryEastDurham
  ],
  availabilities: [
    {
      schedule: {
        start: "2026-02-20 T11:00am",
        end: "2026-02-20 T6:00pm"
      },
      location: locPantryEastDurham,
      provisions: [
        "produce",
        "bread",
        "non-perishable"
      ],
      role: "provider"
    }
  ]
};
var agentMobile = {
  "@id": "https://comidas.gratis/mobile-meals/profile/card#me",
  name: "Mobile Meals Van",
  locations: [
    locMobileStop
  ],
  availabilities: [
    {
      schedule: {
        start: "2026-02-21 T4:00pm",
        end: "2026-02-21 T6:30pm"
      },
      location: locMobileStop,
      provisions: [
        "hot meal",
        "water"
      ],
      role: "provider"
    }
  ]
};
var agentStudent = {
  "@id": "https://comidas.gratis/student-co-op/profile/card#me",
  name: "Student Co-op",
  locations: [
    locStudentFridge
  ],
  availabilities: [
    {
      schedule: {
        start: "2026-02-20 T10:00am",
        end: "2026-02-20 T8:00pm"
      },
      location: locStudentFridge,
      provisions: [],
      role: "receiver"
    }
  ],
  flags: [
    "nut-free"
  ]
};
var agentShelter = {
  "@id": "https://comidas.gratis/night-shelter/profile/card#me",
  name: "Central Durham Shelter",
  locations: [
    locShelterLobby
  ],
  availabilities: [
    {
      schedule: {
        start: "2026-02-21 T3:00pm",
        end: "2026-02-21 T8:00pm"
      },
      location: locShelterLobby,
      provisions: [],
      role: "receiver"
    }
  ]
};
var agentRaleigh = {
  "@id": "https://comidas.gratis/raleigh-kitchen/profile/card#me",
  name: "Raleigh Test Kitchen",
  locations: [
    locRaleighKitchen
  ],
  availabilities: [
    {
      schedule: {
        start: "2026-02-19 T12:00pm",
        end: void 0
      },
      location: locRaleighKitchen,
      provisions: [
        "catering surplus"
      ],
      role: "provider"
    }
  ]
};
var agentSouthDayTable = {
  "@id": "https://comidas.gratis/south-durham-day-table/profile/card#me",
  name: "South Durham Day Table",
  locations: [
    locSouthDayTable
  ],
  availabilities: [
    {
      schedule: {
        start: "2026-02-18 T7:00am",
        end: "2026-02-18 T10:00am"
      },
      location: locSouthDayTable,
      provisions: [
        "breakfast",
        "coffee"
      ],
      role: "provider"
    }
  ]
};
var agentWestHills = {
  "@id": "https://comidas.gratis/west-hills-pantry/profile/card#me",
  name: "West Hills Pantry",
  locations: [
    locWestHills
  ],
  availabilities: [
    {
      schedule: {
        start: "2026-02-19 T2:00pm",
        end: "2026-02-19 T7:00pm"
      },
      location: locWestHills,
      provisions: [
        "dry goods",
        "canned goods"
      ],
      role: "provider"
    }
  ]
};
var agentEasternHub = {
  "@id": "https://comidas.gratis/eastern-outreach-hub/profile/card#me",
  name: "Eastern Outreach Hub",
  locations: [
    locEasternHub
  ],
  availabilities: [
    {
      schedule: {
        start: "2026-02-20 T9:00am",
        end: "2026-02-20 T3:00pm"
      },
      location: locEasternHub,
      provisions: [
        "produce",
        "baby food"
      ],
      role: "provider"
    }
  ]
};
var agentMidRing = {
  "@id": "https://comidas.gratis/mid-ring-coop/profile/card#me",
  name: "Mid-Ring Food Co-op",
  locations: [
    locMidRing
  ],
  availabilities: [
    {
      schedule: {
        start: "2026-02-22 T10:00am",
        end: void 0
      },
      location: locMidRing,
      provisions: [
        "vegetables",
        "eggs"
      ],
      role: "provider"
    }
  ]
};
var agentNorthCounty = {
  "@id": "https://comidas.gratis/north-county-kitchen/profile/card#me",
  name: "North County Community Kitchen",
  locations: [
    locNorthCounty
  ],
  availabilities: [
    {
      schedule: {
        start: "2026-02-21 T11:30am",
        end: "2026-02-21 T2:00pm"
      },
      location: locNorthCounty,
      provisions: [
        "hot lunch",
        "salad"
      ],
      role: "provider"
    }
  ]
};
var agentSouthwestAg = {
  "@id": "https://comidas.gratis/southwest-ag-share/profile/card#me",
  name: "Southwest Ag Share",
  locations: [
    locSouthwestAg
  ],
  availabilities: [
    {
      schedule: {
        start: "2026-02-19 T4:00pm",
        end: "2026-02-19 T8:00pm"
      },
      location: locSouthwestAg,
      provisions: [
        "produce boxes",
        "grain"
      ],
      role: "provider"
    }
  ]
};
var FAKE_AGENTS = [
  agentChurch,
  agentPantry,
  agentMobile,
  agentSouthDayTable,
  agentWestHills,
  agentEasternHub,
  agentMidRing,
  agentNorthCounty,
  agentSouthwestAg,
  agentRaleigh,
  agentFamily,
  agentStudent,
  agentShelter
];

// node_modules/.deno/@rdfjs+wrapper@0.32.0/node_modules/@rdfjs/wrapper/dist/decorators/GetterArity.js
var GetterArity;
(function(GetterArity2) {
  GetterArity2[GetterArity2["Singular"] = 0] = "Singular";
  GetterArity2[GetterArity2["SingularNullable"] = 1] = "SingularNullable";
  GetterArity2[GetterArity2["Set"] = 2] = "Set";
})(GetterArity || (GetterArity = {}));

// node_modules/.deno/@rdfjs+wrapper@0.32.0/node_modules/@rdfjs/wrapper/dist/decorators/SetterArity.js
var SetterArity;
(function(SetterArity2) {
  SetterArity2[SetterArity2["Singular"] = 0] = "Singular";
  SetterArity2[SetterArity2["SingularNullable"] = 1] = "SingularNullable";
})(SetterArity || (SetterArity = {}));

// node_modules/.deno/@rdfjs+wrapper@0.32.0/node_modules/@rdfjs/wrapper/dist/vocabulary/XSD.js
var XSD = {
  anyUri: "http://www.w3.org/2001/XMLSchema#anyUri",
  base64Binary: "http://www.w3.org/2001/XMLSchema#base64Binary",
  boolean: "http://www.w3.org/2001/XMLSchema#boolean",
  byte: "http://www.w3.org/2001/XMLSchema#byte",
  date: "http://www.w3.org/2001/XMLSchema#date",
  dateTime: "http://www.w3.org/2001/XMLSchema#dateTime",
  decimal: "http://www.w3.org/2001/XMLSchema#decimal",
  double: "http://www.w3.org/2001/XMLSchema#double",
  float: "http://www.w3.org/2001/XMLSchema#float",
  hexBinary: "http://www.w3.org/2001/XMLSchema#hexBinary",
  int: "http://www.w3.org/2001/XMLSchema#int",
  integer: "http://www.w3.org/2001/XMLSchema#integer",
  long: "http://www.w3.org/2001/XMLSchema#long",
  negativeInteger: "http://www.w3.org/2001/XMLSchema#negativeInteger",
  nonNegativeInteger: "http://www.w3.org/2001/XMLSchema#nonNegativeInteger",
  nonPositiveInteger: "http://www.w3.org/2001/XMLSchema#nonPositiveInteger",
  positiveInteger: "http://www.w3.org/2001/XMLSchema#positiveInteger",
  short: "http://www.w3.org/2001/XMLSchema#short",
  string: "http://www.w3.org/2001/XMLSchema#string",
  unsignedByte: "http://www.w3.org/2001/XMLSchema#unsignedByte",
  unsignedInt: "http://www.w3.org/2001/XMLSchema#unsignedInt",
  unsignedLong: "http://www.w3.org/2001/XMLSchema#unsignedLong",
  unsignedShort: "http://www.w3.org/2001/XMLSchema#unsignedShort"
};

// node_modules/.deno/@rdfjs+wrapper@0.32.0/node_modules/@rdfjs/wrapper/dist/mapping/LiteralFrom.js
var LiteralFrom;
(function(LiteralFrom3) {
  function anyUriString(value, factory) {
    return factory.literal(value, factory.namedNode(XSD.anyUri));
  }
  LiteralFrom3.anyUriString = anyUriString;
  function anyUriUrl(value, factory) {
    return anyUriString(value.toString(), factory);
  }
  LiteralFrom3.anyUriUrl = anyUriUrl;
  function base64(value, factory) {
    return factory.literal(value.toBase64(), factory.namedNode(XSD.base64Binary));
  }
  LiteralFrom3.base64 = base64;
  function boolean(value, factory) {
    return factory.literal(value.toString(), factory.namedNode(XSD.boolean));
  }
  LiteralFrom3.boolean = boolean;
  function date(value, factory) {
    return factory.literal(value.toISOString(), factory.namedNode(XSD.date));
  }
  LiteralFrom3.date = date;
  function dateTime(value, factory) {
    return factory.literal(value.toISOString(), factory.namedNode(XSD.dateTime));
  }
  LiteralFrom3.dateTime = dateTime;
  function double(value, factory) {
    return factory.literal(value.toString(), factory.namedNode(XSD.double));
  }
  LiteralFrom3.double = double;
  function hex(value, factory) {
    return factory.literal(value.toHex(), factory.namedNode(XSD.hexBinary));
  }
  LiteralFrom3.hex = hex;
  function langString(value, factory) {
    return factory.literal(value.string, {
      language: value.lang
    });
  }
  LiteralFrom3.langString = langString;
  function string(value, factory) {
    return factory.literal(value);
  }
  LiteralFrom3.string = string;
})(LiteralFrom || (LiteralFrom = {}));

// node_modules/.deno/@rdfjs+wrapper@0.32.0/node_modules/@rdfjs/wrapper/dist/WrappingSet.js
var WrappingSet = class {
  subject;
  predicate;
  termAs;
  termFrom;
  // TODO: Direction
  constructor(subject, predicate, termAs, termFrom) {
    this.subject = subject;
    this.predicate = predicate;
    this.termAs = termAs;
    this.termFrom = termFrom;
  }
  add(value) {
    this.subject.dataset.add(this.quad(value));
    return this;
  }
  clear() {
    for (const q of this.matches) {
      this.subject.dataset.delete(q);
    }
  }
  delete(value) {
    if (!this.has(value)) {
      return false;
    }
    const o = this.termFrom(value, this.subject.factory);
    const p = this.subject.factory.namedNode(this.predicate);
    for (const q of this.subject.dataset.match(this.subject, p, o)) {
      this.subject.dataset.delete(q);
    }
    return true;
  }
  forEach(cb, thisArg) {
    for (const item of this) {
      cb.call(thisArg, item, item, this);
    }
  }
  has(value) {
    return this.subject.dataset.has(this.quad(value));
  }
  get size() {
    return this.matches.size;
  }
  [Symbol.iterator]() {
    return this.values();
  }
  *entries() {
    for (const v of this) {
      yield [
        v,
        v
      ];
    }
  }
  keys() {
    return this.values();
  }
  *values() {
    for (const q of this.matches) {
      yield this.termAs(new TermWrapper(q.object, this.subject.dataset, this.subject.factory));
    }
  }
  get [Symbol.toStringTag]() {
    return this.constructor.name;
  }
  quad(value) {
    const s = this.subject;
    const p = this.subject.factory.namedNode(this.predicate);
    const o = this.termFrom(value, this.subject.factory);
    const q = this.subject.factory.quad(s, p, o);
    return q;
  }
  get matches() {
    const p = this.subject.factory.namedNode(this.predicate);
    return this.subject.dataset.match(this.subject, p);
  }
};

// node_modules/.deno/@rdfjs+wrapper@0.32.0/node_modules/@rdfjs/wrapper/dist/WrappingMap.js
var WrappingMap = class {
  subject;
  predicate;
  termAs;
  termFrom;
  constructor(subject, predicate, termAs, termFrom) {
    this.subject = subject;
    this.predicate = predicate;
    this.termAs = termAs;
    this.termFrom = termFrom;
  }
  clear() {
    for (const q of this.matches) {
      this.subject.dataset.delete(q);
    }
  }
  delete(k) {
    const p = this.subject.factory.namedNode(this.predicate);
    for (const entry of this) {
      if (entry[0] !== k) {
        continue;
      }
      this.subject.dataset.delete(this.subject.factory.quad(this.subject, p, this.termFrom(entry, this.subject.factory)));
      return true;
    }
    return false;
  }
  forEach(callback, thisArg) {
    for (const [key, value] of this) {
      callback.call(thisArg, value, key, this);
    }
  }
  get(k) {
    for (const [key, value] of this) {
      if (key !== k) {
        continue;
      }
      return value;
    }
    return void 0;
  }
  has(k) {
    return this.get(k) !== void 0;
  }
  set(k, v) {
    this.delete(k);
    this.add(k, v);
    return this;
  }
  get size() {
    return [
      ...this.matches
    ].length;
  }
  set size(_) {
    throw new Error("not supported");
  }
  *entries() {
    for (const quad of this.matches) {
      yield this.termAs(new TermWrapper(quad.object, this.subject.dataset, this.subject.factory));
    }
  }
  *keys() {
    for (const [key] of this) {
      yield key;
    }
  }
  *values() {
    for (const [, value] of this) {
      yield value;
    }
  }
  [Symbol.iterator]() {
    return this.entries();
  }
  get [Symbol.toStringTag]() {
    return this.constructor.name;
  }
  get matches() {
    const p = this.subject.factory.namedNode(this.predicate);
    return this.subject.dataset.match(this.subject, p);
  }
  add(k, v) {
    const p = this.subject.factory.namedNode(this.predicate);
    this.subject.dataset.add(this.subject.factory.quad(this.subject, p, this.termFrom([
      k,
      v
    ], this.subject.factory)));
  }
};

// node_modules/.deno/@rdfjs+wrapper@0.32.0/node_modules/@rdfjs/wrapper/dist/AnyTerm.js
var AnyTerm = class {
  original;
  constructor(original) {
    this.original = original;
  }
  get termType() {
    return this.original.termType;
  }
  get value() {
    return this.original.value;
  }
  get language() {
    return this.original.language;
  }
  get direction() {
    return this.original.direction;
  }
  get datatype() {
    return this.original.datatype;
  }
  get subject() {
    return this.original.subject;
  }
  get predicate() {
    return this.original.predicate;
  }
  get object() {
    return this.original.object;
  }
  get graph() {
    return this.original.graph;
  }
  equals(other) {
    return this.original.equals(other);
  }
};

// node_modules/.deno/@rdfjs+wrapper@0.32.0/node_modules/@rdfjs/wrapper/dist/AnyTermWithContext.js
var AnyTermWithContext = class extends AnyTerm {
  dataset;
  factory;
  constructor(term, dataset, factory) {
    super(typeof term === "string" ? factory.namedNode(term) : term);
    this.dataset = dataset;
    this.factory = factory;
  }
};

// node_modules/.deno/@rdfjs+wrapper@0.32.0/node_modules/@rdfjs/wrapper/dist/TermWrapper.js
var TermWrapper = class _TermWrapper extends AnyTermWithContext {
  get [Symbol.toStringTag]() {
    return this.constructor.name;
  }
  singular(p, termAs) {
    const predicate = this.factory.namedNode(p);
    const matches = this.dataset.match(this, predicate)[Symbol.iterator]();
    const { value: first, done: none } = matches.next();
    if (none) {
      throw new Error(`No value found for predicate ${p} on term ${this.value}`);
    }
    if (!matches.next().done) {
      throw new Error(`More than one value for predicate ${p} on term ${this.value}`);
    }
    return termAs(new _TermWrapper(first.object, this.dataset, this.factory));
  }
  singularNullable(p, termAs) {
    const predicate = this.factory.namedNode(p);
    for (const q of this.dataset.match(this, predicate)) {
      return termAs(new _TermWrapper(q.object, this.dataset, this.factory));
    }
    return;
  }
  overwrite(p, value, termFrom) {
    if (value === void 0) {
      throw new Error("value cannot be undefined");
    }
    this.overwriteNullable(p, value, termFrom);
  }
  overwriteNullable(p, value, termFrom) {
    const predicate = this.factory.namedNode(p);
    for (const q2 of this.dataset.match(this, predicate)) {
      this.dataset.delete(q2);
    }
    if (value === void 0) {
      return;
    }
    if (!_TermWrapper.isQuadSubject(this)) {
      return;
    }
    const o = termFrom(value, this.factory);
    if (o === void 0) {
      return;
    }
    if (!_TermWrapper.isQuadObject(o)) {
      return;
    }
    const q = this.factory.quad(this, predicate, o);
    this.dataset.add(q);
  }
  objects(p, termAs, termFrom) {
    return new WrappingSet(this, p, termAs, termFrom);
  }
  map(p, termAs, termFrom) {
    return new WrappingMap(this, p, termAs, termFrom);
  }
  static isQuadSubject(term) {
    return [
      "NamedNode",
      "BlankNode",
      "Quad",
      "Variable"
    ].includes(term.termType);
  }
  static isQuadObject(term) {
    return [
      "NamedNode",
      "Literal",
      "BlankNode",
      "Quad",
      "Variable"
    ].includes(term.termType);
  }
};

// node_modules/.deno/@rdfjs+wrapper@0.32.0/node_modules/@rdfjs/wrapper/dist/IndexerInterceptor.js
var IndexerInterceptor = class {
  get(target, property, receiver) {
    if (notNumeric(property)) {
      return Reflect.get(target, property, receiver);
    }
    return target.at(Number.parseInt(property));
  }
  set(target, property, value, receiver) {
    if (notNumeric(property)) {
      return Reflect.set(target, property, value, receiver);
    }
    const i = Number.parseInt(property);
    target.fill(value, i, i + 1);
    return true;
  }
  deleteProperty(target, property) {
    if (notNumeric(property)) {
      return Reflect.deleteProperty(target, property);
    }
    return false;
  }
};
function notNumeric(property) {
  return typeof property === "symbol" || isNaN(parseInt(property));
}

// node_modules/.deno/@rdfjs+wrapper@0.32.0/node_modules/@rdfjs/wrapper/dist/vocabulary/RDF.js
var RDF = {
  langString: "http://www.w3.org/1999/02/22-rdf-syntax-ns#langString",
  type: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
  first: "http://www.w3.org/1999/02/22-rdf-syntax-ns#first",
  rest: "http://www.w3.org/1999/02/22-rdf-syntax-ns#rest",
  nil: "http://www.w3.org/1999/02/22-rdf-syntax-ns#nil"
};

// node_modules/.deno/@rdfjs+wrapper@0.32.0/node_modules/@rdfjs/wrapper/dist/mapping/TermFrom.js
var TermFrom;
(function(TermFrom3) {
  function instance(value, factory) {
    return itself(value, factory);
  }
  TermFrom3.instance = instance;
  function itself(value, __) {
    return value;
  }
  TermFrom3.itself = itself;
})(TermFrom || (TermFrom = {}));

// node_modules/.deno/@rdfjs+wrapper@0.32.0/node_modules/@rdfjs/wrapper/dist/ListItem.js
var ListItem = class _ListItem extends TermWrapper {
  termAs;
  termFrom;
  constructor(term, dataset, factory, termAs, termFrom) {
    super(term, dataset, factory);
    this.termAs = termAs;
    this.termFrom = termFrom;
  }
  get firstRaw() {
    return this.singularNullable(RDF.first, TermAs.term);
  }
  set firstRaw(value) {
    this.overwriteNullable(RDF.first, value, TermFrom.itself);
  }
  get restRaw() {
    return this.singularNullable(RDF.rest, TermAs.term);
  }
  set restRaw(value) {
    this.overwriteNullable(RDF.rest, value, TermFrom.itself);
  }
  get isListItem() {
    return this.firstRaw !== void 0 && this.restRaw !== void 0;
  }
  get isNil() {
    return this.equals(this.factory.namedNode(RDF.nil));
  }
  get first() {
    return this.singular(RDF.first, this.termAs);
  }
  set first(value) {
    this.overwrite(RDF.first, value, this.termFrom);
  }
  get rest() {
    return this.singular(RDF.rest, (w) => new _ListItem(w, w.dataset, w.factory, this.termAs, this.termFrom));
  }
  set rest(value) {
    this.overwrite(RDF.rest, value, TermFrom.instance);
  }
  pop() {
    try {
      return this.first;
    } finally {
      this.firstRaw = void 0;
      this.restRaw = this.factory.namedNode(RDF.nil);
    }
  }
  *items() {
    if (this.firstRaw === void 0) {
      return;
    }
    yield this;
    for (const more of this.rest.items()) {
      yield more;
    }
  }
};

// node_modules/.deno/@rdfjs+wrapper@0.32.0/node_modules/@rdfjs/wrapper/dist/Overwriter.js
var Overwriter = class extends TermWrapper {
  p;
  constructor(subject, p) {
    super(subject, subject.dataset, subject.factory);
    this.p = p;
  }
  set listNode(object) {
    this.overwrite(this.p, object, TermFrom.instance);
  }
};

// node_modules/.deno/@rdfjs+wrapper@0.32.0/node_modules/@rdfjs/wrapper/dist/RdfList.js
var RdfList = class {
  subject;
  predicate;
  termAs;
  termFrom;
  root;
  constructor(root, subject, predicate, termAs, termFrom) {
    this.subject = subject;
    this.predicate = predicate;
    this.termAs = termAs;
    this.termFrom = termFrom;
    this.root = new ListItem(root, this.subject.dataset, this.subject.factory, termAs, termFrom);
    return new Proxy(this, new IndexerInterceptor());
  }
  get [Symbol.unscopables]() {
    return Array.prototype[Symbol.unscopables];
  }
  get length() {
    return [
      ...this.items
    ].length;
  }
  set length(_) {
    throw new Error("this array is based on an RDF Collection. Its length cannot be modified like this.");
  }
  [Symbol.iterator]() {
    return this.values();
  }
  at(index) {
    return [
      ...this.items
    ].at(index)?.first;
  }
  concat(...items) {
    return [
      ...this
    ].concat(...items);
  }
  copyWithin(target, start, end) {
    throw new Error("not implemented");
  }
  entries() {
    return [
      ...this
    ].entries();
  }
  every(predicate, thisArg) {
    return [
      ...this
    ].every(predicate, thisArg);
  }
  fill(value, start, end) {
    throw new Error("not implemented");
  }
  filter(predicate, thisArg) {
    return [
      ...this
    ].filter(predicate, thisArg);
  }
  find(predicate, thisArg) {
    return [
      ...this
    ].find(predicate, thisArg);
  }
  findIndex(predicate, thisArg) {
    return [
      ...this
    ].findIndex(predicate, thisArg);
  }
  flat(depth) {
    throw new Error("not implemented");
  }
  flatMap(callback, thisArg) {
    return [
      ...this
    ].flatMap(callback, thisArg);
  }
  forEach(callback, thisArg) {
    [
      ...this
    ].forEach(callback, thisArg);
  }
  includes(searchElement, fromIndex) {
    return [
      ...this
    ].includes(searchElement, fromIndex);
  }
  indexOf(searchElement, fromIndex) {
    return [
      ...this
    ].indexOf(searchElement, fromIndex);
  }
  join(separator) {
    return [
      ...this
    ].join(separator);
  }
  keys() {
    return [
      ...this.items
    ].keys();
  }
  lastIndexOf(searchElement, fromIndex) {
    return [
      ...this
    ].lastIndexOf(searchElement, fromIndex);
  }
  map(callback, thisArg) {
    return [
      ...this
    ].map(callback, thisArg);
  }
  pop() {
    return [
      ...this.items
    ].at(-1)?.pop();
  }
  push(...items) {
    const nil = this.subject.factory.namedNode(RDF.nil);
    for (const item of items) {
      const newNode = new ListItem(this.subject.factory.blankNode(), this.subject.dataset, this.subject.factory, this.termAs, this.termFrom);
      const lastNode = this.root.isNil ? (
        // The statement representing an empty list is replaced by a new one whose object is the new node
        // The representation of the first item (root, currently rdf:nil, the empty list) is overwritten by the new node
        this.root = new Overwriter(this.subject, this.predicate).listNode = newNode
      ) : (
        // replace rest of current last with new and return is because it's the new last
        [
          ...this.items
        ].at(-1).rest = newNode
      );
      lastNode.first = item;
      lastNode.restRaw = nil;
    }
    return this.length;
  }
  reduce(callback, initialValue) {
    return [
      ...this
    ].reduce(callback, initialValue);
  }
  reduceRight(callback, initialValue) {
    return [
      ...this
    ].reduceRight(callback, initialValue);
  }
  reverse() {
    throw new Error("not implemented");
  }
  shift() {
    if (this.root.isNil) {
      return void 0;
    }
    const value = this.root.first;
    if (this.root.rest.isNil) {
      new Overwriter(this.subject, this.predicate).listNode = this.root.rest;
      this.root.firstRaw = void 0;
      this.root.restRaw = void 0;
    } else {
      this.root.firstRaw = this.root.rest.firstRaw;
      this.root.restRaw = this.root.rest.restRaw;
    }
    return value;
  }
  slice(start, end) {
    return [
      ...this
    ].slice(start, end);
  }
  some(predicate, thisArg) {
    return [
      ...this
    ].some(predicate, thisArg);
  }
  sort(compareFn) {
    throw new Error("not implemented");
  }
  splice(start, deleteCount, ...items) {
    throw new Error("not implemented");
  }
  unshift(...items) {
    for (const item of items.reverse()) {
      const firstNode = this.root;
      this.root = new Overwriter(this.subject, this.predicate).listNode = new ListItem(this.subject.factory.blankNode(), this.subject.dataset, this.subject.factory, this.termAs, this.termFrom);
      this.root.first = item;
      this.root.rest = firstNode;
    }
    return this.length;
  }
  *values() {
    for (const item of this.items) {
      yield item.first;
    }
  }
  get [Symbol.toStringTag]() {
    return this.constructor.name;
  }
  get items() {
    return this.root.items();
  }
};

// node_modules/.deno/@rdfjs+wrapper@0.32.0/node_modules/@rdfjs/wrapper/dist/mapping/TermAs.js
var TermAs;
(function(TermAs3) {
  function instance(constructor) {
    return (term2) => {
      ensurePresent(term2);
      ensureType(term2);
      return new constructor(term2, term2.dataset, term2.factory);
    };
  }
  TermAs3.instance = instance;
  function is(term2) {
    return term2;
  }
  TermAs3.is = is;
  function list(subject, predicate, termAs, termFrom) {
    return (term2) => {
      ensurePresent(term2);
      ensureType(term2);
      return new RdfList(term2, subject, predicate, termAs, termFrom);
    };
  }
  TermAs3.list = list;
  function term(term2) {
    return term2;
  }
  TermAs3.term = term;
})(TermAs || (TermAs = {}));
function ensurePresent(term) {
  if (term === void 0 || term === null) {
    throw new ReferenceError("Term cannot be null or undefined");
  }
}
function ensureType(term) {
  if (!(term instanceof TermWrapper)) {
    throw new TypeError("Term must be a TermWrapper");
  }
}

// node_modules/.deno/@rdfjs+wrapper@0.32.0/node_modules/@rdfjs/wrapper/dist/errors/WrapperError.js
var WrapperError = class extends Error {
  constructor(message, cause) {
    super(message);
    this.name = this.constructor.name;
    this.cause = cause;
  }
};

// node_modules/.deno/@rdfjs+wrapper@0.32.0/node_modules/@rdfjs/wrapper/dist/errors/TermError.js
var TermError = class extends WrapperError {
  term;
  constructor(term, message, cause) {
    super(message, cause);
    this.term = term;
  }
};

// node_modules/.deno/@rdfjs+wrapper@0.32.0/node_modules/@rdfjs/wrapper/dist/errors/TermTypeError.js
var TermTypeError = class extends TermError {
  termType;
  constructor(term, termType, cause) {
    super(term, `Term must have type '${termType}'`, cause);
    this.termType = termType;
  }
};

// node_modules/.deno/@rdfjs+wrapper@0.32.0/node_modules/@rdfjs/wrapper/dist/errors/LiteralDatatypeError.js
var LiteralDatatypeError = class extends TermError {
  datatypes;
  constructor(term, datatypes, cause) {
    super(term, `Literal datatype must be one of ${[
      ...datatypes
    ].map((d) => `<${d}>`).join(", ")}`, cause);
    this.datatypes = datatypes;
  }
};

// node_modules/.deno/@rdfjs+wrapper@0.32.0/node_modules/@rdfjs/wrapper/dist/mapping/LiteralAs.js
var LiteralAs;
(function(LiteralAs3) {
  function bigint(term) {
    ensurePresent2(term);
    ensureType2(term);
    ensureLiteral(term);
    ensureDatatype(term, ...integerDatatypes);
    return BigInt(term.value);
  }
  LiteralAs3.bigint = bigint;
  function boolean(term) {
    ensurePresent2(term);
    ensureType2(term);
    ensureLiteral(term);
    ensureDatatype(term, XSD.boolean);
    return term.value === "true" || term.value === "1";
  }
  LiteralAs3.boolean = boolean;
  function date(term) {
    ensurePresent2(term);
    ensureType2(term);
    ensureLiteral(term);
    ensureDatatype(term, ...dateDatatypes);
    return new Date(term.value);
  }
  LiteralAs3.date = date;
  function langString(term) {
    ensurePresent2(term);
    ensureType2(term);
    ensureLiteral(term);
    return {
      lang: term.language,
      string: term.value
    };
  }
  LiteralAs3.langString = langString;
  function number(term) {
    ensurePresent2(term);
    ensureType2(term);
    ensureLiteral(term);
    ensureDatatype(term, ...numericDatatypes);
    if (term.value === "INF") {
      return Number.POSITIVE_INFINITY;
    }
    if (term.value === "-INF") {
      return Number.NEGATIVE_INFINITY;
    }
    if (term.value === "NaN") {
      return Number.NaN;
    }
    return Number(term.value);
  }
  LiteralAs3.number = number;
  function string(term) {
    ensurePresent2(term);
    ensureType2(term);
    return term.value;
  }
  LiteralAs3.string = string;
  function symbol(term) {
    ensurePresent2(term);
    ensureType2(term);
    return Symbol.for(term.value);
  }
  LiteralAs3.symbol = symbol;
  function uInt8Array(term) {
    ensurePresent2(term);
    ensureType2(term);
    ensureLiteral(term);
    ensureDatatype(term, ...byteArrayDatatypes);
    switch (term.datatype.value) {
      case XSD.hexBinary:
        return Uint8Array.from(Buffer.from(term.value, "hex"));
      default:
      case XSD.base64Binary:
        return Uint8Array.from(Buffer.from(term.value, "base64"));
    }
  }
  LiteralAs3.uInt8Array = uInt8Array;
  function url(term) {
    ensurePresent2(term);
    ensureType2(term);
    ensureLiteral(term);
    ensureDatatype(term, XSD.anyUri);
    return new URL(term.value);
  }
  LiteralAs3.url = url;
})(LiteralAs || (LiteralAs = {}));
var byteArrayDatatypes = [
  XSD.base64Binary,
  XSD.hexBinary
];
var integerDatatypes = [
  XSD.integer,
  XSD.nonPositiveInteger,
  XSD.long,
  XSD.nonNegativeInteger,
  XSD.negativeInteger,
  XSD.int,
  XSD.unsignedLong,
  XSD.positiveInteger,
  XSD.short,
  XSD.unsignedInt,
  XSD.byte,
  XSD.unsignedShort,
  XSD.unsignedByte
];
var numericDatatypes = integerDatatypes.concat([
  XSD.decimal,
  XSD.float,
  XSD.double
]);
var dateDatatypes = [
  XSD.date,
  XSD.dateTime
];
function ensurePresent2(term) {
  if (term === void 0 || term === null) {
    throw new ReferenceError("Term cannot be null or undefined");
  }
}
function ensureType2(term) {
  if (!(term instanceof TermWrapper)) {
    throw new TypeError("Term must be a TermWrapper");
  }
}
function ensureLiteral(term) {
  if (term.termType !== "Literal") {
    throw new TermTypeError(term, "Literal");
  }
}
function ensureDatatype(term, ...datatypes) {
  if (!datatypes.includes(term.datatype.value)) {
    throw new LiteralDatatypeError(term, datatypes);
  }
}

// node_modules/.deno/@rdfjs+wrapper@0.32.0/node_modules/@rdfjs/wrapper/dist/mapping/NamedNodeFrom.js
var NamedNodeFrom;
(function(NamedNodeFrom3) {
  function string(value, factory) {
    return factory.namedNode(value);
  }
  NamedNodeFrom3.string = string;
  function url(value, factory) {
    return string(value.toString(), factory);
  }
  NamedNodeFrom3.url = url;
})(NamedNodeFrom || (NamedNodeFrom = {}));

// node_modules/.deno/@rdfjs+wrapper@0.32.0/node_modules/@rdfjs/wrapper/dist/mapping/NamedNodeAs.js
var NamedNodeAs;
(function(NamedNodeAs3) {
  function string(term) {
    ensurePresent3(term);
    ensureType3(term);
    ensureNamedNode(term);
    return term.value;
  }
  NamedNodeAs3.string = string;
})(NamedNodeAs || (NamedNodeAs = {}));
function ensurePresent3(term) {
  if (term === void 0 || term === null) {
    throw new ReferenceError("Term cannot be null or undefined");
  }
}
function ensureType3(term) {
  if (!(term instanceof TermWrapper)) {
    throw new TypeError("Term must be a TermWrapper");
  }
}
function ensureNamedNode(term) {
  if (term.termType !== "NamedNode") {
    throw new TermTypeError(term, "NamedNode");
  }
}

// node_modules/.deno/@rdfjs+wrapper@0.32.0/node_modules/@rdfjs/wrapper/dist/mapping/BlankNodeFrom.js
var BlankNodeFrom;
(function(BlankNodeFrom3) {
  function string(value, factory) {
    return factory.blankNode(value);
  }
  BlankNodeFrom3.string = string;
})(BlankNodeFrom || (BlankNodeFrom = {}));

// node_modules/.deno/@rdfjs+wrapper@0.34.0/node_modules/@rdfjs/wrapper/dist/TermWrapper.js
var TermWrapper2 = class {
  original;
  _dataset;
  _factory;
  constructor(term, dataset, factory) {
    this.original = typeof term === "string" ? factory.namedNode(term) : term;
    this._dataset = dataset;
    this._factory = factory;
  }
  /**
     * The dataset that contains this term.
     *
     * This accessor provides access to the underlying RDF graph that is the containing context of a node mapped to JavaScript by instances of this class.
     *
     * @remarks
     * RDF/JS, like many other RDF frameworks, keeps terms and datasets separate. This means that terms do not hold a reference to a dataset they reside in (or were found in). This, in turn, means that a dataset must always be available, separate from the term, if either changes to the underlying data or further traversal of the underlying data is called for. In an object-oriented context however, where property chaining is idiomatic (i.e. `instance.property1.property2`), there is no way to supply the dataset when dereferencing a link in the chain.
     *
     * This property solves the problem by keeping a reference to the dataset.
     *
     * @exmaple
     * Using the dataset to modify information related to this node in the underlying data:
     * ```ts
     * class Book extends TermWrapper {
     *   set author(value: string) {
     *     const subject = this as Quad_Subject
     *     const predicate = this.factory.namedNode("http://example.com/author")
     *     const object = this.factory.literal(value)
     *     const oldAuthors = this.factory.quad(subject, predicate)
     *     const newAuthor = this.factory.quad(subject, predicate, object)
     *
     *     this.dataset.delete(oldAuthors)
     *     this.dataset.add(newAuthor)
     *   }
     * }
     * ```
     * Note: The above example operates on a low level to explain this property. Library users are more likely to interact with {@link OptionalAs}, {@link RequiredAs} and {@link LiteralFrom} for a better experience.
     *
     * @exmaple
     * Using the dataset to modify data related to this node in the underlying data:
     * ```ts
     * class Container extends TermWrapper {
     *   add(something: string) {
     *     const subject = this as Quad_Subject
     *     const predicate = this.factory.namedNode("http://example.com/contains")
     *     const object = this.factory.literal(something)
     *     const quad = this.factory.quad(subject, predicate, object)
     *
     *     this.dataset.add(quad)
     *   }
     * }
     * ```
     */
  get dataset() {
    return this._dataset;
  }
  /**
     * The data factory this instance was instantiated with. A collection of methods that can be used to create terms by this or subsequent wrappers.
     *
     * @exmaple
     * Using the factory to create a literal term from the current date and time:
     * ```ts
     * class Calendar extends TermWrapper {
     *   get currentDate(): Literal {
     *     const date = new Date().toISOString()
     *     const xsdDateTime = this.factory.namedNode("http://www.w3.org/2001/XMLSchema#dateTime")
     *
     *     return this.factory.literal(date, xsdDateTime)
     *   }
     * }
     * ```
     *
     * @exmaple
     * Using the factory to create a quad:
     * ```ts
     * class Container extends TermWrapper {
     *   add(something: string) {
     *     const subject = this as Quad_Subject
     *     const predicate = this.factory.namedNode("http://example.com/contains")
     *     const object = this.factory.literal(something)
     *     const quad = this.factory.quad(subject, predicate, object)
     *
     *     this.dataset.add(quad)
     *   }
     * }
     * ```
     */
  get factory() {
    return this._factory;
  }
  /**
     * The well-known property containing a string that represents the type of this object.
     */
  get [Symbol.toStringTag]() {
    return this.constructor.name;
  }
  //#region Implementation of RDF/JS Term
  get termType() {
    return this.original.termType;
  }
  get value() {
    return this.original.value;
  }
  equals(other) {
    return this.original.equals(other);
  }
  //#region Implementation of RDF/JS Literal
  get language() {
    return this.original.language;
  }
  get direction() {
    return this.original.direction;
  }
  get datatype() {
    return this.original.datatype;
  }
  //#endregion
  //#region Implementation of RDF/JS Quad
  get subject() {
    return this.original.subject;
  }
  get predicate() {
    return this.original.predicate;
  }
  get object() {
    return this.original.object;
  }
  get graph() {
    return this.original.graph;
  }
};

// node_modules/.deno/@rdfjs+wrapper@0.34.0/node_modules/@rdfjs/wrapper/dist/IndexerInterceptor.js
var IndexerInterceptor2 = class {
  get(target, property, receiver) {
    if (notNumeric2(property)) {
      return Reflect.get(target, property, receiver);
    }
    return target.at(Number.parseInt(property));
  }
  set(target, property, value, receiver) {
    if (notNumeric2(property)) {
      return Reflect.set(target, property, value, receiver);
    }
    const i = Number.parseInt(property);
    target.fill(value, i, i + 1);
    return true;
  }
  deleteProperty(target, property) {
    if (notNumeric2(property)) {
      return Reflect.deleteProperty(target, property);
    }
    return false;
  }
};
function notNumeric2(property) {
  return typeof property === "symbol" || isNaN(parseInt(property));
}

// node_modules/.deno/@rdfjs+wrapper@0.34.0/node_modules/@rdfjs/wrapper/dist/vocabulary/RDF.js
var RDF2 = {
  langString: "http://www.w3.org/1999/02/22-rdf-syntax-ns#langString",
  type: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
  first: "http://www.w3.org/1999/02/22-rdf-syntax-ns#first",
  rest: "http://www.w3.org/1999/02/22-rdf-syntax-ns#rest",
  nil: "http://www.w3.org/1999/02/22-rdf-syntax-ns#nil"
};

// node_modules/.deno/@rdfjs+wrapper@0.34.0/node_modules/@rdfjs/wrapper/dist/mapping/TermFrom.js
var TermFrom2;
(function(TermFrom3) {
  function instance(value, factory) {
    return itself(value, factory);
  }
  TermFrom3.instance = instance;
  function itself(value, _) {
    return value;
  }
  TermFrom3.itself = itself;
})(TermFrom2 || (TermFrom2 = {}));

// node_modules/.deno/@rdfjs+wrapper@0.34.0/node_modules/@rdfjs/wrapper/dist/mapping/RequiredFrom.js
var RequiredFrom;
(function(RequiredFrom2) {
  function subjectPredicate(anchor1, p, termAs) {
    if (termAs === void 0) {
      throw new Error();
    }
    const anchor2 = anchor1.factory.namedNode(p);
    const matches = anchor1.dataset.match(anchor1, anchor2)[Symbol.iterator]();
    const { value: first, done: none } = matches.next();
    if (none) {
      throw new Error(`No value found for predicate ${p} on term ${anchor1.value}`);
    }
    if (!matches.next().done) {
      throw new Error(`More than one value for predicate ${p} on term ${anchor1.value}`);
    }
    return termAs(new TermWrapper2(first.object, anchor1.dataset, anchor1.factory));
  }
  RequiredFrom2.subjectPredicate = subjectPredicate;
})(RequiredFrom || (RequiredFrom = {}));

// node_modules/.deno/@rdfjs+wrapper@0.34.0/node_modules/@rdfjs/wrapper/dist/mapping/OptionalFrom.js
var OptionalFrom;
(function(OptionalFrom2) {
  function subjectPredicate(anchor, p, termAs) {
    if (termAs === void 0) {
      throw new Error();
    }
    const predicate = anchor.factory.namedNode(p);
    for (const q of anchor.dataset.match(anchor, predicate)) {
      return termAs(new TermWrapper2(q.object, anchor.dataset, anchor.factory));
    }
    return void 0;
  }
  OptionalFrom2.subjectPredicate = subjectPredicate;
})(OptionalFrom || (OptionalFrom = {}));

// node_modules/.deno/@rdfjs+wrapper@0.34.0/node_modules/@rdfjs/wrapper/dist/mapping/OptionalAs.js
var OptionalAs;
(function(OptionalAs2) {
  function object(anchor, p, value, termFrom) {
    if (termFrom === void 0) {
      throw new Error();
    }
    const predicate = anchor.factory.namedNode(p);
    for (const q2 of anchor.dataset.match(anchor, predicate)) {
      anchor.dataset.delete(q2);
    }
    if (value === void 0) {
      return;
    }
    if (!isQuadSubject(anchor)) {
      return;
    }
    const o = termFrom(value, anchor.factory);
    if (o === void 0) {
      return;
    }
    if (!isQuadObject(o)) {
      return;
    }
    const q = anchor.factory.quad(anchor, predicate, o);
    anchor.dataset.add(q);
  }
  OptionalAs2.object = object;
})(OptionalAs || (OptionalAs = {}));
function isQuadSubject(term) {
  return [
    "NamedNode",
    "BlankNode",
    "Quad",
    "Variable"
  ].includes(term.termType);
}
function isQuadObject(term) {
  return [
    "NamedNode",
    "Literal",
    "BlankNode",
    "Quad",
    "Variable"
  ].includes(term.termType);
}

// node_modules/.deno/@rdfjs+wrapper@0.34.0/node_modules/@rdfjs/wrapper/dist/mapping/RequiredAs.js
var RequiredAs;
(function(RequiredAs2) {
  function object(anchor, p, value, termFrom) {
    if (value === void 0) {
      throw new Error("value cannot be undefined");
    }
    OptionalAs.object(anchor, p, value, termFrom);
  }
  RequiredAs2.object = object;
})(RequiredAs || (RequiredAs = {}));

// node_modules/.deno/@rdfjs+wrapper@0.34.0/node_modules/@rdfjs/wrapper/dist/ListItem.js
var ListItem2 = class _ListItem extends TermWrapper2 {
  termAs;
  termFrom;
  constructor(term, dataset, factory, termAs, termFrom) {
    super(term, dataset, factory);
    this.termAs = termAs;
    this.termFrom = termFrom;
  }
  get firstRaw() {
    return OptionalFrom.subjectPredicate(this, RDF2.first, TermAs2.term);
  }
  set firstRaw(value) {
    OptionalAs.object(this, RDF2.first, value, TermFrom2.itself);
  }
  get restRaw() {
    return OptionalFrom.subjectPredicate(this, RDF2.rest, TermAs2.term);
  }
  set restRaw(value) {
    OptionalAs.object(this, RDF2.rest, value, TermFrom2.itself);
  }
  get isListItem() {
    return this.firstRaw !== void 0 && this.restRaw !== void 0;
  }
  get isNil() {
    return this.equals(this.factory.namedNode(RDF2.nil));
  }
  get first() {
    return RequiredFrom.subjectPredicate(this, RDF2.first, this.termAs);
  }
  set first(value) {
    RequiredAs.object(this, RDF2.first, value, this.termFrom);
  }
  get rest() {
    return RequiredFrom.subjectPredicate(this, RDF2.rest, (w) => new _ListItem(w, w.dataset, w.factory, this.termAs, this.termFrom));
  }
  set rest(value) {
    RequiredAs.object(this, RDF2.rest, value, TermFrom2.instance);
  }
  pop() {
    try {
      return this.first;
    } finally {
      this.firstRaw = void 0;
      this.restRaw = this.factory.namedNode(RDF2.nil);
    }
  }
  *items() {
    if (this.firstRaw === void 0) {
      return;
    }
    yield this;
    for (const more of this.rest.items()) {
      yield more;
    }
  }
};

// node_modules/.deno/@rdfjs+wrapper@0.34.0/node_modules/@rdfjs/wrapper/dist/Overwriter.js
var Overwriter2 = class extends TermWrapper2 {
  p;
  constructor(subject, p) {
    super(subject, subject.dataset, subject.factory);
    this.p = p;
  }
  set listNode(object) {
    RequiredAs.object(this, this.p, object, TermFrom2.instance);
  }
};

// node_modules/.deno/@rdfjs+wrapper@0.34.0/node_modules/@rdfjs/wrapper/dist/RdfList.js
var RdfList2 = class {
  subject;
  predicate;
  termAs;
  termFrom;
  root;
  constructor(root, subject, predicate, termAs, termFrom) {
    this.subject = subject;
    this.predicate = predicate;
    this.termAs = termAs;
    this.termFrom = termFrom;
    this.root = new ListItem2(root, this.subject.dataset, this.subject.factory, termAs, termFrom);
    return new Proxy(this, new IndexerInterceptor2());
  }
  get [Symbol.unscopables]() {
    return Array.prototype[Symbol.unscopables];
  }
  get length() {
    return [
      ...this.items
    ].length;
  }
  set length(_) {
    throw new Error("this array is based on an RDF Collection. Its length cannot be modified like this.");
  }
  [Symbol.iterator]() {
    return this.values();
  }
  at(index) {
    return [
      ...this.items
    ].at(index)?.first;
  }
  concat(...items) {
    return [
      ...this
    ].concat(...items);
  }
  copyWithin(target, start, end) {
    throw new Error("not implemented");
  }
  entries() {
    return [
      ...this
    ].entries();
  }
  every(predicate, thisArg) {
    return [
      ...this
    ].every(predicate, thisArg);
  }
  fill(value, start, end) {
    throw new Error("not implemented");
  }
  filter(predicate, thisArg) {
    return [
      ...this
    ].filter(predicate, thisArg);
  }
  find(predicate, thisArg) {
    return [
      ...this
    ].find(predicate, thisArg);
  }
  findIndex(predicate, thisArg) {
    return [
      ...this
    ].findIndex(predicate, thisArg);
  }
  flat(depth) {
    throw new Error("not implemented");
  }
  flatMap(callback, thisArg) {
    return [
      ...this
    ].flatMap(callback, thisArg);
  }
  forEach(callback, thisArg) {
    [
      ...this
    ].forEach(callback, thisArg);
  }
  includes(searchElement, fromIndex) {
    return [
      ...this
    ].includes(searchElement, fromIndex);
  }
  indexOf(searchElement, fromIndex) {
    return [
      ...this
    ].indexOf(searchElement, fromIndex);
  }
  join(separator) {
    return [
      ...this
    ].join(separator);
  }
  keys() {
    return [
      ...this.items
    ].keys();
  }
  lastIndexOf(searchElement, fromIndex) {
    return [
      ...this
    ].lastIndexOf(searchElement, fromIndex);
  }
  map(callback, thisArg) {
    return [
      ...this
    ].map(callback, thisArg);
  }
  pop() {
    return [
      ...this.items
    ].at(-1)?.pop();
  }
  push(...items) {
    const nil = this.subject.factory.namedNode(RDF2.nil);
    for (const item of items) {
      const newNode = new ListItem2(this.subject.factory.blankNode(), this.subject.dataset, this.subject.factory, this.termAs, this.termFrom);
      const lastNode = this.root.isNil ? (
        // The statement representing an empty list is replaced by a new one whose object is the new node
        // The representation of the first item (root, currently rdf:nil, the empty list) is overwritten by the new node
        this.root = new Overwriter2(this.subject, this.predicate).listNode = newNode
      ) : (
        // replace rest of current last with new and return is because it's the new last
        [
          ...this.items
        ].at(-1).rest = newNode
      );
      lastNode.first = item;
      lastNode.restRaw = nil;
    }
    return this.length;
  }
  reduce(callback, initialValue) {
    return [
      ...this
    ].reduce(callback, initialValue);
  }
  reduceRight(callback, initialValue) {
    return [
      ...this
    ].reduceRight(callback, initialValue);
  }
  reverse() {
    throw new Error("not implemented");
  }
  shift() {
    if (this.root.isNil) {
      return void 0;
    }
    const value = this.root.first;
    if (this.root.rest.isNil) {
      new Overwriter2(this.subject, this.predicate).listNode = this.root.rest;
      this.root.firstRaw = void 0;
      this.root.restRaw = void 0;
    } else {
      this.root.firstRaw = this.root.rest.firstRaw;
      this.root.restRaw = this.root.rest.restRaw;
    }
    return value;
  }
  slice(start, end) {
    return [
      ...this
    ].slice(start, end);
  }
  some(predicate, thisArg) {
    return [
      ...this
    ].some(predicate, thisArg);
  }
  sort(compareFn) {
    throw new Error("not implemented");
  }
  splice(start, deleteCount, ...items) {
    throw new Error("not implemented");
  }
  unshift(...items) {
    for (const item of items.reverse()) {
      const firstNode = this.root;
      this.root = new Overwriter2(this.subject, this.predicate).listNode = new ListItem2(this.subject.factory.blankNode(), this.subject.dataset, this.subject.factory, this.termAs, this.termFrom);
      this.root.first = item;
      this.root.rest = firstNode;
    }
    return this.length;
  }
  *values() {
    for (const item of this.items) {
      yield item.first;
    }
  }
  get [Symbol.toStringTag]() {
    return this.constructor.name;
  }
  get items() {
    return this.root.items();
  }
};

// node_modules/.deno/@rdfjs+wrapper@0.34.0/node_modules/@rdfjs/wrapper/dist/errors/WrapperError.js
var WrapperError2 = class extends Error {
  /**
     * Creates a new instance of {@link WrapperError}.
     *
     * @param message - A human-readable description of the error.
     * @param cause - The specific original cause of the error.
     */
  constructor(message, cause) {
    super(message);
    this.name = this.constructor.name;
    this.cause = cause;
  }
  //#region Ignore in documentation
  /** @ignore */
  static captureStackTrace(targetObject, constructorOpt) {
    super.captureStackTrace(targetObject, constructorOpt);
  }
  /** @ignore */
  static prepareStackTrace(err, stackTraces) {
    super.prepareStackTrace(err, stackTraces);
  }
  /** @ignore */
  static get stackTraceLimit() {
    return super.stackTraceLimit;
  }
  /** @ignore */
  static set stackTraceLimit(value) {
    super.stackTraceLimit = value;
  }
};

// node_modules/.deno/@rdfjs+wrapper@0.34.0/node_modules/@rdfjs/wrapper/dist/errors/TermError.js
var TermError2 = class extends WrapperError2 {
  term;
  /**
     * Creates a new instance of {@link TermError}.
     *
     * @param term - The term associated with this error.
     * @param message - A human-readable description of the error.
     * @param cause - The specific original cause of the error.
     */
  constructor(term, message, cause) {
    super(message, cause);
    this.term = term;
  }
};

// node_modules/.deno/@rdfjs+wrapper@0.34.0/node_modules/@rdfjs/wrapper/dist/errors/TermTypeError.js
var TermTypeError2 = class extends TermError2 {
  termType;
  /**
     * Creates a new instance of {@link TermTypeError}.
     *
     * @param term - The term associated with this error.
     * @param termType - The expected term type.
     * @param cause - The specific original cause of the error.
     */
  constructor(term, termType, cause) {
    super(term, `Term type must be ${termType} but was ${term.termType}`, cause);
    this.termType = termType;
  }
};

// node_modules/.deno/@rdfjs+wrapper@0.34.0/node_modules/@rdfjs/wrapper/dist/errors/LiteralDatatypeError.js
var LiteralDatatypeError2 = class extends TermError2 {
  datatypes;
  /**
     * Creates a new instance of {@link LiteralDatatypeError}.
     *
     * @param literal - The literal associated with this error.
     * @param datatypes - The expected datatypes.
     * @param cause - The specific original cause of the error.
     */
  constructor(literal, datatypes, cause) {
    super(literal, `Datatype must be one of ${[
      ...datatypes
    ].join()} but was ${literal.datatype}`, cause);
    this.datatypes = datatypes;
  }
};

// node_modules/.deno/@rdfjs+wrapper@0.34.0/node_modules/@rdfjs/wrapper/dist/errors/ListRootError.js
var ListRootError = class extends TermError2 {
  constructor(term, cause) {
    super(term, `List root must be rdf:nil or a BlankNode but was ${term.value}`, cause);
  }
};

// node_modules/.deno/@rdfjs+wrapper@0.34.0/node_modules/@rdfjs/wrapper/dist/ensure.js
function ensurePresent4(object) {
  if (object !== void 0 && object !== null) {
    return;
  }
  throw new ReferenceError("Object must not be undefined or null");
}
function ensureIs(object, type) {
  if (object instanceof type) {
    return;
  }
  throw new TypeError(`Object must be a ${type}`);
}
function ensureTermType(term, type) {
  if (term.termType === type) {
    return;
  }
  throw new TermTypeError2(term, type);
}
function ensureDatatype2(term, ...datatypes) {
  if (datatypes.includes(term.datatype.value)) {
    return;
  }
  throw new LiteralDatatypeError2(term, datatypes);
}
function ensureListRoot(term) {
  if (term.termType === "NamedNode" && term.value === RDF2.nil) {
    return;
  }
  if (term.termType === "BlankNode") {
    return;
  }
  throw new ListRootError(term);
}

// node_modules/.deno/@rdfjs+wrapper@0.34.0/node_modules/@rdfjs/wrapper/dist/mapping/TermAs.js
var TermAs2;
(function(TermAs3) {
  function instance(constructor) {
    return (term2) => {
      ensurePresent4(term2);
      ensureIs(term2, TermWrapper2);
      return new constructor(term2, term2.dataset, term2.factory);
    };
  }
  TermAs3.instance = instance;
  function is(term2) {
    return term2;
  }
  TermAs3.is = is;
  function list(subject, predicate, termAs, termFrom) {
    return (term2) => {
      ensurePresent4(term2);
      ensureIs(term2, TermWrapper2);
      ensureListRoot(term2);
      return new RdfList2(term2, subject, predicate, termAs, termFrom);
    };
  }
  TermAs3.list = list;
  function term(term2) {
    return term2;
  }
  TermAs3.term = term;
})(TermAs2 || (TermAs2 = {}));

// node_modules/.deno/@rdfjs+wrapper@0.34.0/node_modules/@rdfjs/wrapper/dist/vocabulary/XSD.js
var XSD2 = {
  anyURI: "http://www.w3.org/2001/XMLSchema#anyURI",
  base64Binary: "http://www.w3.org/2001/XMLSchema#base64Binary",
  boolean: "http://www.w3.org/2001/XMLSchema#boolean",
  byte: "http://www.w3.org/2001/XMLSchema#byte",
  date: "http://www.w3.org/2001/XMLSchema#date",
  dateTime: "http://www.w3.org/2001/XMLSchema#dateTime",
  decimal: "http://www.w3.org/2001/XMLSchema#decimal",
  double: "http://www.w3.org/2001/XMLSchema#double",
  float: "http://www.w3.org/2001/XMLSchema#float",
  hexBinary: "http://www.w3.org/2001/XMLSchema#hexBinary",
  int: "http://www.w3.org/2001/XMLSchema#int",
  integer: "http://www.w3.org/2001/XMLSchema#integer",
  long: "http://www.w3.org/2001/XMLSchema#long",
  negativeInteger: "http://www.w3.org/2001/XMLSchema#negativeInteger",
  nonNegativeInteger: "http://www.w3.org/2001/XMLSchema#nonNegativeInteger",
  nonPositiveInteger: "http://www.w3.org/2001/XMLSchema#nonPositiveInteger",
  positiveInteger: "http://www.w3.org/2001/XMLSchema#positiveInteger",
  short: "http://www.w3.org/2001/XMLSchema#short",
  string: "http://www.w3.org/2001/XMLSchema#string",
  unsignedByte: "http://www.w3.org/2001/XMLSchema#unsignedByte",
  unsignedInt: "http://www.w3.org/2001/XMLSchema#unsignedInt",
  unsignedLong: "http://www.w3.org/2001/XMLSchema#unsignedLong",
  unsignedShort: "http://www.w3.org/2001/XMLSchema#unsignedShort"
};

// node_modules/.deno/@rdfjs+wrapper@0.34.0/node_modules/@rdfjs/wrapper/dist/mapping/LiteralAs.js
var LiteralAs2;
(function(LiteralAs3) {
  function bigint(term) {
    ensurePresent4(term);
    ensureIs(term, TermWrapper2);
    ensureTermType(term, "Literal");
    ensureDatatype2(term, ...integerDatatypes2);
    return BigInt(term.value);
  }
  LiteralAs3.bigint = bigint;
  function boolean(term) {
    ensurePresent4(term);
    ensureIs(term, TermWrapper2);
    ensureTermType(term, "Literal");
    ensureDatatype2(term, XSD2.boolean);
    return term.value === "true" || term.value === "1";
  }
  LiteralAs3.boolean = boolean;
  function date(term) {
    ensurePresent4(term);
    ensureIs(term, TermWrapper2);
    ensureTermType(term, "Literal");
    ensureDatatype2(term, ...dateDatatypes2);
    return new Date(term.value);
  }
  LiteralAs3.date = date;
  function langString(term) {
    ensurePresent4(term);
    ensureIs(term, TermWrapper2);
    ensureTermType(term, "Literal");
    ensureDatatype2(term, RDF2.langString);
    return {
      lang: term.language,
      string: term.value
    };
  }
  LiteralAs3.langString = langString;
  function number(term) {
    ensurePresent4(term);
    ensureIs(term, TermWrapper2);
    ensureTermType(term, "Literal");
    ensureDatatype2(term, ...numericDatatypes2);
    if (term.value === "INF") {
      return Number.POSITIVE_INFINITY;
    }
    if (term.value === "-INF") {
      return Number.NEGATIVE_INFINITY;
    }
    if (term.value === "NaN") {
      return Number.NaN;
    }
    return Number(term.value);
  }
  LiteralAs3.number = number;
  function string(term) {
    ensurePresent4(term);
    ensureIs(term, TermWrapper2);
    return term.value;
  }
  LiteralAs3.string = string;
  function symbol(term) {
    ensurePresent4(term);
    ensureIs(term, TermWrapper2);
    return Symbol.for(term.value);
  }
  LiteralAs3.symbol = symbol;
  function uInt8Array(term) {
    ensurePresent4(term);
    ensureIs(term, TermWrapper2);
    ensureTermType(term, "Literal");
    ensureDatatype2(term, ...byteArrayDatatypes2);
    switch (term.datatype.value) {
      case XSD2.hexBinary:
        return Uint8Array.from(Buffer.from(term.value, "hex"));
      default:
      case XSD2.base64Binary:
        return Uint8Array.from(Buffer.from(term.value, "base64"));
    }
  }
  LiteralAs3.uInt8Array = uInt8Array;
  function url(term) {
    ensurePresent4(term);
    ensureIs(term, TermWrapper2);
    ensureTermType(term, "Literal");
    ensureDatatype2(term, XSD2.anyURI);
    return new URL(term.value);
  }
  LiteralAs3.url = url;
  function langTuple(term) {
    ensurePresent4(term);
    ensureIs(term, TermWrapper2);
    ensureTermType(term, "Literal");
    ensureDatatype2(term, RDF2.langString);
    return [
      term.language,
      term.value
    ];
  }
  LiteralAs3.langTuple = langTuple;
  function datatypeTuple(term) {
    ensurePresent4(term);
    ensureIs(term, TermWrapper2);
    ensureTermType(term, "Literal");
    return [
      term.datatype.value,
      term.value
    ];
  }
  LiteralAs3.datatypeTuple = datatypeTuple;
})(LiteralAs2 || (LiteralAs2 = {}));
var byteArrayDatatypes2 = [
  XSD2.base64Binary,
  XSD2.hexBinary
];
var integerDatatypes2 = [
  XSD2.integer,
  XSD2.nonPositiveInteger,
  XSD2.long,
  XSD2.nonNegativeInteger,
  XSD2.negativeInteger,
  XSD2.int,
  XSD2.unsignedLong,
  XSD2.positiveInteger,
  XSD2.short,
  XSD2.unsignedInt,
  XSD2.byte,
  XSD2.unsignedShort,
  XSD2.unsignedByte
];
var numericDatatypes2 = integerDatatypes2.concat([
  XSD2.decimal,
  XSD2.float,
  XSD2.double
]);
var dateDatatypes2 = [
  XSD2.date,
  XSD2.dateTime
];

// node_modules/.deno/@rdfjs+wrapper@0.34.0/node_modules/@rdfjs/wrapper/dist/mapping/LiteralFrom.js
var LiteralFrom2;
(function(LiteralFrom3) {
  function anyUriString(value, factory) {
    return factory.literal(value, factory.namedNode(XSD2.anyURI));
  }
  LiteralFrom3.anyUriString = anyUriString;
  function anyUriUrl(value, factory) {
    return anyUriString(value.toString(), factory);
  }
  LiteralFrom3.anyUriUrl = anyUriUrl;
  function base64(value, factory) {
    return factory.literal(value.toBase64(), factory.namedNode(XSD2.base64Binary));
  }
  LiteralFrom3.base64 = base64;
  function boolean(value, factory) {
    return factory.literal(value.toString(), factory.namedNode(XSD2.boolean));
  }
  LiteralFrom3.boolean = boolean;
  function date(value, factory) {
    return factory.literal(value.toISOString(), factory.namedNode(XSD2.date));
  }
  LiteralFrom3.date = date;
  function dateTime(value, factory) {
    return factory.literal(value.toISOString(), factory.namedNode(XSD2.dateTime));
  }
  LiteralFrom3.dateTime = dateTime;
  function double(value, factory) {
    return factory.literal(value.toString(), factory.namedNode(XSD2.double));
  }
  LiteralFrom3.double = double;
  function integer(value, factory) {
    return factory.literal(value.toString(), factory.namedNode(XSD2.integer));
  }
  LiteralFrom3.integer = integer;
  function hex(value, factory) {
    return factory.literal(value.toHex(), factory.namedNode(XSD2.hexBinary));
  }
  LiteralFrom3.hex = hex;
  function langString(value, factory) {
    return factory.literal(value.string, {
      language: value.lang
    });
  }
  LiteralFrom3.langString = langString;
  function string(value, factory) {
    return factory.literal(value);
  }
  LiteralFrom3.string = string;
  function langTuple([key, value], factory) {
    return factory.literal(value, key);
  }
  LiteralFrom3.langTuple = langTuple;
  function datatypeTuple([key, value], factory) {
    return factory.literal(value, factory.namedNode(key));
  }
  LiteralFrom3.datatypeTuple = datatypeTuple;
})(LiteralFrom2 || (LiteralFrom2 = {}));

// node_modules/.deno/@rdfjs+wrapper@0.34.0/node_modules/@rdfjs/wrapper/dist/mapping/NamedNodeFrom.js
var NamedNodeFrom2;
(function(NamedNodeFrom3) {
  function string(value, factory) {
    return factory.namedNode(value);
  }
  NamedNodeFrom3.string = string;
  function url(value, factory) {
    return string(value.toString(), factory);
  }
  NamedNodeFrom3.url = url;
})(NamedNodeFrom2 || (NamedNodeFrom2 = {}));

// node_modules/.deno/@rdfjs+wrapper@0.34.0/node_modules/@rdfjs/wrapper/dist/mapping/NamedNodeAs.js
var NamedNodeAs2;
(function(NamedNodeAs3) {
  function string(term) {
    ensurePresent4(term);
    ensureIs(term, TermWrapper2);
    ensureTermType(term, "NamedNode");
    return term.value;
  }
  NamedNodeAs3.string = string;
  function url(term) {
    ensurePresent4(term);
    ensureIs(term, TermWrapper2);
    ensureTermType(term, "NamedNode");
    return new URL(term.value);
  }
  NamedNodeAs3.url = url;
})(NamedNodeAs2 || (NamedNodeAs2 = {}));

// node_modules/.deno/@rdfjs+wrapper@0.34.0/node_modules/@rdfjs/wrapper/dist/mapping/BlankNodeFrom.js
var BlankNodeFrom2;
(function(BlankNodeFrom3) {
  function string(value, factory) {
    return factory.blankNode(value);
  }
  BlankNodeFrom3.string = string;
})(BlankNodeFrom2 || (BlankNodeFrom2 = {}));

// node_modules/.deno/@rdfjs+wrapper@0.34.0/node_modules/@rdfjs/wrapper/dist/WrappingMap.js
var WrappingMap2 = class {
  subject;
  predicate;
  termAs;
  termFrom;
  constructor(subject, predicate, termAs, termFrom) {
    this.subject = subject;
    this.predicate = predicate;
    this.termAs = termAs;
    this.termFrom = termFrom;
  }
  clear() {
    for (const q of this.matches) {
      this.subject.dataset.delete(q);
    }
  }
  delete(k) {
    const p = this.subject.factory.namedNode(this.predicate);
    for (const entry of this) {
      if (entry[0] !== k) {
        continue;
      }
      this.subject.dataset.delete(this.subject.factory.quad(this.subject, p, this.termFrom(entry, this.subject.factory)));
      return true;
    }
    return false;
  }
  forEach(callback, thisArg) {
    for (const [key, value] of this) {
      callback.call(thisArg, value, key, this);
    }
  }
  get(k) {
    for (const [key, value] of this) {
      if (key !== k) {
        continue;
      }
      return value;
    }
    return void 0;
  }
  has(k) {
    return this.get(k) !== void 0;
  }
  set(k, v) {
    this.delete(k);
    this.add(k, v);
    return this;
  }
  get size() {
    return [
      ...this.matches
    ].length;
  }
  set size(_) {
    throw new Error("not supported");
  }
  *entries() {
    for (const quad of this.matches) {
      yield this.termAs(new TermWrapper2(quad.object, this.subject.dataset, this.subject.factory));
    }
  }
  *keys() {
    for (const [key] of this) {
      yield key;
    }
  }
  *values() {
    for (const [, value] of this) {
      yield value;
    }
  }
  [Symbol.iterator]() {
    return this.entries();
  }
  get [Symbol.toStringTag]() {
    return this.constructor.name;
  }
  get matches() {
    const p = this.subject.factory.namedNode(this.predicate);
    return this.subject.dataset.match(this.subject, p);
  }
  add(k, v) {
    const p = this.subject.factory.namedNode(this.predicate);
    this.subject.dataset.add(this.subject.factory.quad(this.subject, p, this.termFrom([
      k,
      v
    ], this.subject.factory)));
  }
};

// node_modules/.deno/@rdfjs+wrapper@0.34.0/node_modules/@rdfjs/wrapper/dist/mapping/Mapping.js
var Mapping;
(function(Mapping2) {
  function languageDictionary(anchor, p, termAs, termFrom) {
    if (termAs === void 0) {
      throw new Error();
    }
    if (termFrom === void 0) {
      throw new Error();
    }
    return new WrappingMap2(anchor, p, termAs, termFrom);
  }
  Mapping2.languageDictionary = languageDictionary;
})(Mapping || (Mapping = {}));

// node_modules/.deno/@rdfjs+wrapper@0.34.0/node_modules/@rdfjs/wrapper/dist/WrappingSet.js
var WrappingSet2 = class {
  subject;
  predicate;
  termAs;
  termFrom;
  // TODO: Direction
  constructor(subject, predicate, termAs, termFrom) {
    this.subject = subject;
    this.predicate = predicate;
    this.termAs = termAs;
    this.termFrom = termFrom;
  }
  add(value) {
    this.subject.dataset.add(this.quad(value));
    return this;
  }
  clear() {
    for (const q of this.matches) {
      this.subject.dataset.delete(q);
    }
  }
  delete(value) {
    if (!this.has(value)) {
      return false;
    }
    const o = this.termFrom(value, this.subject.factory);
    const p = this.subject.factory.namedNode(this.predicate);
    for (const q of this.subject.dataset.match(this.subject, p, o)) {
      this.subject.dataset.delete(q);
    }
    return true;
  }
  forEach(cb, thisArg) {
    for (const item of this) {
      cb.call(thisArg, item, item, this);
    }
  }
  has(value) {
    return this.subject.dataset.has(this.quad(value));
  }
  get size() {
    return this.matches.size;
  }
  [Symbol.iterator]() {
    return this.values();
  }
  *entries() {
    for (const v of this) {
      yield [
        v,
        v
      ];
    }
  }
  keys() {
    return this.values();
  }
  *values() {
    for (const q of this.matches) {
      yield this.termAs(new TermWrapper2(q.object, this.subject.dataset, this.subject.factory));
    }
  }
  get [Symbol.toStringTag]() {
    return this.constructor.name;
  }
  quad(value) {
    const s = this.subject;
    const p = this.subject.factory.namedNode(this.predicate);
    const o = this.termFrom(value, this.subject.factory);
    const q = this.subject.factory.quad(s, p, o);
    return q;
  }
  get matches() {
    const p = this.subject.factory.namedNode(this.predicate);
    return this.subject.dataset.match(this.subject, p);
  }
};

// node_modules/.deno/@rdfjs+wrapper@0.34.0/node_modules/@rdfjs/wrapper/dist/mapping/SetFrom.js
var SetFrom;
(function(SetFrom2) {
  function subjectPredicate(anchor, p, termAs, termFrom) {
    if (termAs === void 0) {
      throw new Error();
    }
    if (termFrom === void 0) {
      throw new Error();
    }
    return new WrappingSet2(anchor, p, termAs, termFrom);
  }
  SetFrom2.subjectPredicate = subjectPredicate;
})(SetFrom || (SetFrom = {}));

// vocabulary.ts
var NS = "https://comidas.gratis/vocab#";
var COMIDAS = {
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
  Availability: `${NS}Availability`
};

// client/role-pages-lib.ts
function defaultProviderAgent() {
  return structuredClone(agentChurch);
}
function defaultReceiverAgent() {
  return structuredClone(agentFamily);
}
export {
  FAKE_AGENTS,
  agentsWithProviderRole,
  defaultProviderAgent,
  defaultReceiverAgent,
  distanceKm
};
