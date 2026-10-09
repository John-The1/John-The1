import { useState } from 'react';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);
const p2 = (n: number) => String(n).padStart(2, '0');

interface Props {
  day: Date; isToday: boolean; value: string; usual: string;
  onApply: (time: string, scope: 'day' | 'usual') => void; onClose: () => void;
}

/** Bottom sheet: pick the "be there by" time in two taps (hour, then minute). */
export default function TimeSheet({ day, isToday, value, usual, onApply, onClose }: Props) {
  const [h, setH] = useState(Number(value.slice(0, 2)));
  const [m, setM] = useState(Number(value.slice(3, 5)));
  const time = `${p2(h)}:${p2(m)}`;
  const dayName = isToday ? 'today' : day.toLocaleDateString('en-GB', { weekday: 'long' });
  const cell = (on: boolean) =>
    `h-11 rounded-xl text-base font-medium tabular-nums transition active:scale-95 ${on ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20' : 'bg-zinc-800/80 text-zinc-300'}`;

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-[fade_.2s_ease-out]" onClick={onClose} />
      <div className="relative w-full max-w-xl animate-[sheet_.25s_ease-out] rounded-t-[2rem] border-t border-zinc-800 bg-zinc-900 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-zinc-700" />
        <div className="flex items-end justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Be there by · {dayName}</div>
            <div className="text-5xl font-bold tabular-nums tracking-tight">{time}</div>
          </div>
          <input
            type="time" aria-label="Type a time" value={time}
            onChange={(e) => { if (e.target.value) { setH(Number(e.target.value.slice(0, 2))); setM(Number(e.target.value.slice(3, 5))); } }}
            className="h-11 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-base text-zinc-300"
          />
        </div>

        <div className="mt-5 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Hour</div>
        <div className="mt-2 grid grid-cols-6 gap-1.5">
          {HOURS.map((x) => <button key={x} onClick={() => setH(x)} className={cell(x === h)}>{p2(x)}</button>)}
        </div>

        <div className="mt-4 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Minute</div>
        <div className="mt-2 grid grid-cols-6 gap-1.5">
          {MINUTES.map((x) => <button key={x} onClick={() => setM(x)} className={cell(x === m)}>:{p2(x)}</button>)}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button onClick={() => onApply(time, 'day')} className="h-14 rounded-2xl bg-sky-600 font-semibold active:bg-sky-700">
            Only {dayName}
          </button>
          <button onClick={() => onApply(time, 'usual')} className="h-14 rounded-2xl border border-zinc-700 font-medium active:bg-zinc-800">
            Every day <span className="block text-xs font-normal text-zinc-500">usual is {usual}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
