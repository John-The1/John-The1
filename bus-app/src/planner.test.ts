import { describe, expect, it } from 'vitest';
import { DEFAULTS } from './settings';
import { buildPlan } from './planner';
import type { Journey, Stop } from './types';

const home = { lat: 55.5935, lon: 12.6745 };
const stop: Stop = { id: '1', name: 'Test', lat: 55.5935, lon: 12.6745 + 0.0035 }; // ~220 m
const at = (hhmm: string) => new Date(`2026-10-08T${hhmm}:00`);
const j = (dep: string, arr: string, o: Partial<Journey> = {}): Journey => ({
  line: '35', direction: 'X', fromStop: stop, plannedDep: at(dep), realDep: at(dep),
  plannedArr: at(arr), realArr: at(arr), realtime: true, cancelled: false, ...o,
});
const s = { ...DEFAULTS, arrivalDate: '2026-10-08', arrivalTime: '08:30', arriveEarlyMin: 0, bufferMin: 5 };

describe('buildPlan', () => {
  it('picks the latest bus that arrives in time', () => {
    const p = buildPlan([j('07:50', '08:00'), j('08:10', '08:20'), j('08:25', '08:35')], home, s, at('07:00'), 'live');
    expect(p.best?.plannedDep).toEqual(at('08:10'));
    expect(p.status).toBe('ok');
    expect(p.best!.leaveAt.getTime()).toBeLessThan(at('08:10').getTime());
  });
  it('skips cancelled buses and warns', () => {
    const p = buildPlan([j('07:50', '08:00'), j('08:10', '08:20', { cancelled: true })], home, s, at('07:00'), 'live');
    expect(p.best?.plannedDep).toEqual(at('07:50'));
    expect(p.warnings.join()).toMatch(/CANCELLED/);
  });
  it('uses delayed departure for leave time', () => {
    const p = buildPlan([j('08:10', '08:20', { realDep: at('08:14'), realArr: at('08:24') })], home, s, at('07:00'), 'live');
    expect(p.best?.delayMin).toBe(4);
  });
  it('reports missed when nothing catchable', () => {
    const p = buildPlan([j('08:10', '08:20')], home, s, at('08:09'), 'live');
    expect(p.status).toBe('missed');
  });
});
