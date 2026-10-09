import { useState } from 'react';
import { walkMinutes } from './planner';
import type { Settings } from './types';

const input = 'h-12 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-base text-zinc-100 outline-none focus:border-sky-500';
const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4"><h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">{title}</h3>{children}</section>;
}
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <div className="text-sm"><div className="mb-1.5 text-zinc-400">{label}</div>{children}{hint && <div className="mt-1 text-xs text-zinc-500">{hint}</div>}</div>;
}
function Stepper({ value, onChange, step = 1, min, max, unit }: { value: number; onChange: (n: number) => void; step?: number; min: number; max: number; unit: string }) {
  const clamp = (n: number) => Math.min(max, Math.max(min, Math.round(n * 10) / 10));
  const btn = 'h-12 w-14 rounded-xl border border-zinc-700 bg-zinc-800 text-2xl active:bg-zinc-700';
  return (
    <div className="flex items-center gap-2">
      <button type="button" aria-label="decrease" className={btn} onClick={() => onChange(clamp(value - step))}>−</button>
      <div className="flex-1 text-center text-lg font-semibold tabular-nums">{value} <span className="text-sm font-normal text-zinc-500">{unit}</span></div>
      <button type="button" aria-label="increase" className={btn} onClick={() => onChange(clamp(value + step))}>+</button>
    </div>
  );
}

function Timetable({ s, onChange }: { s: Settings; onChange: (s: Settings) => void }) {
  const [tab, setTab] = useState<'weekday' | 'weekend'>('weekday');
  const [time, setTime] = useState('');
  const [gen, setGen] = useState({ from: '06:00', to: '09:00', every: 20 });
  const list = s[tab];
  const setList = (l: string[]) => onChange({ ...s, [tab]: [...new Set(l)].sort() });

  const generate = () => {
    const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
    const out: string[] = [];
    for (let m = toMin(gen.from); m <= toMin(gen.to) && gen.every > 0; m += gen.every) out.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
    setList(out);
  };

  return (
    <Section title={`Line ${s.line} departure times from your stop`}>
      <div className="grid grid-cols-2 gap-2">
        {(['weekday', 'weekend'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`h-11 rounded-xl border text-sm font-medium ${tab === t ? 'border-sky-500 bg-sky-500/10' : 'border-zinc-700'}`}>
            {t === 'weekday' ? 'Mon–Fri' : 'Sat–Sun'} ({s[t].length})
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {list.map((t) => (
          <button key={t} onClick={() => setList(list.filter((x) => x !== t))} className="h-10 rounded-full bg-zinc-800 px-3 text-sm tabular-nums active:bg-red-900" aria-label={`remove ${t}`}>{t} ✕</button>
        ))}
        {!list.length && <p className="text-sm text-zinc-500">No times yet.</p>}
      </div>
      <div className="flex gap-2">
        <input type="time" className={input} value={time} onChange={(e) => setTime(e.target.value)} />
        <button onClick={() => { if (time) { setList([...list, time]); setTime(''); } }} className="h-12 rounded-xl bg-sky-600 px-5 font-medium active:bg-sky-700">Add</button>
      </div>
      <details className="rounded-xl border border-zinc-800 p-3 text-sm">
        <summary className="cursor-pointer text-zinc-400">Buses run at a regular interval? Generate</summary>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Field label="First"><input type="time" className={input} value={gen.from} onChange={(e) => setGen({ ...gen, from: e.target.value })} /></Field>
          <Field label="Last"><input type="time" className={input} value={gen.to} onChange={(e) => setGen({ ...gen, to: e.target.value })} /></Field>
          <Field label="Every (min)"><input type="number" inputMode="numeric" className={input} value={gen.every} onChange={(e) => setGen({ ...gen, every: Number(e.target.value) })} /></Field>
        </div>
        <button onClick={generate} className="mt-3 h-11 w-full rounded-xl border border-zinc-700 active:bg-zinc-800">Replace list with these times</button>
      </details>
    </Section>
  );
}

export default function SettingsPanel({ settings: s, onChange, onClose }: { settings: Settings; onChange: (s: Settings) => void; onClose: () => void }) {
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => onChange({ ...s, [k]: v });
  const toggleDay = (d: number) => set('activeDays', s.activeDays.includes(d) ? s.activeDays.filter((x) => x !== d) : [...s.activeDays, d]);

  const toggleNotify = async () => {
    if (!s.notify && 'Notification' in window && Notification.permission !== 'granted') await Notification.requestPermission();
    set('notify', !s.notify);
  };

  return (
    <div className="fixed inset-0 z-20 flex flex-col bg-zinc-950">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <h2 className="text-lg font-semibold">Settings</h2>
        <button onClick={onClose} className="h-11 rounded-xl bg-sky-600 px-5 font-medium active:bg-sky-700">Done</button>
      </div>
      <div className="mx-auto w-full max-w-xl flex-1 space-y-4 overflow-y-auto px-4 py-5 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <Timetable s={s} onChange={onChange} />

        <Section title="Your routine">
          <Field label="Be at destination by"><input type="time" className={input} value={s.arrivalTime} onChange={(e) => set('arrivalTime', e.target.value)} /></Field>
          <Field label="Commute days">
            <div className="grid grid-cols-7 gap-1.5">
              {DAYS.map((d, i) => (
                <button key={i} onClick={() => toggleDay(i)} className={`h-12 rounded-xl border font-medium ${s.activeDays.includes(i) ? 'border-sky-500 bg-sky-500/15' : 'border-zinc-700 text-zinc-500'}`}>{d}</button>
              ))}
            </div>
          </Field>
          <Field label="Arrive this early"><Stepper value={s.arriveEarlyMin} min={0} max={60} unit="min" onChange={(n) => set('arriveEarlyMin', n)} /></Field>
        </Section>

        <Section title="Walking & ride">
          <Field label="Distance to your bus stop"><Stepper value={s.walkMeters} step={25} min={25} max={2000} unit="m" onChange={(n) => set('walkMeters', n)} /></Field>
          <Field label="Walking speed" hint={`= ${walkMinutes(s)} min walk`}><Stepper value={s.walkSpeedKmh} step={0.2} min={2} max={8} unit="km/h" onChange={(n) => set('walkSpeedKmh', n)} /></Field>
          <Field label="Safety buffer"><Stepper value={s.bufferMin} min={0} max={30} unit="min" onChange={(n) => set('bufferMin', n)} /></Field>
          <Field label="Time on the bus" hint="Departure → arrival at your destination stop"><Stepper value={s.rideMin} min={1} max={90} unit="min" onChange={(n) => set('rideMin', n)} /></Field>
        </Section>

        <Section title="Route labels">
          <Field label="Starting address"><input className={input} value={s.homeAddress} onChange={(e) => set('homeAddress', e.target.value)} /></Field>
          <Field label="Destination"><input className={input} value={s.destinationName} onChange={(e) => set('destinationName', e.target.value)} /></Field>
          <Field label="Bus line"><input className={input} value={s.line} onChange={(e) => set('line', e.target.value)} /></Field>
        </Section>

        <button onClick={toggleNotify} className="flex h-14 w-full items-center justify-between rounded-xl border border-zinc-700 px-4 text-left">
          <span>Alerts <span className="text-sm text-zinc-500">(10 min before & at leave time, while app is open)</span></span>
          <span className={`flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition ${s.notify ? 'bg-sky-600' : 'bg-zinc-700'}`}>
            <span className={`h-5 w-5 rounded-full bg-white transition ${s.notify ? 'translate-x-5' : ''}`} />
          </span>
        </button>
      </div>
    </div>
  );
}
