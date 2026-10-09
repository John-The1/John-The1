import type { Overrides, Settings } from './types';

/** Demo timetable – plausible but NOT the real line 35 schedule. */
function every(from: string, to: string, step: number): string[] {
  const m = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
  const out: string[] = [];
  for (let x = m(from); x <= m(to); x += step) out.push(`${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`);
  return out;
}
export const SAMPLE_WEEKDAY = [...every('05:12', '08:57', 15), ...every('09:17', '15:57', 20), ...every('16:12', '18:57', 15), ...every('19:27', '23:57', 30)];
export const SAMPLE_WEEKEND = every('06:27', '23:57', 30);

export const DEFAULTS: Settings = {
  homeAddress: 'Møllegade 14L, Dragør',
  destinationName: 'Cirklen, Dragør',
  line: '35',
  stopName: '',
  arrivalTime: '08:00',
  activeDays: [1, 2, 3, 4, 5],
  walkMeters: 300, // estimate – adjust to your real walk
  walkSpeedKmh: 4.8,
  bufferMin: 5,
  arriveEarlyMin: 0,
  rideMin: 10, // estimate – adjust to the real ride time
  weekday: SAMPLE_WEEKDAY,
  weekend: SAMPLE_WEEKEND,
  notify: false,
  direction: 'Lufthavnen',
  sample: true,
};

const KEY = 'leave-home-v3';
const OV = 'leave-home-v3-overrides';

export function loadSettings(): Settings {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }; } catch { return DEFAULTS; }
}
export function saveSettings(s: Settings) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage unavailable */ }
}
export function loadOverrides(): Overrides {
  try { return JSON.parse(localStorage.getItem(OV) ?? '{}') ?? {}; } catch { return {}; }
}
export function saveOverrides(o: Overrides) {
  try { localStorage.setItem(OV, JSON.stringify(o)); } catch { /* ignore */ }
}
