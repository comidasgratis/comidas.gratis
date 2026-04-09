import type { Availability } from '../model.js';
import { locFamilyHome, locFamilyWork } from './locations.js';

function daysInMonthUTC(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Weekdays 2026-02-01 through 2026-05-31: work + home receiver availabilities.
 */
export function familyWeekdayReceiverAvailabilities(): Availability[] {
  const out: Availability[] = [];
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
      const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      out.push({
        schedule: { start: `${iso} T8:30am`, end: `${iso} T5:30pm` },
        location: locFamilyWork,
        provisions: [],
        role: 'receiver',
      });
      out.push({
        schedule: { start: `${iso} T6:00pm`, end: `${iso} T9:00pm` },
        location: locFamilyHome,
        provisions: [],
        role: 'receiver',
        details: locFamilyHome.details,
      });
    }
  }
  return out;
}
