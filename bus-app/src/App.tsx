import { useCallback, useEffect, useState } from 'react';
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

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-400">🚌 Leave Home</h1>
        <button onClick={() => setShowSettings((v) => !v)} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-800">
          {showSettings ? 'Close' : 'Settings'}
        </button>
      </header>

      {showSettings && <SettingsPanel settings={settings} onChange={update} envKey={envKey} />}

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
    </div>
  );
}
