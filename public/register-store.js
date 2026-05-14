// deno:https://jsr.io/@chapeaux/cpx-store/0.7.5/src/reactivity.ts
var activeTracking = null;
var ReactiveState = class {
  _value;
  _subscribers = /* @__PURE__ */ new Set();
  constructor(value) {
    this._value = value;
  }
  get() {
    if (activeTracking) activeTracking.add(this);
    return this._value;
  }
  set(value) {
    if (Object.is(this._value, value)) return;
    this._value = value;
    for (const sub of this._subscribers) {
      sub._markDirty();
    }
  }
};
var ReactiveComputed = class {
  _fn;
  _cache;
  _dirty = true;
  _deps = /* @__PURE__ */ new Set();
  _subscribers = /* @__PURE__ */ new Set();
  constructor(fn) {
    this._fn = fn;
  }
  _markDirty() {
    if (this._dirty) return;
    this._dirty = true;
    for (const sub of this._subscribers) {
      sub._markDirty();
    }
  }
  _retrack() {
    for (const dep of this._deps) {
      dep._subscribers.delete(this);
    }
    this._deps.clear();
    const prev = activeTracking;
    activeTracking = /* @__PURE__ */ new Set();
    this._cache = this._fn();
    this._deps = activeTracking;
    activeTracking = prev;
    for (const dep of this._deps) {
      dep._subscribers.add(this);
    }
    this._dirty = false;
  }
  get() {
    if (activeTracking) activeTracking.add(this);
    if (this._dirty) this._retrack();
    return this._cache;
  }
};

// deno:https://jsr.io/@chapeaux/cpx-store/0.7.5/src/utils/nested-proxy.ts
function isPlainObject(val) {
  return val !== null && typeof val === "object" && !Array.isArray(val) && Object.getPrototypeOf(val) === Object.prototype;
}
var proxyCache = /* @__PURE__ */ new WeakMap();
function getCachedProxy(target, path) {
  return proxyCache.get(target)?.get(path);
}
function setCachedProxy(target, path, proxy) {
  let map = proxyCache.get(target);
  if (!map) {
    map = /* @__PURE__ */ new Map();
    proxyCache.set(target, map);
  }
  map.set(path, proxy);
}
function ensureSignal(store, fullPath, value) {
  let signal = store._signals.get(fullPath);
  if (!signal) {
    signal = new ReactiveState(value);
    store._signals.set(fullPath, signal);
  } else if (!Object.is(signal._value, value)) {
    signal._value = value;
  }
  return signal;
}
function createNestedProxy(obj, parentPath, store) {
  const cached = getCachedProxy(obj, parentPath);
  if (cached) return cached;
  const proxy = new Proxy(obj, {
    get(_target, prop) {
      const fullPath = parentPath ? `${parentPath}.${prop}` : prop;
      const rawValue = _target[prop];
      if (isPlainObject(rawValue)) {
        ensureSignal(store, fullPath, rawValue).get();
        return createNestedProxy(rawValue, fullPath, store);
      }
      const signal = ensureSignal(store, fullPath, rawValue);
      return signal.get();
    },
    set(_target, prop, value) {
      const fullPath = parentPath ? `${parentPath}.${prop}` : prop;
      store._setProperty(fullPath, value);
      return true;
    }
  });
  setCachedProxy(obj, parentPath, proxy);
  return proxy;
}

// deno:https://jsr.io/@chapeaux/cpx-store/0.7.5/src/cpx-store-core.ts
function CPXStoreCoreMixin(Base) {
  return class StoreBase extends Base {
    _state;
    _signals;
    _computedSignals;
    _plugins;
    _pendingChanges;
    _changeHandlers;
    _flushScheduled;
    _batchDepth;
    _isSyncing;
    _initialized;
    state;
    constructor(...args) {
      super(...args);
    }
    _setup(initialState = {}, plugins = []) {
      this._state = {
        ...initialState
      };
      this._signals = /* @__PURE__ */ new Map();
      this._computedSignals = /* @__PURE__ */ new Map();
      this._plugins = [];
      this._pendingChanges = /* @__PURE__ */ new Map();
      this._changeHandlers = /* @__PURE__ */ new Set();
      this._flushScheduled = false;
      this._batchDepth = 0;
      this._isSyncing = false;
      this._initialized = false;
      for (const [key, value] of Object.entries(initialState)) {
        this._signals.set(key, new ReactiveState(value));
      }
      for (const plugin of plugins) {
        this.use(plugin);
      }
    }
    _resolveNestedPath(path) {
      const parts = path.split(".");
      let current = this._state;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!_isPlainObject(current)) return void 0;
        current = current[parts[i]];
      }
      if (!_isPlainObject(current)) return void 0;
      return {
        parent: current,
        key: parts[parts.length - 1]
      };
    }
    _setProperty(prop, value) {
      if (this._computedSignals.has(prop)) return;
      const isNested = prop.includes(".");
      let oldValue;
      if (isNested) {
        const resolved = this._resolveNestedPath(prop);
        if (!resolved) return;
        oldValue = resolved.parent[resolved.key];
      } else {
        oldValue = this._state[prop];
      }
      if (Object.is(oldValue, value)) return;
      for (const plugin of this._plugins) {
        if (plugin.onBeforeSet) {
          if (plugin.onBeforeSet(prop, value, oldValue) === false) return;
        }
      }
      if (isNested) {
        const resolved = this._resolveNestedPath(prop);
        if (resolved) resolved.parent[resolved.key] = value;
      } else {
        this._state[prop] = value;
      }
      const signal = this._signals.get(prop);
      if (signal) {
        signal.set(value);
      } else {
        this._signals.set(prop, new ReactiveState(value));
      }
      if (!this._pendingChanges.has(prop)) {
        this._pendingChanges.set(prop, {
          old: oldValue,
          val: value
        });
      } else {
        this._pendingChanges.get(prop).val = value;
      }
      for (const plugin of this._plugins) {
        if (plugin.onAfterSet) plugin.onAfterSet(prop, value, oldValue);
      }
      this._scheduleFlush();
    }
    _init() {
      if (this._initialized) return;
      this._initialized = true;
      for (const plugin of this._plugins) {
        if (plugin.onInit) plugin.onInit(this);
      }
      const self = this;
      this.state = new Proxy(this._state, {
        get: (_target, prop) => {
          const computed = self._computedSignals.get(prop);
          if (computed) return computed.get();
          for (const plugin of self._plugins) {
            if (plugin.onGet) {
              const result = plugin.onGet(prop);
              if (result && result.handled) return result.value;
            }
          }
          const signal = self._signals.get(prop);
          const value = signal ? signal.get() : _target[prop];
          if (_isPlainObject(value)) {
            return createNestedProxy(value, prop, self);
          }
          return value;
        },
        set: (_target, prop, value) => {
          self._setProperty(prop, value);
          return true;
        },
        deleteProperty: (_target, prop) => {
          if (prop in _target) {
            const oldValue = _target[prop];
            delete _target[prop];
            self._signals.delete(prop);
            self._pendingChanges.set(prop, {
              old: oldValue,
              val: void 0
            });
            self._scheduleFlush();
          }
          return true;
        },
        has: (_target, prop) => {
          return self._computedSignals.has(prop) || prop in _target;
        },
        ownKeys: (_target) => {
          return [
            ...Object.keys(_target),
            ...self._computedSignals.keys()
          ];
        },
        getOwnPropertyDescriptor: (_target, prop) => {
          if (self._computedSignals.has(prop)) {
            return {
              configurable: true,
              enumerable: true,
              value: self._computedSignals.get(prop).get()
            };
          }
          return Object.getOwnPropertyDescriptor(_target, prop);
        }
      });
    }
    _destroy() {
      for (const plugin of this._plugins) {
        if (plugin.onDestroy) plugin.onDestroy();
      }
      this._changeHandlers.clear();
    }
    use(plugin) {
      this._plugins.push(plugin);
      return this;
    }
    computed(name, fn) {
      this._computedSignals.set(name, new ReactiveComputed(fn));
    }
    onChange(handler) {
      this._changeHandlers.add(handler);
      return () => {
        this._changeHandlers.delete(handler);
      };
    }
    _emitChanges(changes) {
      for (const handler of this._changeHandlers) {
        handler(changes);
      }
    }
    _scheduleFlush() {
      if (this._batchDepth > 0) return;
      if (this._flushScheduled) return;
      this._flushScheduled = true;
      queueMicrotask(() => this._flush());
    }
    _flush() {
      this._flushScheduled = false;
      if (this._pendingChanges.size === 0) return;
      const changes = /* @__PURE__ */ new Map();
      for (const [prop, change] of this._pendingChanges) {
        if (!Object.is(change.old, change.val)) changes.set(prop, change);
      }
      this._pendingChanges.clear();
      if (changes.size === 0) return;
      for (const plugin of this._plugins) {
        if (plugin.onFlush) plugin.onFlush(changes);
      }
      this._emitChanges(changes);
    }
    batch(fn) {
      this._batchDepth++;
      try {
        fn();
      } finally {
        this._batchDepth--;
        if (this._batchDepth === 0) this._flush();
      }
    }
    transaction(fn) {
      const snapshot = {
        ...this._state
      };
      const signalSnapshot = /* @__PURE__ */ new Map();
      for (const [k, s] of this._signals) signalSnapshot.set(k, s._value);
      this._batchDepth++;
      try {
        fn();
        this._batchDepth--;
        if (this._batchDepth === 0) this._flush();
      } catch (e) {
        this._batchDepth--;
        Object.keys(this._state).forEach((k) => delete this._state[k]);
        Object.assign(this._state, snapshot);
        for (const [k, val] of signalSnapshot) {
          const s = this._signals.get(k);
          if (s) s._value = val;
        }
        this._pendingChanges.clear();
        throw e;
      }
    }
    async dispatch(action) {
      this._batchDepth++;
      try {
        await action(this.state);
        this._batchDepth--;
        if (this._batchDepth === 0) this._flush();
      } catch (error) {
        this._batchDepth--;
        if (this._batchDepth === 0) this._flush();
        throw error;
      }
    }
    sync(incoming) {
      this._isSyncing = true;
      const oldState = {
        ...this._state
      };
      this.batch(() => {
        for (const [key, value] of Object.entries(incoming)) {
          this.state[key] = value;
        }
      });
      this._isSyncing = false;
      this.onSyncReceived({
        ...this._state
      }, oldState);
    }
    onSyncReceived(_newState, _oldState) {
    }
    undo() {
    }
    redo() {
    }
    toJSON() {
      return {
        ...this._state
      };
    }
  };
}
function _isPlainObject(val) {
  return val !== null && typeof val === "object" && !Array.isArray(val) && Object.getPrototypeOf(val) === Object.prototype;
}
var CPXHeadlessBase = CPXStoreCoreMixin(class {
});

// deno:https://jsr.io/@chapeaux/cpx-store/0.7.5/src/cpx-store.ts
var WebComponentBase = CPXStoreCoreMixin(HTMLElement);
var CPXStore = class extends WebComponentBase {
  constructor(initialState = {}, ...plugins) {
    super();
    this._setup(initialState, plugins);
  }
  connectedCallback() {
    this._init();
    this.onChange((changes) => {
      this.dispatchEvent(new CustomEvent("change", {
        detail: {
          changes: Object.fromEntries(changes)
        },
        bubbles: true
      }));
      globalThis.dispatchEvent(new CustomEvent("app-state-update", {
        detail: {
          store: this.tagName,
          changes: Object.fromEntries(changes)
        }
      }));
    });
  }
  disconnectedCallback() {
    this._destroy();
  }
  async dispatch(action) {
    this._batchDepth++;
    try {
      await action(this.state);
      this._batchDepth--;
      if (this._batchDepth === 0) this._flush();
    } catch (error) {
      this._batchDepth--;
      if (this._batchDepth === 0) this._flush();
      this.dispatchEvent(new CustomEvent("dispatch-error", {
        detail: {
          error
        },
        bubbles: true
      }));
      throw error;
    }
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
(function(LiteralFrom2) {
  function anyUriString(value, factory) {
    return factory.literal(value, factory.namedNode(XSD.anyUri));
  }
  LiteralFrom2.anyUriString = anyUriString;
  function anyUriUrl(value, factory) {
    return anyUriString(value.toString(), factory);
  }
  LiteralFrom2.anyUriUrl = anyUriUrl;
  function base64(value, factory) {
    return factory.literal(value.toBase64(), factory.namedNode(XSD.base64Binary));
  }
  LiteralFrom2.base64 = base64;
  function boolean(value, factory) {
    return factory.literal(value.toString(), factory.namedNode(XSD.boolean));
  }
  LiteralFrom2.boolean = boolean;
  function date(value, factory) {
    return factory.literal(value.toISOString(), factory.namedNode(XSD.date));
  }
  LiteralFrom2.date = date;
  function dateTime(value, factory) {
    return factory.literal(value.toISOString(), factory.namedNode(XSD.dateTime));
  }
  LiteralFrom2.dateTime = dateTime;
  function double(value, factory) {
    return factory.literal(value.toString(), factory.namedNode(XSD.double));
  }
  LiteralFrom2.double = double;
  function hex(value, factory) {
    return factory.literal(value.toHex(), factory.namedNode(XSD.hexBinary));
  }
  LiteralFrom2.hex = hex;
  function langString(value, factory) {
    return factory.literal(value.string, {
      language: value.lang
    });
  }
  LiteralFrom2.langString = langString;
  function string(value, factory) {
    return factory.literal(value);
  }
  LiteralFrom2.string = string;
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
(function(TermFrom2) {
  function instance(value, factory) {
    return itself(value, factory);
  }
  TermFrom2.instance = instance;
  function itself(value, __) {
    return value;
  }
  TermFrom2.itself = itself;
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
(function(TermAs2) {
  function instance(constructor) {
    return (term2) => {
      ensurePresent(term2);
      ensureType(term2);
      return new constructor(term2, term2.dataset, term2.factory);
    };
  }
  TermAs2.instance = instance;
  function is(term2) {
    return term2;
  }
  TermAs2.is = is;
  function list(subject, predicate, termAs, termFrom) {
    return (term2) => {
      ensurePresent(term2);
      ensureType(term2);
      return new RdfList(term2, subject, predicate, termAs, termFrom);
    };
  }
  TermAs2.list = list;
  function term(term2) {
    return term2;
  }
  TermAs2.term = term;
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
(function(LiteralAs2) {
  function bigint(term) {
    ensurePresent2(term);
    ensureType2(term);
    ensureLiteral(term);
    ensureDatatype(term, ...integerDatatypes);
    return BigInt(term.value);
  }
  LiteralAs2.bigint = bigint;
  function boolean(term) {
    ensurePresent2(term);
    ensureType2(term);
    ensureLiteral(term);
    ensureDatatype(term, XSD.boolean);
    return term.value === "true" || term.value === "1";
  }
  LiteralAs2.boolean = boolean;
  function date(term) {
    ensurePresent2(term);
    ensureType2(term);
    ensureLiteral(term);
    ensureDatatype(term, ...dateDatatypes);
    return new Date(term.value);
  }
  LiteralAs2.date = date;
  function langString(term) {
    ensurePresent2(term);
    ensureType2(term);
    ensureLiteral(term);
    return {
      lang: term.language,
      string: term.value
    };
  }
  LiteralAs2.langString = langString;
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
  LiteralAs2.number = number;
  function string(term) {
    ensurePresent2(term);
    ensureType2(term);
    return term.value;
  }
  LiteralAs2.string = string;
  function symbol(term) {
    ensurePresent2(term);
    ensureType2(term);
    return Symbol.for(term.value);
  }
  LiteralAs2.symbol = symbol;
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
  LiteralAs2.uInt8Array = uInt8Array;
  function url(term) {
    ensurePresent2(term);
    ensureType2(term);
    ensureLiteral(term);
    ensureDatatype(term, XSD.anyUri);
    return new URL(term.value);
  }
  LiteralAs2.url = url;
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
(function(NamedNodeFrom2) {
  function string(value, factory) {
    return factory.namedNode(value);
  }
  NamedNodeFrom2.string = string;
  function url(value, factory) {
    return string(value.toString(), factory);
  }
  NamedNodeFrom2.url = url;
})(NamedNodeFrom || (NamedNodeFrom = {}));

// node_modules/.deno/@rdfjs+wrapper@0.32.0/node_modules/@rdfjs/wrapper/dist/mapping/NamedNodeAs.js
var NamedNodeAs;
(function(NamedNodeAs2) {
  function string(term) {
    ensurePresent3(term);
    ensureType3(term);
    ensureNamedNode(term);
    return term.value;
  }
  NamedNodeAs2.string = string;
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
(function(BlankNodeFrom2) {
  function string(value, factory) {
    return factory.blankNode(value);
  }
  BlankNodeFrom2.string = string;
})(BlankNodeFrom || (BlankNodeFrom = {}));

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
