import type { Agent, Availability } from '../model.js';
import {
  locChurch,
  locEasternHub,
  locFamilyHome,
  locFamilyWork,
  locMidRing,
  locMobileStop,
  locNorthCounty,
  locPantryEastDurham,
  locRaleighKitchen,
  locShelterLobby,
  locSouthDayTable,
  locSouthwestAg,
  locStudentFridge,
  locWestHills,
} from './locations.js';
import { familyWeekdayReceiverAvailabilities } from './family-weekdays.js';

const churchSlotStarts = [
  '2026-02-19 T9:30am',
  '2026-02-24 T9:30am',
  '2026-03-19 T9:30am',
  '2026-03-24 T9:30am',
  '2026-04-16 T9:30am',
  '2026-04-28 T9:30am',
  '2026-05-21 T9:30am',
  '2026-05-26 T9:30am',
  '2026-06-18 T9:30am',
  '2026-06-23 T9:30am',
] as const;

function churchAvailabilities(): Availability[] {
  return churchSlotStarts.map((start) => ({
    schedule: { start, end: undefined },
    location: locChurch,
    provisions: ['fruit', 'meat', 'dairy'],
    role: 'provider' as const,
  }));
}

export const agentChurch: Agent = {
  '@id': 'https://comidas.gratis/church/profile/card#me',
  name: 'Church Provider',
  locations: [locChurch],
  availabilities: churchAvailabilities(),
};

export const agentFamily: Agent = {
  '@id': 'https://comidas.gratis/family/profile/card#me',
  name: 'Big Family',
  locations: [locFamilyWork, locFamilyHome],
  availabilities: familyWeekdayReceiverAvailabilities(),
  flags: ['vegan'],
};

export const agentPantry: Agent = {
  '@id': 'https://comidas.gratis/east-durham-pantry/profile/card#me',
  name: 'East Durham Community Fridge',
  locations: [locPantryEastDurham],
  availabilities: [
    {
      schedule: { start: '2026-02-20 T11:00am', end: '2026-02-20 T6:00pm' },
      location: locPantryEastDurham,
      provisions: ['produce', 'bread', 'non-perishable'],
      role: 'provider',
    },
  ],
};

export const agentMobile: Agent = {
  '@id': 'https://comidas.gratis/mobile-meals/profile/card#me',
  name: 'Mobile Meals Van',
  locations: [locMobileStop],
  availabilities: [
    {
      schedule: { start: '2026-02-21 T4:00pm', end: '2026-02-21 T6:30pm' },
      location: locMobileStop,
      provisions: ['hot meal', 'water'],
      role: 'provider',
    },
  ],
};

export const agentStudent: Agent = {
  '@id': 'https://comidas.gratis/student-co-op/profile/card#me',
  name: 'Student Co-op',
  locations: [locStudentFridge],
  availabilities: [
    {
      schedule: { start: '2026-02-20 T10:00am', end: '2026-02-20 T8:00pm' },
      location: locStudentFridge,
      provisions: [],
      role: 'receiver',
    },
  ],
  flags: ['nut-free'],
};

export const agentShelter: Agent = {
  '@id': 'https://comidas.gratis/night-shelter/profile/card#me',
  name: 'Central Durham Shelter',
  locations: [locShelterLobby],
  availabilities: [
    {
      schedule: { start: '2026-02-21 T3:00pm', end: '2026-02-21 T8:00pm' },
      location: locShelterLobby,
      provisions: [],
      role: 'receiver',
    },
  ],
};

export const agentRaleigh: Agent = {
  '@id': 'https://comidas.gratis/raleigh-kitchen/profile/card#me',
  name: 'Raleigh Test Kitchen',
  locations: [locRaleighKitchen],
  availabilities: [
    {
      schedule: { start: '2026-02-19 T12:00pm', end: undefined },
      location: locRaleighKitchen,
      provisions: ['catering surplus'],
      role: 'provider',
    },
  ],
};

export const agentSouthDayTable: Agent = {
  '@id': 'https://comidas.gratis/south-durham-day-table/profile/card#me',
  name: 'South Durham Day Table',
  locations: [locSouthDayTable],
  availabilities: [
    {
      schedule: { start: '2026-02-18 T7:00am', end: '2026-02-18 T10:00am' },
      location: locSouthDayTable,
      provisions: ['breakfast', 'coffee'],
      role: 'provider',
    },
  ],
};

export const agentWestHills: Agent = {
  '@id': 'https://comidas.gratis/west-hills-pantry/profile/card#me',
  name: 'West Hills Pantry',
  locations: [locWestHills],
  availabilities: [
    {
      schedule: { start: '2026-02-19 T2:00pm', end: '2026-02-19 T7:00pm' },
      location: locWestHills,
      provisions: ['dry goods', 'canned goods'],
      role: 'provider',
    },
  ],
};

export const agentEasternHub: Agent = {
  '@id': 'https://comidas.gratis/eastern-outreach-hub/profile/card#me',
  name: 'Eastern Outreach Hub',
  locations: [locEasternHub],
  availabilities: [
    {
      schedule: { start: '2026-02-20 T9:00am', end: '2026-02-20 T3:00pm' },
      location: locEasternHub,
      provisions: ['produce', 'baby food'],
      role: 'provider',
    },
  ],
};

export const agentMidRing: Agent = {
  '@id': 'https://comidas.gratis/mid-ring-coop/profile/card#me',
  name: 'Mid-Ring Food Co-op',
  locations: [locMidRing],
  availabilities: [
    {
      schedule: { start: '2026-02-22 T10:00am', end: undefined },
      location: locMidRing,
      provisions: ['vegetables', 'eggs'],
      role: 'provider',
    },
  ],
};

export const agentNorthCounty: Agent = {
  '@id': 'https://comidas.gratis/north-county-kitchen/profile/card#me',
  name: 'North County Community Kitchen',
  locations: [locNorthCounty],
  availabilities: [
    {
      schedule: { start: '2026-02-21 T11:30am', end: '2026-02-21 T2:00pm' },
      location: locNorthCounty,
      provisions: ['hot lunch', 'salad'],
      role: 'provider',
    },
  ],
};

export const agentSouthwestAg: Agent = {
  '@id': 'https://comidas.gratis/southwest-ag-share/profile/card#me',
  name: 'Southwest Ag Share',
  locations: [locSouthwestAg],
  availabilities: [
    {
      schedule: { start: '2026-02-19 T4:00pm', end: '2026-02-19 T8:00pm' },
      location: locSouthwestAg,
      provisions: ['produce boxes', 'grain'],
      role: 'provider',
    },
  ],
};

export const FAKE_AGENTS: Agent[] = [
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
  agentShelter,
];
