import { useCallback, useEffect, useRef, useState } from 'react';
import { buildPlan, targetTime } from './planner';
import { fetchLive, hasEnvKey } from './rejseplanen';
import { DEMO_HOME, demoJourneys } from './demo';
import { loadSettings, saveSettings } from './settings';
import Dashboard from './Dashboard';
import SettingsPanel from './SettingsPanel';
import type { Plan, Settings } from './types';

export default function App() {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [plan, setPlan] = useState<Plan>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [envKey, setEnvKey] = useState(false);

  useEffect(() => { hasEnvKey().then(setEnvKey); }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    const now = new Date();
    try {
      const arriveBy = targetTime(settings, now);
      if (settings.demoMode) {
        setPlan(buildPlan(demoJourneys(arriveBy), DEMO_HOME, settings, now, 'demo'));
      } else {
        const { home, journeys } = await fetchLive(settings, arriveBy);
        setPlan(buildPlan(journeys, home, settings, now, 'live'));
      }
      setError(undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [settings]);

  // Fetch on any settings change, then every refreshSec (clamped to 30–60 s).
  useEffect(() => {
    refresh();
    const sec = Math.min(60, Math.max(30, settings.refreshSec));
    const id = setInterval(refresh, sec * 1000);
    return () => clearInterval(id);
  }, [refresh, settings.refreshSec]);

  const update = (s: Settings) => { setSettings(s); saveSettings(s); };
  const pull = useRef(-1);
  const nudge = (min: number) => {
    const [h, m] = settings.arrivalTime.split(':').map(Number);
    const t = (((h * 60 + m + min) % 1440) + 1440) % 1440;
    update({ ...settings, arrivalTime: `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}` });
  };

  return (
    <div
      className="mx-auto min-h-screen max-w-3xl px-4 pb-28 pt-[max(1rem,env(safe-area-inset-top))]"
      onTouchStart={(e) => { pull.current = window.scrollY === 0 ? e.touches[0].clientY : -1; }}
      onTouchEnd={(e) => { if (pull.current >= 0 && e.changedTouches[0].clientY - pull.current > 90) refresh(); pull.current = -1; }}
    >
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-400">🚌 Leave Home · Line {settings.lineFilter || 'any'}</h1>
        <button onClick={() => setShowSettings(true)} aria-label="Settings" className="h-11 w-11 rounded-xl border border-zinc-700 text-xl active:bg-zinc-800">⚙</button>
      </header>

      {showSettings && <SettingsPanel settings={settings} onChange={update} onClose={() => setShowSettings(false)} envKey={envKey} />}

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          <p className="font-medium">Could not load live data</p>
          <p className="mt-1 opacity-80">{error}</p>
          {!settings.demoMode && (
            <button onClick={() => update({ ...settings, demoMode: true })} className="mt-3 rounded-lg bg-red-500/20 px-3 py-1.5 hover:bg-red-500/30">
              Switch to demo mode
            </button>
          )}
        </div>
      )}

      {plan && <Dashboard plan={plan} settings={settings} loading={loading} onRefresh={refresh} />}
      {!plan && !error && <p className="text-zinc-500">Loading…</p>}

      {/* Thumb-reach bar: nudge the arrival deadline and refresh */}
      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-zinc-800 bg-zinc-950/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-2">
          <button onClick={() => nudge(-15)} className="h-12 flex-1 rounded-xl border border-zinc-700 active:bg-zinc-800">−15</button>
          <div className="flex-[2] text-center leading-tight">
            <div className="text-[11px] uppercase tracking-wider text-zinc-500">Arrive by</div>
            <div className="text-xl font-semibold tabular-nums">{settings.arrivalTime}</div>
          </div>
          <button onClick={() => nudge(15)} className="h-12 flex-1 rounded-xl border border-zinc-700 active:bg-zinc-800">+15</button>
          <button onClick={refresh} aria-label="Refresh" className="h-12 w-14 rounded-xl bg-sky-600 text-xl active:bg-sky-700">{loading ? '…' : '↻'}</button>
        </div>
      </nav>
    </div>
  );
}
