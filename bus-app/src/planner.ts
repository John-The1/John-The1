import type { Option, Override, Plan, Settings } from './types';

const MIN = 60_000;
const p2 = (n: number) => String(n).padStart(2, '0');

export const dateKey = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
export const hm = (d: Date) => `${p2(d.getHours())}:${p2(d.getMinutes())}`;
const atTime = (day: Date, hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m);
};

export function walkMinutes(s: Settings): number {
  return Math.max(1, Math.ceil(s.walkMeters / ((s.walkSpeedKmh * 1000) / 60)));
}

/**
 * Finds the next day you commute and picks the latest bus that gets you there in time.
 * Leave time = departure − walking time − safety buffer. If today's bus is already
 * out of reach, it rolls over to the next active day.
 */
export function computePlan(s: Settings, ov: Override | undefined, now: Date): Plan | null {
  const walkMin = walkMinutes(s);
  let missedEarlier = false;

  for (let offset = 0; offset < 8; offset++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    if (!s.activeDays.includes(day.getDay())) continue;
    const times = [...(day.getDay() === 0 || day.getDay() === 6 ? s.weekend : s.weekday)].sort();
    if (!times.length) continue;

    const todayOv = ov && ov.date === dateKey(day) ? ov : undefined;
    const deadline = new Date(atTime(day, todayOv?.arrivalTime ?? s.arrivalTime).getTime() - s.arriveEarlyMin * MIN);

    const options: Option[] = times.map((t) => {
      const dep = atTime(day, t);
      const arr = new Date(dep.getTime() + s.rideMin * MIN);
      return { dep, arr, onTime: arr <= deadline, leaveAt: new Date(dep.getTime() - (walkMin + s.bufferMin) * MIN) };
    });

    const chosen =
      options.find((o) => todayOv?.dep && hm(o.dep) === todayOv.dep) ??
      [...options].reverse().find((o) => o.onTime);
    if (!chosen) continue;

    // Can't make it even with zero buffer → treat as gone.
    if (chosen.dep.getTime() - walkMin * MIN < now.getTime()) {
      if (offset === 0 && deadline > now) missedEarlier = true;
      continue;
    }

    const minsLeft = (chosen.leaveAt.getTime() - now.getTime()) / MIN;
    return {
      day, isToday: offset === 0, deadline, walkMin, options, chosen, missedEarlier,
      status: minsLeft > 10 ? 'ok' : minsLeft > 3 ? 'soon' : 'now',
    };
  }
  return null;
}
