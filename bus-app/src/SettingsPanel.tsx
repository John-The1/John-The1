import type { Settings } from './types';

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block text-sm">
      <span className="text-zinc-400">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-zinc-500">{hint}</span>}
    </label>
  );
}

const input = 'mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-sky-500';

export default function SettingsPanel({ settings: s, onChange, envKey }: { settings: Settings; onChange: (s: Settings) => void; envKey: boolean }) {
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => onChange({ ...s, [k]: v });
  const num = (k: 'walkSpeedKmh' | 'bufferMin' | 'arriveEarlyMin' | 'refreshSec') => (e: React.ChangeEvent<HTMLInputElement>) => set(k, Number(e.target.value));

  return (
    <div className="mb-6 grid gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:grid-cols-2">
      <Field label="Starting address"><input className={input} value={s.homeAddress} onChange={(e) => set('homeAddress', e.target.value)} /></Field>
      <Field label="Destination stop" hint='Format: "Stop name, Town"'><input className={input} value={s.destinationName} onChange={(e) => set('destinationName', e.target.value)} /></Field>
      <Field label="Required arrival time"><input type="time" className={input} value={s.arrivalTime} onChange={(e) => set('arrivalTime', e.target.value)} /></Field>
      <Field label="Arrival date" hint="Leave empty for today"><input type="date" className={input} value={s.arrivalDate} onChange={(e) => set('arrivalDate', e.target.value)} /></Field>
      <Field label="Walking speed (km/h)"><input type="number" step="0.1" min="2" max="8" className={input} value={s.walkSpeedKmh} onChange={num('walkSpeedKmh')} /></Field>
      <Field label="Safety buffer (min)"><input type="number" min="0" max="30" className={input} value={s.bufferMin} onChange={num('bufferMin')} /></Field>
      <Field label="Arrive this many min early"><input type="number" min="0" max="60" className={input} value={s.arriveEarlyMin} onChange={num('arriveEarlyMin')} /></Field>
      <Field label={`Auto-refresh: ${s.refreshSec} s`}>
        <input type="range" min="30" max="60" step="5" className="mt-3 w-full" value={s.refreshSec} onChange={num('refreshSec')} />
      </Field>
      <Field label="Rejseplanen accessId" hint={envKey ? '✓ A key is set in .env – leave blank to use it.' : 'Or put REJSEPLANEN_ACCESS_ID in .env and restart.'}>
        <input type="password" className={input} value={s.accessId} onChange={(e) => set('accessId', e.target.value)} placeholder="optional override" />
      </Field>
      <label className="flex items-center gap-3 self-end text-sm">
        <input type="checkbox" className="h-5 w-5" checked={s.demoMode} onChange={(e) => set('demoMode', e.target.checked)} />
        Demo mode (simulated data, no API needed)
      </label>
    </div>
  );
}
