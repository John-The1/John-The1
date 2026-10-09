import type { Settings } from './types';

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="text-sm">
      <div className="mb-1.5 text-zinc-400">{label}</div>
      {children}
      {hint && <div className="mt-1 text-xs text-zinc-500">{hint}</div>}
    </div>
  );
}

// text-base (16px) stops iOS Safari from zooming into focused inputs.
const input = 'h-12 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-base text-zinc-100 outline-none focus:border-sky-500';

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

export default function SettingsPanel({ settings: s, onChange, onClose, envKey }: { settings: Settings; onChange: (s: Settings) => void; onClose: () => void; envKey: boolean }) {
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => onChange({ ...s, [k]: v });

  return (
    <div className="fixed inset-0 z-20 flex flex-col bg-zinc-950">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <h2 className="text-lg font-semibold">Settings</h2>
        <button onClick={onClose} className="h-11 rounded-xl bg-sky-600 px-5 font-medium active:bg-sky-700">Done</button>
      </div>
      <div className="mx-auto w-full max-w-xl flex-1 space-y-5 overflow-y-auto px-4 py-5 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <Field label="Starting address"><input className={input} value={s.homeAddress} onChange={(e) => set('homeAddress', e.target.value)} autoComplete="street-address" /></Field>
        <Field label="Destination stop" hint='Format: "Stop name, Town"'><input className={input} value={s.destinationName} onChange={(e) => set('destinationName', e.target.value)} /></Field>
        <Field label="Bus line" hint="Only this line is used. Empty = any line.">
          <input className={input} inputMode="text" value={s.lineFilter} onChange={(e) => set('lineFilter', e.target.value)} placeholder="35" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Arrive by"><input type="time" className={input} value={s.arrivalTime} onChange={(e) => set('arrivalTime', e.target.value)} /></Field>
          <Field label="Date (empty = today)"><input type="date" className={input} value={s.arrivalDate} onChange={(e) => set('arrivalDate', e.target.value)} /></Field>
        </div>
        <Field label="Walking speed"><Stepper value={s.walkSpeedKmh} step={0.2} min={2} max={8} unit="km/h" onChange={(n) => set('walkSpeedKmh', n)} /></Field>
        <Field label="Safety buffer"><Stepper value={s.bufferMin} min={0} max={30} unit="min" onChange={(n) => set('bufferMin', n)} /></Field>
        <Field label="Arrive this early"><Stepper value={s.arriveEarlyMin} min={0} max={60} unit="min" onChange={(n) => set('arriveEarlyMin', n)} /></Field>
        <Field label="Auto-refresh"><Stepper value={s.refreshSec} step={5} min={30} max={60} unit="sec" onChange={(n) => set('refreshSec', n)} /></Field>
        <Field label="Rejseplanen accessId" hint={envKey ? '✓ A key is set in .env – leave blank to use it.' : 'Or put REJSEPLANEN_ACCESS_ID in .env and restart.'}>
          <input type="password" className={input} value={s.accessId} onChange={(e) => set('accessId', e.target.value)} placeholder="optional override" />
        </Field>
        <button type="button" onClick={() => set('demoMode', !s.demoMode)} className="flex h-14 w-full items-center justify-between rounded-xl border border-zinc-700 px-4 text-left">
          <span>Demo mode <span className="text-sm text-zinc-500">(simulated data)</span></span>
          <span className={`flex h-7 w-12 items-center rounded-full p-1 transition ${s.demoMode ? 'bg-violet-600' : 'bg-zinc-700'}`}>
            <span className={`h-5 w-5 rounded-full bg-white transition ${s.demoMode ? 'translate-x-5' : ''}`} />
          </span>
        </button>
      </div>
    </div>
  );
}
