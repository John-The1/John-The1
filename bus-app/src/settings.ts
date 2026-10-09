import type { Settings } from './types';

export const DEFAULTS: Settings = {
  homeAddress: 'Møllegade 14L, Dragør',
  destinationName: 'Cirklen, Dragør',
  lineFilter: '35',
  arrivalDate: '',
  arrivalTime: '08:30',
  walkSpeedKmh: 4.8,
  bufferMin: 5,
  arriveEarlyMin: 5,
  refreshSec: 30,
  demoMode: false,
  accessId: '',
};

const KEY = 'leave-home-settings';

export function loadSettings(): Settings {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') };
  } catch {
    return DEFAULTS;
  }
}

export function saveSettings(s: Settings) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ }
}
