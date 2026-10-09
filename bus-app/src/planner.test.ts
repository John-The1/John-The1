import { describe, expect, it } from 'vitest';
import { computePlan, walkMinutes } from './planner';
import { DEFAULTS } from './settings';

const s = { ...DEFAULTS, weekend: [], weekday: ['07:10', '07:30', '07:50', '08:10'], arrivalTime: '08:10', rideMin: 10, walkMeters: 400, walkSpeedKmh: 4.8, bufferMin: 5, arriveEarlyMin: 0 };
const thu = (hhmm: string) => new Date(`2026-10-08T${hhmm}:00`); // Thursday
const hm = (d: Date) => d.toTimeString().slice(0, 5);

describe('computePlan', () => {
  it('walk time rounds up from distance and speed', () => expect(walkMinutes(s)).toBe(5));
  it('picks the latest bus arriving in time and subtracts walk + buffer', () => {
    const p = computePlan(s, undefined, thu('06:00'))!;
    expect(hm(p.chosen.dep)).toBe('07:50'); // arrives 08:00; 08:10 would arrive 08:20
    expect(hm(p.chosen.leaveAt)).toBe('07:40');
    expect(p.status).toBe('ok');
  });
  it('flags soon / now', () => {
    expect(computePlan(s, undefined, thu('07:33'))!.status).toBe('soon');
    expect(computePlan(s, undefined, thu('07:39'))!.status).toBe('now');
  });
  it('rolls over to the next active day once the bus is out of reach', () => {
    const p = computePlan(s, undefined, thu('07:48'))!;
    expect(p.isToday).toBe(false);
    expect(p.missedEarlier).toBe(true);
    expect(p.day.getDay()).toBe(5);
  });
  it('skips weekends', () => {
    const p = computePlan(s, undefined, new Date('2026-10-09T09:00:00'))!; // Fri after deadline
    expect(p.day.getDay()).toBe(1);
  });
  it('honours a one-day arrival override and bus choice', () => {
    const p = computePlan(s, { date: '2026-10-08', arrivalTime: '07:45' }, thu('06:00'))!;
    expect(hm(p.chosen.dep)).toBe('07:30');
    const q = computePlan(s, { date: '2026-10-08', dep: '07:10' }, thu('06:00'))!;
    expect(hm(q.chosen.dep)).toBe('07:10');
  });
  it('returns null with no timetable', () => expect(computePlan({ ...s, weekday: [] }, undefined, thu('06:00'))).toBeNull());
});
