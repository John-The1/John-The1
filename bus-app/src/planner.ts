import { walk } from './geo';
import type { Candidate, Coord, Journey, Plan, Settings } from './types';

const MIN = 60_000;

/** Latest acceptable arrival: required time minus "arrive early" margin. */
export function targetTime(s: Settings, now: Date): Date {
  const date = s.arrivalDate || localDate(now);
  const t = new Date(`${date}T${s.arrivalTime}:00`);
  return new Date(t.getTime() - s.arriveEarlyMin * MIN);
}

export function localDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * Pure planning logic: given journeys and the home location, choose the best bus.
 * Best = the latest-departing bus that arrives in time and that I can still catch.
 */
export function buildPlan(
  journeys: Journey[],
  home: Coord,
  s: Settings,
  now: Date,
  source: Plan['source'],
): Plan {
  const target = targetTime(s, now);
  const warnings: string[] = [];

  const all: Candidate[] = journeys.map((j) => {
    const w = walk(home, j.fromStop, s.walkSpeedKmh);
    return {
      ...j,
      walkMin: w.minutes,
      walkMeters: w.meters,
      leaveAt: new Date(j.realDep.getTime() - (w.minutes + s.bufferMin) * MIN),
      delayMin: Math.round((j.realDep.getTime() - j.plannedDep.getTime()) / MIN),
      arrivesInTime: j.realArr.getTime() <= target.getTime(),
    };
  });

  const cancelled = all.filter((c) => c.cancelled && c.arrivesInTime);
  const usable = all.filter((c) => !c.cancelled && c.arrivesInTime);
  const byLeave = (a: Candidate, b: Candidate) => a.leaveAt.getTime() - b.leaveAt.getTime();

  // Still possible to catch if I walk without the safety buffer.
  const catchable = usable.filter((c) => c.realDep.getTime() - c.walkMin * MIN >= now.getTime());
  const comfortable = catchable.filter((c) => c.leaveAt.getTime() >= now.getTime());

  let best: Candidate | undefined;
  let status: Plan['status'] = 'none';

  if (comfortable.length) {
    best = comfortable.sort(byLeave).at(-1)!; // latest departure that still works
    const minsLeft = (best.leaveAt.getTime() - now.getTime()) / MIN;
    status = minsLeft <= 2 ? 'hurry' : 'ok';
  } else if (catchable.length) {
    best = catchable.sort(byLeave).at(-1)!;
    status = 'late';
    warnings.push('You are already past your leave time – your safety buffer is used up. Walk briskly!');
  } else if (usable.length) {
    best = usable.sort(byLeave).at(-1)!;
    status = 'missed';
    warnings.push('You are about to miss / have missed the last bus that arrives in time.');
  } else {
    warnings.push('No bus found that arrives before your deadline.');
  }

  for (const c of cancelled) {
    warnings.push(`Line ${c.line} at ${hm(c.plannedDep)} is CANCELLED.`);
  }
  if (best) {
    if (best.delayMin >= 3) warnings.push(`Line ${best.line} is running ${best.delayMin} min late – leave time already accounts for it.`);
    if (best.delayMin <= -1) warnings.push(`Line ${best.line} is running ${-best.delayMin} min EARLY.`);
    if (!best.realtime) warnings.push('No live data for this bus – using the scheduled time.');
    const slack = (target.getTime() - best.realArr.getTime()) / MIN;
    if (slack < 2 && status !== 'missed') warnings.push('Tight connection: you arrive with almost no margin.');
  }

  const others = usable
    .filter((c) => c !== best && c.realDep.getTime() - c.walkMin * MIN >= now.getTime() - 5 * MIN)
    .sort(byLeave)
    .slice(-4);

  return { status, best, others, warnings, target, source, fetchedAt: now };
}

export function hm(d: Date): string {
  return d.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' });
}
