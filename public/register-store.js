// vendor/cpx-store.ts
var CPXStore = class extends HTMLElement {
  _state;
  _history;
  _pointer;
  _isInternalChange;
  _isSyncing;
  _middleware;
  constructor(initialState = {}, middleware = []) {
    super();
    this._state = initialState;
    this._history = [
      JSON.stringify(initialState)
    ];
    this._pointer = 0;
    this._isInternalChange = false;
    this._isSyncing = false;
    this._middleware = middleware;
  }
  connectedCallback() {
    const storageKey = this.getAttribute("persist");
    this.state = new Proxy(this._state, {
      set: (target, prop, value) => {
        if (target[prop] === value) return true;
        this._middleware.forEach((fn) => fn(prop, value, target[prop]));
        if (!this._isInternalChange) {
          this._history = this._history.slice(0, this._pointer + 1);
          this._history.push(JSON.stringify({
            ...target,
            [prop]: value
          }));
          this._pointer++;
        }
        target[prop] = value;
        if (storageKey && !this._isSyncing) {
          localStorage.setItem(storageKey, JSON.stringify(target));
        }
        this._broadcast(prop, value);
        return true;
      }
    });
  }
  _broadcast(prop, value, eventName = "app-state-update") {
    this.dispatchEvent(new CustomEvent("change", {
      detail: {
        prop,
        value
      },
      bubbles: true
    }));
    globalThis.dispatchEvent(new CustomEvent(eventName, {
      detail: {
        store: this.tagName,
        prop,
        value
      }
    }));
  }
  undo() {
    if (this._pointer > 0) {
      this._pointer--;
      this._applyHistory();
    }
  }
  redo() {
    if (this._pointer < this._history.length - 1) {
      this._pointer++;
      this._applyHistory();
    }
  }
  _applyHistory() {
    this._isInternalChange = true;
    const snapshot = JSON.parse(this._history[this._pointer]);
    Object.assign(this.state, snapshot);
    this._isInternalChange = false;
  }
};

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

// comidas-matching-store.ts
function computeMatches(agents, maxKm) {
  const providerSide = agentsWithProviderRole(agents);
  const out = [];
  for (const recvAgent of agents) {
    recvAgent.availabilities.forEach((av, availabilityIndex) => {
      if (av.role !== "receiver") return;
      const rc = av.location.coordinates;
      let best = null;
      for (const provAgent of providerSide) {
        for (const pav of provAgent.availabilities) {
          if (pav.role !== "provider") continue;
          const pc = pav.location.coordinates;
          const d = distanceKm(rc, pc);
          if (d > maxKm) continue;
          if (!best || d < best.distanceKm) {
            best = {
              providerAgentId: provAgent["@id"],
              receiverAgentId: recvAgent["@id"],
              receiverAvailabilityIndex: availabilityIndex,
              distanceKm: Math.round(d * 1e3) / 1e3
            };
          }
        }
      }
      if (best) out.push(best);
    });
  }
  return out;
}
var ComidasMatchingStore = class extends CPXStore {
  constructor() {
    super({
      agents: [],
      matches: [],
      maxMatchKm: 8
    });
  }
  seedDemoData() {
    this.state.agents = [
      ...FAKE_AGENTS
    ];
    this.recomputeMatches();
  }
  recomputeMatches() {
    this.state.matches = computeMatches(this.state.agents, this.state.maxMatchKm);
  }
  setMaxMatchKm(km) {
    this.state.maxMatchKm = km;
    this.recomputeMatches();
  }
};
var tag = "comidas-matching-store";
if (!customElements.get(tag)) {
  customElements.define(tag, ComidasMatchingStore);
}
