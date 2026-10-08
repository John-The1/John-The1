/**
 * Rejseplanen API 2.0 client (HAFAS ReST). Docs/keys: https://labs.rejseplanen.dk/
 * Requests go through the Vite dev proxy (/proxy/rejseplanen -> https://www.rejseplanen.dk/api),
 * which adds the accessId from .env. Endpoints used:
 *   location.name, location.nearbystops, trip
 * Addresses are geocoded with DAWA (free, no key, Danish official address API).
 */
import { distanceMeters } from './geo';
import type { Coord, Journey, Settings, Stop } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */

async function rp(path: string, params: Record<string, string | number>, s: Settings): Promise<any> {
  const q = new URLSearchParams({ format: 'json', ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])) });
  if (s.accessId.trim()) q.set('accessId', s.accessId.trim());
  const res = await fetch(`/proxy/rejseplanen/${path}?${q}`);
  const text = await res.text();
  let json: any;
  try { json = JSON.parse(text); } catch { throw new Error(`Rejseplanen returned HTTP ${res.status} (not JSON). ${text.slice(0, 120)}`); }
  if (!res.ok || json.errorCode) {
    throw new Error(`Rejseplanen: ${json.errorText ?? json.errorCode ?? res.status}${res.status === 401 || res.status === 403 ? ' – check your accessId' : ''}`);
  }
  return json;
}

export async function hasEnvKey(): Promise<boolean> {
  try { return (await (await fetch('/proxy/config')).json()).hasEnvKey === true; } catch { return false; }
}

const toStop = (l: any): Stop => ({ id: l.extId ?? l.id, name: l.name, lat: Number(l.lat), lon: Number(l.lon) });
const stopsOf = (json: any): Stop[] =>
  (json.stopLocationOrCoordLocation ?? []).map((x: any) => x.StopLocation).filter(Boolean).map(toStop);

const geocodeCache = new Map<string, Coord>();
export async function geocode(address: string): Promise<Coord> {
  const hit = geocodeCache.get(address);
  if (hit) return hit;
  const res = await fetch(`/proxy/dawa/datavask/adresser?betegnelse=${encodeURIComponent(address)}`);
  if (!res.ok) throw new Error(`Address lookup failed (HTTP ${res.status})`);
  const a = (await res.json()).resultater?.[0]?.adresse;
  if (!a) throw new Error(`Could not find the address "${address}"`);
  const r = await fetch(`/proxy/dawa/adresser/${a.id}?struktur=mini`);
  const m = await r.json();
  const c = { lat: Number(m.y), lon: Number(m.x) };
  geocodeCache.set(address, c);
  return c;
}

const stopCache = new Map<string, Stop>();
export async function findStop(name: string, s: Settings): Promise<Stop> {
  const hit = stopCache.get(name);
  if (hit) return hit;
  const stops = stopsOf(await rp('location.name', { input: name }, s));
  if (!stops.length) throw new Error(`No Rejseplanen stop found for "${name}"`);
  const town = name.split(',')[1]?.trim().toLowerCase();
  const stop = (town && stops.find((x) => x.name.toLowerCase().includes(town))) || stops[0];
  stopCache.set(name, stop);
  return stop;
}

export async function nearbyStops(c: Coord, s: Settings): Promise<Stop[]> {
  const json = await rp('location.nearbystops', { originCoordLat: c.lat, originCoordLong: c.lon, r: 1200, maxNo: 5 }, s);
  return stopsOf(json).sort((a, b) => distanceMeters(c, a) - distanceMeters(c, b));
}

const parseDT = (date?: string, time?: string): Date | undefined =>
  date && time ? new Date(`${date}T${time.length === 5 ? time + ':00' : time}`) : undefined;

function lineName(leg: any): string {
  const p = Array.isArray(leg.Product) ? leg.Product[0] : leg.Product;
  const raw: string = p?.line ?? p?.num ?? p?.name ?? leg.name ?? '?';
  return raw.replace(/^(Bus|Metro|Tog|Letbane)\s+/i, '').trim();
}

/** Bus journeys from `from` to `dest` arriving around `arriveBy`, as normalised Journeys. */
export async function fetchJourneys(from: Stop, dest: Stop, arriveBy: Date, s: Settings): Promise<Journey[]> {
  const p = (n: number) => String(n).padStart(2, '0');
  const json = await rp('trip', {
    originId: from.id,
    destId: dest.id,
    date: `${arriveBy.getFullYear()}-${p(arriveBy.getMonth() + 1)}-${p(arriveBy.getDate())}`,
    time: `${p(arriveBy.getHours())}:${p(arriveBy.getMinutes())}`,
    searchForArrival: 1,
    numB: 6,
    numF: 2,
  }, s);

  const out: Journey[] = [];
  for (const t of json.Trip ?? []) {
    const legs: any[] = [].concat(t.LegList?.Leg ?? []);
    const jny = legs.filter((l) => l.type === 'JNY' || l.Product);
    if (!jny.length) continue;
    const first = jny[0];
    const last = jny[jny.length - 1];
    const plannedDep = parseDT(first.Origin.date, first.Origin.time);
    const plannedArr = parseDT(last.Destination.date, last.Destination.time);
    if (!plannedDep || !plannedArr) continue;
    const realDep = parseDT(first.Origin.rtDate ?? first.Origin.date, first.Origin.rtTime);
    const realArr = parseDT(last.Destination.rtDate ?? last.Destination.date, last.Destination.rtTime);
    out.push({
      line: jny.map(lineName).join(' → '),
      direction: first.direction ?? '',
      fromStop: from,
      plannedDep,
      realDep: realDep ?? plannedDep,
      plannedArr,
      realArr: realArr ?? realDep ?? plannedArr,
      realtime: Boolean(realDep || realArr),
      cancelled: Boolean(t.cancelled || legs.some((l) => l.cancelled || l.Origin?.cancelled)),
    });
  }
  return out;
}

/** Full live pipeline: geocode home, find nearby stops, query trips from each, merge. */
export async function fetchLive(s: Settings, arriveBy: Date): Promise<{ home: Coord; journeys: Journey[] }> {
  const [home, dest] = await Promise.all([geocode(s.homeAddress), findStop(s.destinationName, s)]);
  const near = (await nearbyStops(home, s)).filter((x) => x.id !== dest.id).slice(0, 3);
  if (!near.length) throw new Error('No bus stops found near your home address');
  const lists = await Promise.all(near.map((st) => fetchJourneys(st, dest, arriveBy, s)));
  return { home, journeys: lists.flat() };
}
