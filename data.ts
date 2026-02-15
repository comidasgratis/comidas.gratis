type Agent = {
  '@id': string;
  name: string;
};

type Schedule = { start: string; end?: string };
type Provision = string;

type Availability = {
  schedule: Schedule;
  provision: Array<Provision>;
};

type Presence = {
  schedule: Schedule;
  location: string;
  details: string;
};

type Provider = {
  agent: Agent;
  location: string;
  availability: Availability[];
  details?: string;
};

type Receiver = {
  agent: Agent;
  presence: Presence[];
  flags?: string[];
};

const churchAgent: Agent = {
  '@id': 'https://comidas.gratis/church/profile/card#me',
  name: 'Church Provider',
};

const church: Provider = {
  agent: churchAgent,
  location: '36°07\'26.3"N 78°56\'30.4"W',
  availability: [
    {
      schedule: { start: '2026-02-19 T9:30am', end: undefined },
      provision: ['fruit', 'meat', 'dairy'],
    },
  ],
  details: '3rd Thurs and 4th Tues from 930 until food is gone',
};

const familyAgent: Agent = {
  '@id': 'https://comidas.gratis/family/profile/card#me',
  name: 'Big Family',
};

const family: Receiver = {
  agent: familyAgent,
  presence: [
    {
      schedule: { start: '2026-02-19 T8:30am', end: '2026-02-19 T5:30pm' },
      location: '36°04\'45.4"N 78°55\'47.5"W',
      details: 'Knock three times on the pipes',
    },
  ],
  flags: ['vegan'],
};
