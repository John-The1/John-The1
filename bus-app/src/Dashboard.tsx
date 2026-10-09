import { hm } from './planner';
import type { Override, Plan, Settings, Status } from './types';

const theme: Record<Status, { text: string; stroke: string; glow: string; label: string }> = {
  ok: { text: 'text-emerald-300', stroke: '#34d399', glow: 'shadow-emerald-500/20', label: 'You have time' },
  soon: { text: 'text-amber-300', stroke: '#fbbf24', glow: 'shadow-amber-500/25', label: 'Get ready to go' },
  now: { text: 'text-red-300', stroke: '#f87171', glow: 'shadow-red-500/30', label: 'Leave now!' },
};

function countdown(ms: number): string {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}

const dayLabel = (d: Date, isToday: boolean) =>
  isToday ? 'Today' : d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });

function Ring({ progress, color, children }: { progress: number; color: string; children: React.ReactNode }) {
  const r = 138, c = 2 * Math.PI * r;
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[22rem]">
      <svg viewBox="0 0 300 300" className="absolute inset-0 -rotate-90">
        <circle cx="150" cy="150" r={r} fill="none" stroke="#27272a" strokeWidth="10" />
        <circle cx="150" cy="150" r={r} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - progress)} style={{ transition: 'stroke-dashoffset 1s linear, stroke .5s' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
      <div className="text-[11px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-zinc-400">{sub}</div>}
    </div>
  );
}

function shiftTime(t: string, delta: number) {
  const [h, m] = t.split(':').map(Number);
  const v = (((h * 60 + m + delta) % 1440) + 1440) % 1440;
  return `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}`;
}

interface Props {
  settings: Settings; plan: Plan | null; now: Date; override?: Override;
  onPatch: (p: Partial<Override>) => void; onReset: () => void; onOpenSettings: () => void;
}

export default function Dashboard({ settings, plan, now, override, onPatch, onReset, onOpenSettings }: Props) {
  const empty = !settings.weekday.length && !settings.weekend.length;

  return (
    <div className="mx-auto min-h-screen max-w-xl px-4 pb-32 pt-[max(1rem,env(safe-area-inset-top))]">
      <header className="mb-2 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-zinc-500">{settings.homeAddress.split(',')[0]} → {settings.destinationName.split(',')[0]}</div>
          <h1 className="text-xl font-semibold">🚌 Line {settings.line}</h1>
        </div>
        <button onClick={onOpenSettings} aria-label="Settings" className="h-11 w-11 rounded-xl border border-zinc-700 text-xl active:bg-zinc-800">⚙</button>
      </header>

      {!plan ? (
        <div className="mt-10 rounded-3xl border border-zinc-800 bg-zinc-900 p-8 text-center">
          <div className="text-5xl">🗓️</div>
          <h2 className="mt-3 text-xl font-semibold">{empty ? 'Add your bus times' : 'No upcoming commute'}</h2>
          <p className="mt-2 text-sm text-zinc-400">
            {empty ? `Enter when line ${settings.line} departs from your stop (from the timetable or Rejseplanen) and the app does the rest – no internet needed.`
              : 'Check that your commute days and bus times are set up in Settings, and that a bus arrives before your deadline.'}
          </p>
          <button onClick={onOpenSettings} className="mt-5 h-12 rounded-xl bg-sky-600 px-6 font-medium active:bg-sky-700">Open settings</button>
        </div>
      ) : (
        <PlanView settings={settings} plan={plan} now={now} override={override} onPatch={onPatch} onReset={onReset} />
      )}

      {plan && (
        <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-zinc-800 bg-zinc-950/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
          <div className="mx-auto flex max-w-xl items-center gap-2">
            <button onClick={() => onPatch({ arrivalTime: shiftTime(override?.arrivalTime ?? settings.arrivalTime, -15), dep: undefined })} className="h-12 w-16 rounded-xl border border-zinc-700 active:bg-zinc-800">−15</button>
            <div className="flex-1 text-center leading-tight">
              <div className="text-[11px] uppercase tracking-wider text-zinc-500">Be there by {override?.arrivalTime ? '(today only)' : ''}</div>
              <div className="text-xl font-semibold tabular-nums">{override?.arrivalTime ?? settings.arrivalTime}</div>
            </div>
            <button onClick={() => onPatch({ arrivalTime: shiftTime(override?.arrivalTime ?? settings.arrivalTime, 15), dep: undefined })} className="h-12 w-16 rounded-xl border border-zinc-700 active:bg-zinc-800">+15</button>
            {override && <button onClick={onReset} aria-label="Reset to usual" className="h-12 w-12 rounded-xl bg-zinc-800 active:bg-zinc-700">↺</button>}
          </div>
        </nav>
      )}
    </div>
  );
}

function PlanView({ settings, plan, now, override, onPatch, onReset }: Pick<Props, 'settings' | 'now' | 'override' | 'onPatch' | 'onReset'> & { plan: Plan }) {
  const { chosen, status } = plan;
  const th = theme[status];
  const msLeft = chosen.leaveAt.getTime() - now.getTime();
  const progress = plan.isToday ? Math.min(1, Math.max(0, 1 - msLeft / (60 * 60000))) : 0;
  const shown = plan.options.filter((o) => Math.abs(plan.options.indexOf(o) - plan.options.indexOf(chosen)) <= 3);

  return (
    <div className="space-y-4">
      {plan.missedEarlier && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">⚠ Today's bus has gone – showing your next commute.</div>
      )}

      <section className={`rounded-[2rem] border border-zinc-800 bg-zinc-900/60 px-4 py-6 shadow-2xl ${th.glow} ${status === 'now' ? 'animate-pulse' : ''}`}>
        <div className="mb-3 text-center text-sm font-medium uppercase tracking-[0.2em] text-zinc-400">{dayLabel(plan.day, plan.isToday)} · leave home at</div>
        <Ring progress={progress} color={th.stroke}>
          <div className="text-7xl font-bold tabular-nums tracking-tight min-[380px]:text-8xl">{hm(chosen.leaveAt)}</div>
          {plan.isToday ? (
            <>
              <div className={`mt-2 text-2xl font-semibold tabular-nums ${th.text}`}>
                {msLeft > 0 ? `in ${countdown(msLeft)}` : 'NOW'}
              </div>
              <div className="mt-1 text-sm text-zinc-400">{th.label}</div>
            </>
          ) : <div className="mt-2 text-sm text-zinc-400">Next commute</div>}
        </Ring>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Tile label="Bus" value={`Line ${settings.line}`} sub={`departs ${hm(chosen.dep)}`} />
        <Tile label="Arrives" value={hm(chosen.arr)} sub={`be there by ${hm(plan.deadline)} · ${Math.round((plan.deadline.getTime() - chosen.arr.getTime()) / 60000)} min spare`} />
        <Tile label="Walk to stop" value={`${plan.walkMin} min`} sub={`${settings.walkMeters} m @ ${settings.walkSpeedKmh} km/h`} />
        <Tile label="Safety buffer" value={`${settings.bufferMin} min`} sub="built into leave time" />
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3">
        <div className="mb-2 px-1 text-[11px] uppercase tracking-wider text-zinc-500">Tap another bus to switch (today only)</div>
        <ul className="space-y-1.5">
          {shown.map((o) => {
            const sel = o === chosen;
            return (
              <li key={o.dep.getTime()}>
                <button
                  onClick={() => (sel ? onReset() : onPatch({ dep: hm(o.dep) }))}
                  className={`flex h-14 w-full items-center justify-between rounded-xl border px-4 text-left active:scale-[.99] ${sel ? 'border-sky-500 bg-sky-500/10' : 'border-zinc-800 bg-zinc-950'}`}
                >
                  <span>
                    <span className="text-lg font-semibold tabular-nums">{hm(o.dep)}</span>
                    <span className="ml-2 text-sm text-zinc-500">leave {hm(o.leaveAt)}</span>
                  </span>
                  <span className={`text-xs font-medium ${o.onTime ? 'text-emerald-400' : 'text-red-400'}`}>
                    {o.onTime ? 'on time' : `${Math.round((o.arr.getTime() - plan.deadline.getTime()) / 60000)} min late`}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
