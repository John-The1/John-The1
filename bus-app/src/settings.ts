import type { Override, Settings } from './types';

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
  weekday: [],
  weekend: [],
  notify: false,
};

const KEY = 'leave-home-v2';
const OV = 'leave-home-v2-override';

export function loadSettings(): Settings {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }; } catch { return DEFAULTS; }
}
export function saveSettings(s: Settings) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage unavailable */ }
}
export function loadOverride(): Override | undefined {
  try { return JSON.parse(localStorage.getItem(OV) ?? 'null') ?? undefined; } catch { return undefined; }
}
export function saveOverride(o?: Override) {
  try { o ? localStorage.setItem(OV, JSON.stringify(o)) : localStorage.removeItem(OV); } catch { /* ignore */ }
}
