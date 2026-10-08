import { useEffect, useState } from 'react';
import { hm } from './planner';
import type { Plan, Settings, Status } from './types';

const styles: Record<Status, { ring: string; label: string }> = {
  ok: { ring: 'border-emerald-500/40 bg-emerald-500/5', label: 'On track' },
  hurry: { ring: 'border-amber-500/60 bg-amber-500/10', label: 'Leave NOW' },
  late: { ring: 'border-orange-500/60 bg-orange-500/10', label: 'Hurry – buffer used up' },
  missed: { ring: 'border-red-500/60 bg-red-500/10', label: 'Bus missed' },
  none: { ring: 'border-zinc-700 bg-zinc-900', label: 'No bus found' },
};

function countdown(ms: number): string {
  const neg = ms < 0;
  const t = Math.floor(Math.abs(ms) / 1000);
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  const body = h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
  return neg ? `−${body}` : body;
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="text-xs uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {sub && <div className="mt-0.5 text-sm text-zinc-400">{sub}</div>}
    </div>
  );
}

export default function Dashboard({ plan, settings, loading, onRefresh }: { plan: Plan; settings: Settings; loading: boolean; onRefresh: () => void }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id); }, []);

  const { best, status } = plan;
  const st = styles[status];
  const live = plan.source === 'live';
  const delayText = !best ? '' : best.cancelled ? 'Cancelled' : best.delayMin === 0 ? 'On time' : best.delayMin > 0 ? `+${best.delayMin} min late` : `${best.delayMin} min early`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className={`rounded-full px-2.5 py-1 font-medium ${plan.source === 'demo' ? 'bg-violet-500/20 text-violet-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
          {plan.source === 'demo' ? '● DEMO – simulated data' : '● Rejseplanen'}
        </span>
        {best && (
          <span className={`rounded-full px-2.5 py-1 font-medium ${best.realtime ? 'bg-sky-500/20 text-sky-300' : 'bg-zinc-700 text-zinc-300'}`}>
            {best.realtime ? 'LIVE realtime' : 'SCHEDULED only'}
          </span>
        )}
        <span className="text-zinc-500">updated {hm(plan.fetchedAt)}{loading ? ' …' : ''}</span>
        <button onClick={onRefresh} className="ml-auto text-zinc-400 hover:text-zinc-100">↻ Refresh</button>
      </div>

      {plan.warnings.length > 0 && (
        <div className="space-y-2">
          {plan.warnings.map((w) => (
            <div key={w} className={`rounded-xl border px-4 py-3 text-sm ${status === 'missed' || /CANCELLED/.test(w) ? 'border-red-500/50 bg-red-500/10 text-red-200' : 'border-amber-500/40 bg-amber-500/10 text-amber-200'}`}>
              ⚠ {w}
            </div>
          ))}
        </div>
      )}

      <section className={`rounded-3xl border p-8 text-center ${st.ring}`}>
        <div className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-400">Leave home at</div>
        <div className="mt-2 text-8xl font-bold tabular-nums tracking-tight sm:text-9xl">{best ? hm(best.leaveAt) : '--:--'}</div>
        {best && (
          <div className="mt-4 text-3xl font-semibold tabular-nums">
            {status === 'missed' ? st.label : <>in {countdown(best.leaveAt.getTime() - now.getTime())}</>}
          </div>
        )}
        <div className="mt-1 text-sm text-zinc-400">{st.label}</div>
      </section>

      {best && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label="Bus" value={`Line ${best.line}`} sub={best.direction ? `towards ${best.direction}` : undefined} />
          <Stat label="Departs" value={hm(best.realDep)} sub={`from ${best.fromStop.name}${best.delayMin ? ` (sched. ${hm(best.plannedDep)})` : ''}`} />
          <Stat label="Arrives" value={hm(best.realArr)} sub={`deadline ${hm(plan.target)}`} />
          <Stat label="Walk to stop" value={`${best.walkMin} min`} sub={`${best.walkMeters} m @ ${settings.walkSpeedKmh} km/h + ${settings.bufferMin} min buffer`} />
          <Stat label="Delay" value={delayText} sub={best.realtime ? 'live data' : 'scheduled data'} />
        </div>
      )}

      {plan.others.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="mb-2 text-xs uppercase tracking-wider text-zinc-500">Other options</div>
          <ul className="divide-y divide-zinc-800 text-sm">
            {[...plan.others].reverse().map((c) => (
              <li key={c.plannedDep.getTime() + c.line} className="flex justify-between py-2">
                <span>Leave <b>{hm(c.leaveAt)}</b> · line {c.line} dep. {hm(c.realDep)}</span>
                <span className={c.delayMin > 0 ? 'text-amber-300' : 'text-zinc-500'}>{c.delayMin > 0 ? `+${c.delayMin} min` : c.realtime ? 'live' : 'sched.'}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
