import type { Coord } from './types';

export function distanceMeters(a: Coord, b: Coord): number {
  const R = 6371000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Straight-line distance underestimates real streets; 1.3 is a common detour factor.
const DETOUR = 1.3;

export function walk(from: Coord, to: Coord, speedKmh: number) {
  const meters = Math.round(distanceMeters(from, to) * DETOUR);
  const minutes = Math.max(1, Math.ceil(meters / ((speedKmh * 1000) / 60)));
  return { meters, minutes };
}
