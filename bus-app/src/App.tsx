import { useEffect, useMemo, useRef, useState } from 'react';
import Dashboard from './Dashboard';
import SettingsPanel from './SettingsPanel';
import { computePlan, dateKey } from './planner';
import { loadOverride, loadSettings, saveOverride, saveSettings } from './settings';
import type { Override, Settings } from './types';

export default function App() {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [ov, setOv] = useState<Override | undefined>(loadOverride);
  const [now, setNow] = useState(new Date());
  const [showSettings, setShowSettings] = useState(false);
  const fired = useRef(new Set<string>());

  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id); }, []);

  const activeOv = ov && ov.date >= dateKey(now) ? ov : undefined; // yesterday's tweaks expire
  const plan = useMemo(() => computePlan(settings, activeOv, now), [settings, activeOv, now]);

  // Optional alerts (only while the page is open): 10 min before and at leave time.
  useEffect(() => {
    if (!settings.notify || !plan?.isToday || !('Notification' in window) || Notification.permission !== 'granted') return;
    const mins = Math.round((plan.chosen.leaveAt.getTime() - now.getTime()) / 60000);
    for (const [at, text] of [[10, 'Leave in 10 minutes'], [0, 'Time to leave now!']] as const) {
      const key = `${plan.chosen.leaveAt.getTime()}-${at}`;
      if (mins === at && !fired.current.has(key)) {
        fired.current.add(key);
        new Notification(`🚌 Line ${settings.line}`, { body: text });
        navigator.vibrate?.([200, 100, 200]);
      }
    }
  }, [now, plan, settings.notify, settings.line]);

  const update = (s: Settings) => { setSettings(s); saveSettings(s); };
  const patchOv = (p: Partial<Override>) => {
    const next = { ...(activeOv ?? { date: dateKey(plan?.day ?? now) }), ...p, date: dateKey(plan?.day ?? now) };
    setOv(next); saveOverride(next);
  };
  const resetOv = () => { setOv(undefined); saveOverride(undefined); };

  return (
    <>
      <Dashboard
        settings={settings} plan={plan} now={now} override={activeOv}
        onPatch={patchOv} onReset={resetOv} onOpenSettings={() => setShowSettings(true)}
      />
      {showSettings && <SettingsPanel settings={settings} onChange={update} onClose={() => setShowSettings(false)} />}
    </>
  );
}
