import { useEffect, useRef } from 'react';
import { hm } from './planner';
import { dateKey } from './planner';
import type { Option, Overrides, Plan, Settings, Status } from './types';

const MIN = 60_000;

const theme: Record<Status, { text: string; stroke: string; pill: string; label: string }> = {
  ok: { text: 'text-emerald-300', stroke: '#34d399', pill: 'bg-emerald-500/15 text-emerald-300', label: 'You have time' },
  soon: { text: 'text-amber-300', stroke: '#fbbf24', pill: 'bg-amber-500/15 text-amber-300', label: 'Get ready' },
  now: { text: 'text-red-300', stroke: '#f87171', pill: 'bg-red-500/20 text-red-300', label: 'Leave now' },
};

function countdown(ms: number): string {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  return h ? `${h} h ${m} min` : `${m}:${String(s).padStart(2, '0')}`;
}

function dayLabel(d: Date, now: Date) {
  const days = Math.round((new Date(d).setHours(0, 0, 0, 0) - new Date(now).setHours(0, 0, 0, 0)) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
}

function DayStrip({ now, dayKey, autoKey, activeDays, overrides, onSelect }: { now: Date; dayKey: string; autoKey: string; activeDays: number[]; overrides: Overrides; onSelect: (k: string) => void }) {
  const days = Array.from({ length: 14 }, (_, i) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + i));
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = ref.current, el = box?.querySelector<HTMLElement>('[data-sel="true"]');
    if (box && el) box.scrollTo({ left: el.offsetLeft - box.clientWidth / 2 + el.clientWidth / 2, behavior: 'smooth' });
  }, [dayKey]);
  return (
    <div ref={ref} className="relative -mx-4 mb-4 flex snap-x gap-1.5 overflow-x-auto px-4 [scrollbar-width:none]">
      {days.map((d, i) => {
        const k = dateKey(d), sel = k === dayKey, active = activeDays.includes(d.getDay());
        return (
          <button key={k} data-sel={sel} onClick={() => onSelect(k)}
            className={`relative flex h-16 w-14 shrink-0 snap-start flex-col items-center justify-center rounded-2xl border transition active:scale-95 ${sel ? 'border-sky-400 bg-sky-500/15' : 'border-zinc-800 bg-zinc-900/60'} ${active || sel ? '' : 'opacity-40'}`}>
            <span className="text-[11px] font-medium uppercase text-zinc-400">{i === 0 ? 'Today' : d.toLocaleDateString('en-GB', { weekday: 'short' })}</span>
            <span className="text-lg font-semibold tabular-nums">{d.getDate()}</span>
            {overrides[k] && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-sky-400" />}
            {k === autoKey && !sel && <span className="absolute bottom-1 h-1 w-4 rounded-full bg-emerald-400/70" />}
          </button>
        );
      })}
    </div>
  );
}

const shiftTime = (t: string, delta: number) => {
  const [h, m] = t.split(':').map(Number);
  const v = (((h * 60 + m + delta) % 1440) + 1440) % 1440;
  return `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}`;
};

function LineBadge({ line, size = 'md' }: { line: string; size?: 'md' | 'sm' }) {
  return (
    <span className={`inline-flex items-center justify-center rounded-lg bg-yellow-400 font-bold text-zinc-950 ${size === 'md' ? 'h-9 min-w-9 px-2 text-lg' : 'h-6 min-w-6 px-1.5 text-xs'}`}>{line}</span>
  );
}

function Ring({ progress, color, pulse, children }: { progress: number; color: string; pulse: boolean; children: React.ReactNode }) {
  const r = 138, c = 2 * Math.PI * r;
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[20rem]">
      {pulse && <div className="absolute inset-6 animate-ping rounded-full opacity-10" style={{ background: color }} />}
      <svg viewBox="0 0 300 300" className="absolute inset-0 -rotate-90">
        <circle cx="150" cy="150" r={r} fill="none" stroke="#27272a" strokeWidth="8" />
        <circle cx="150" cy="150" r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - progress)}
          style={{ transition: 'stroke-dashoffset 1s linear, stroke .6s', filter: `drop-shadow(0 0 6px ${color}88)` }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

function Timeline({ settings, plan }: { settings: Settings; plan: Plan }) {
  const o = plan.chosen;
  const atStop = new Date(o.leaveAt.getTime() + plan.walkMin * MIN);
  const spare = Math.round((plan.deadline.getTime() - o.arr.getTime()) / MIN);
  const steps: { time: Date; title: React.ReactNode; sub: string; leg?: string; accent?: boolean }[] = [
    { time: o.leaveAt, title: 'Leave home', sub: settings.homeAddress.split(',')[0], leg: `🚶 ${plan.walkMin} min walk · ${settings.walkMeters} m`, accent: true },
    { time: atStop, title: `At ${settings.stopName || 'the bus stop'}`, sub: `${settings.bufferMin} min safety buffer` },
    { time: o.dep, title: <span className="inline-flex items-center gap-2"><LineBadge line={settings.line} size="sm" /> departs</span>, sub: `towards ${settings.direction}`, leg: `🚌 ${settings.rideMin} min ride` },
    { time: o.arr, title: `Arrive ${settings.destinationName.split(',')[0]}`, sub: spare > 0 ? `${spare} min before ${hm(plan.deadline)}` : `right on ${hm(plan.deadline)}` },
  ];
  return (
    <ol className="rounded-3xl border border-zinc-800/80 bg-zinc-900/50 p-5">
      {steps.map((s, i) => (
        <li key={i} className="relative flex gap-4">
          <div className="flex w-14 shrink-0 flex-col items-end">
            <span className={`text-lg font-semibold tabular-nums leading-6 ${s.accent ? 'text-white' : 'text-zinc-300'}`}>{hm(s.time)}</span>
          </div>
          <div className="relative flex flex-col items-center">
            <span className={`mt-1.5 h-3 w-3 rounded-full ring-4 ring-zinc-950 ${s.accent ? 'bg-sky-400' : i === steps.length - 1 ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
            {i < steps.length - 1 && <span className="w-px flex-1 bg-gradient-to-b from-zinc-600 to-zinc-800" />}
          </div>
          <div className={i < steps.length - 1 ? 'pb-5' : ''}>
            <div className="font-medium leading-6">{s.title}</div>
            <div className="text-sm text-zinc-500">{s.sub}</div>
            {s.leg && <div className="mt-2 inline-block rounded-full bg-zinc-800/80 px-2.5 py-1 text-xs text-zinc-300">{s.leg}</div>}
          </div>
        </li>
      ))}
    </ol>
  );
}

function BusPicker({ plan, onPick }: { plan: Plan; onPick: (o: Option) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const idx = plan.options.indexOf(plan.chosen);
  const shown = plan.options.slice(Math.max(0, idx - 4), idx + 4);

  useEffect(() => {
    // Scroll only the strip horizontally (scrollIntoView would also scroll the page).
    const box = ref.current, el = box?.querySelector<HTMLElement>('[data-sel="true"]');
    if (box && el) box.scrollTo({ left: el.offsetLeft - box.clientWidth / 2 + el.clientWidth / 2, behavior: 'smooth' });
  }, [plan.chosen.dep.getTime()]);

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between px-1">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Choose bus</span>
        <span className="text-xs text-zinc-600">swipe · tap to switch</span>
      </div>
      <div ref={ref} className="relative -mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {shown.map((o) => {
          const sel = o === plan.chosen;
          const late = Math.round((o.arr.getTime() - plan.deadline.getTime()) / MIN);
          return (
            <button key={o.dep.getTime()} data-sel={sel} onClick={() => onPick(o)}
              className={`w-24 shrink-0 snap-center rounded-2xl border p-3 text-left transition active:scale-95 ${sel ? 'border-sky-400 bg-sky-500/15 shadow-lg shadow-sky-500/10' : 'border-zinc-800 bg-zinc-900/60'}`}>
              <div className="text-lg font-semibold tabular-nums">{hm(o.dep)}</div>
              <div className="text-[11px] text-zinc-500">leave {hm(o.leaveAt)}</div>
              <div className={`mt-1.5 text-[11px] font-medium ${o.onTime ? 'text-emerald-400' : 'text-red-400'}`}>{o.onTime ? 'on time' : `${late} min late`}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface Props {
  settings: Settings; plan: Plan | null; now: Date;
  dayKey: string; autoKey: string; picked: boolean; overrides: Overrides; arrival: string;
  onSelectDay: (k: string) => void; onPatch: (p: { arrivalTime?: string; dep?: string }) => void; onReset: () => void;
  onOpenSettings: () => void; onOpenTime: () => void;
}

export default function Dashboard({ settings, plan, now, dayKey, autoKey, picked, overrides, arrival, onSelectDay, onPatch, onReset, onOpenSettings, onOpenTime }: Props) {
  const empty = !settings.weekday.length && !settings.weekend.length;
  const override = overrides[dayKey];

  return (
    <div className="mx-auto min-h-screen max-w-xl px-4 pb-32 pt-[max(1rem,env(safe-area-inset-top))]">
      <header className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LineBadge line={settings.line} />
          <div className="leading-tight">
            <div className="font-semibold">mod {settings.direction}</div>
            <div className="text-xs text-zinc-500">{settings.homeAddress.split(',')[0]} → {settings.destinationName.split(',')[0]}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {settings.sample && <button onClick={onOpenSettings} className="rounded-full bg-violet-500/15 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-violet-300">DEMO DATA</button>}
          <button onClick={onOpenSettings} aria-label="Settings" className="grid h-11 w-11 place-items-center rounded-xl border border-zinc-800 bg-zinc-900 text-lg active:bg-zinc-800">⚙</button>
        </div>
      </header>

      <DayStrip now={now} dayKey={dayKey} autoKey={autoKey} activeDays={settings.activeDays} overrides={overrides} onSelect={onSelectDay} />
      {picked && (
        <button onClick={() => onSelectDay(autoKey)} className="-mt-2 mb-3 text-xs text-sky-300 underline underline-offset-4">↩ Back to next commute</button>
      )}

      {!plan ? (
        <div className="mt-10 rounded-3xl border border-zinc-800 bg-zinc-900 p-8 text-center">
          <div className="text-5xl">🗓️</div>
          <h2 className="mt-3 text-xl font-semibold">{empty ? 'Add your bus times' : 'No upcoming commute'}</h2>
          <p className="mt-2 text-sm text-zinc-400">
            {empty ? `Enter when line ${settings.line} leaves your stop and the app does the rest.` : 'Check your commute days and bus times in Settings, and that a bus arrives before your deadline.'}
          </p>
          <button onClick={onOpenSettings} className="mt-5 h-12 rounded-xl bg-sky-600 px-6 font-medium active:bg-sky-700">Open settings</button>
        </div>
      ) : (
        <PlanView settings={settings} plan={plan} now={now} onPatch={onPatch} onReset={onReset} />
      )}

      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-zinc-800/80 bg-zinc-950/90 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-xl items-center gap-2">
          <button onClick={() => onPatch({ arrivalTime: shiftTime(arrival, -15), dep: undefined })} className="h-12 w-16 rounded-xl border border-zinc-800 bg-zinc-900 font-medium active:bg-zinc-800">−15</button>
          <button onClick={onOpenTime} className="h-12 flex-1 rounded-xl text-center leading-tight active:bg-zinc-900">
            <div className="text-[11px] uppercase tracking-wider text-zinc-500">Be there by{override?.arrivalTime ? ' · changed' : ''} ▾</div>
            <div className={`text-xl font-semibold tabular-nums ${override?.arrivalTime ? 'text-sky-300' : ''}`}>{arrival}</div>
          </button>
          <button onClick={() => onPatch({ arrivalTime: shiftTime(arrival, 15), dep: undefined })} className="h-12 w-16 rounded-xl border border-zinc-800 bg-zinc-900 font-medium active:bg-zinc-800">+15</button>
          {override && <button onClick={onReset} aria-label="Back to usual" className="h-12 w-12 rounded-xl bg-sky-600/20 text-sky-300 active:bg-sky-600/30">↺</button>}
        </div>
      </nav>
    </div>
  );
}

function PlanView({ settings, plan, now, onPatch, onReset }: Pick<Props, 'settings' | 'now' | 'onPatch' | 'onReset'> & { plan: Plan }) {
  const { chosen, status } = plan;
  const th = plan.gone ? { text: 'text-zinc-400', stroke: '#52525b', pill: 'bg-zinc-800 text-zinc-400', label: 'Bus has left' } : theme[status];
  const msLeft = chosen.leaveAt.getTime() - now.getTime();
  const progress = plan.isToday ? Math.min(1, Math.max(0, 1 - msLeft / (60 * MIN))) : 0;
  const isDefault = chosen === [...plan.options].reverse().find((o) => o.onTime);

  return (
    <div className="space-y-5">
      {!plan.chosen.onTime && !plan.gone && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">No bus gets you there by {hm(plan.deadline)} – this is the earliest one.</div>
      )}
      {plan.missedEarlier && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">Today's bus has gone – here's your next commute.</div>
      )}

      <section className="relative overflow-hidden rounded-[2rem] border border-zinc-800/80 bg-gradient-to-b from-zinc-900 to-zinc-950 px-4 pb-6 pt-5">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-72 -translate-x-1/2 rounded-full opacity-25 blur-3xl transition-colors" style={{ background: th.stroke }} />
        <div className="relative mb-2 text-center text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500">
          {dayLabel(plan.day, now)} · leave home at
        </div>
        <Ring progress={plan.gone ? 1 : progress} color={th.stroke} pulse={plan.isToday && !plan.gone && status === 'now'}>
          <div className="text-[5.5rem] font-bold leading-none tabular-nums tracking-tighter min-[400px]:text-8xl">{hm(chosen.leaveAt)}</div>
          {plan.gone ? (
            <div className="mt-3 rounded-full bg-zinc-800 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-zinc-400">This bus has left</div>
          ) : plan.isToday ? (
            <>
              <div className={`mt-3 text-2xl font-semibold tabular-nums ${th.text}`}>{msLeft > 0 ? `in ${countdown(msLeft)}` : 'Go now!'}</div>
              <div className={`mt-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${th.pill}`}>{th.label}</div>
            </>
          ) : (
            <div className="mt-3 text-sm text-zinc-400">Bus {hm(chosen.dep)} · arrive {hm(chosen.arr)}</div>
          )}
        </Ring>
        {!isDefault && (
          <button onClick={() => onPatch({ dep: undefined })} className="relative mx-auto mt-2 block text-xs text-sky-300 underline underline-offset-4">You picked this bus · back to recommended</button>
        )}
      </section>

      <Timeline settings={settings} plan={plan} />
      <BusPicker plan={plan} onPick={(o) => onPatch({ dep: hm(o.dep) })} />
    </div>
  );
}
