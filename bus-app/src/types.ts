export interface Settings {
  homeAddress: string;
  destinationName: string;
  arrivalDate: string; // YYYY-MM-DD ('' = today)
  arrivalTime: string; // HH:MM
  walkSpeedKmh: number;
  bufferMin: number; // safety buffer before the bus leaves
  arriveEarlyMin: number; // how long before the required time I want to be there
  refreshSec: number; // 30–60
  demoMode: boolean;
  accessId: string; // optional; overrides REJSEPLANEN_ACCESS_ID from .env
}

export interface Coord { lat: number; lon: number }
export interface Stop extends Coord { id: string; name: string }

/** One bus journey, normalised from Rejseplanen (or the demo generator). */
export interface Journey {
  line: string;
  direction: string;
  fromStop: Stop;
  plannedDep: Date;
  realDep: Date; // equals plannedDep when no realtime data
  plannedArr: Date;
  realArr: Date;
  realtime: boolean; // true if Rejseplanen supplied realtime times
  cancelled: boolean;
}

export interface Candidate extends Journey {
  walkMin: number;
  walkMeters: number;
  leaveAt: Date; // realDep - walk - buffer
  delayMin: number;
  arrivesInTime: boolean;
}

export type Status = 'ok' | 'hurry' | 'late' | 'missed' | 'none';

export interface Plan {
  status: Status;
  best?: Candidate;
  others: Candidate[]; // other options, soonest first
  warnings: string[];
  target: Date; // latest acceptable arrival
  source: 'live' | 'demo';
  fetchedAt: Date;
}
