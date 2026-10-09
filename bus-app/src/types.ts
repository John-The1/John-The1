export interface Settings {
  homeAddress: string;
  destinationName: string;
  line: string; // label only, e.g. "35"
  stopName: string; // the stop you walk to
  arrivalTime: string; // usual "be there by" time, HH:MM
  activeDays: number[]; // 0 = Sunday … 6 = Saturday
  walkMeters: number; // walking distance to the stop
  walkSpeedKmh: number;
  bufferMin: number; // safety buffer
  arriveEarlyMin: number; // how early you want to arrive
  rideMin: number; // minutes on the bus
  weekday: string[]; // departure times Mon–Fri, HH:MM
  weekend: string[]; // departure times Sat–Sun
  notify: boolean;
  direction: string; // label, e.g. "Lufthavnen"
  sample: boolean; // true while the built-in demo timetable is in use
}

/** Tweaks for a single date; they expire once the date has passed. */
export interface DayOverride {
  arrivalTime?: string;
  dep?: string; // chosen departure HH:MM
}
export type Overrides = Record<string, DayOverride>; // keyed by YYYY-MM-DD

export interface Option {
  dep: Date;
  arr: Date;
  onTime: boolean;
  leaveAt: Date;
}

export type Status = 'ok' | 'soon' | 'now';

export interface Plan {
  day: Date;
  isToday: boolean;
  deadline: Date;
  walkMin: number;
  options: Option[];
  chosen: Option;
  status: Status;
  missedEarlier: boolean; // today's bus has already gone, showing the next day
  gone: boolean; // the chosen bus can no longer be caught (only when a past day/time is picked)
}
