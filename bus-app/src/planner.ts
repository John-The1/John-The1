import type { DayOverride, Option, Overrides, Plan, Settings } from './types';

const MIN = 60_000;
const p2 = (n: number) => String(n).padStart(2, '0');

export const dateKey = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
export const fromKey = (k: string) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
export const hm = (d: Date) => `${p2(d.getHours())}:${p2(d.getMinutes())}`;
const atTime = (day: Date, hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m);
};
const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;

export function walkMinutes(s: Settings): number {
  return Math.max(1, Math.ceil(s.walkMeters / ((s.walkSpeedKmh * 1000) / 60)));
}

export const arrivalFor = (s: Settings, ovs: Overrides, day: Date) => ovs[dateKey(day)]?.arrivalTime ?? s.arrivalTime;

/** Plan for one specific day. `explicit` = the user picked this day, so show it even if late/gone. */
function planDay(s: Settings, ov: DayOverride | undefined, day: Date, now: Date, explicit: boolean): Plan | null {
  const times = [...(isWeekend(day) ? s.weekend : s.weekday)].sort();
  if (!times.length) return null;

  const walkMin = walkMinutes(s);
  const deadline = new Date(atTime(day, ov?.arrivalTime ?? s.arrivalTime).getTime() - s.arriveEarlyMin * MIN);
  const options: Option[] = times.map((t) => {
    const dep = atTime(day, t);
    const arr = new Date(dep.getTime() + s.rideMin * MIN);
    return { dep, arr, onTime: arr <= deadline, leaveAt: new Date(dep.getTime() - (walkMin + s.bufferMin) * MIN) };
  });

  const chosen =
    options.find((o) => ov?.dep && hm(o.dep) === ov.dep) ??
    [...options].reverse().find((o) => o.onTime) ??
    (explicit ? options[0] : undefined);
  if (!chosen) return null;

  const gone = chosen.dep.getTime() - walkMin * MIN < now.getTime(); // can't make it even with zero buffer
  const minsLeft = (chosen.leaveAt.getTime() - now.getTime()) / MIN;
  return {
    day, isToday: dateKey(day) === dateKey(now), deadline, walkMin, options, chosen, gone, missedEarlier: false,
    status: minsLeft > 10 ? 'ok' : minsLeft > 3 ? 'soon' : 'now',
  };
}

/**
 * Picks the latest bus that gets you there in time. Leave time = departure − walk − buffer.
 * With `forDate` it plans that exact day; otherwise it finds the next commute day,
 * rolling over once today's bus is out of reach.
 */
export function computePlan(s: Settings, ovs: Overrides, now: Date, forDate?: string): Plan | null {
  if (forDate) {
    const day = fromKey(forDate);
    return planDay(s, ovs[forDate], day, now, true);
  }
  let missedEarlier = false;
  for (let offset = 0; offset < 8; offset++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    if (!s.activeDays.includes(day.getDay())) continue;
    const plan = planDay(s, ovs[dateKey(day)], day, now, false);
    if (!plan) continue;
    if (plan.gone) {
      if (offset === 0 && plan.deadline > now) missedEarlier = true;
      continue;
    }
    return { ...plan, missedEarlier };
  }
  return null;
}
