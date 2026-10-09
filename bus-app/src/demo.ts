import type { Coord, Journey, Settings, Stop } from './types';

/** Realistic simulated data for when no API key is available. Not real schedules. */
export const DEMO_HOME: Coord = { lat: 55.5929, lon: 12.6742 };
const stop: Stop = { id: 'demo', name: 'Dragør Rådhus (demo)', lat: 55.5944, lon: 12.6761 };

export function demoJourneys(arriveBy: Date): Journey[] {
  const MIN = 60_000;
  const out: Journey[] = [];
  // A bus every 10 minutes ending around the deadline; deterministic "delays".
  for (let i = 0; i < 9; i++) {
    const arr = new Date(arriveBy.getTime() + (3 - i) * 10 * MIN - 4 * MIN);
    const dep = new Date(arr.getTime() - 9 * MIN);
    const delay = [0, 2, 0, 4, 0, 1, 0, 0, 3][i];
    out.push({
      line: '35',
      direction: 'Cirklen',
      fromStop: stop,
      plannedDep: dep,
      realDep: new Date(dep.getTime() + delay * MIN),
      plannedArr: arr,
      realArr: new Date(arr.getTime() + delay * MIN),
      realtime: i !== 6,
      cancelled: i === 4,
    });
  }
  return out;
}

export const isDemo = (s: Settings) => s.demoMode;
