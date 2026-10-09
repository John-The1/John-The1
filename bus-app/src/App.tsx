import { useEffect, useMemo, useRef, useState } from 'react';
import Dashboard from './Dashboard';
import SettingsPanel from './SettingsPanel';
import TimeSheet from './TimeSheet';
import { arrivalFor, computePlan, dateKey, fromKey } from './planner';
import { loadOverrides, loadSettings, saveOverrides, saveSettings } from './settings';
import type { DayOverride, Overrides, Settings } from './types';

export default function App() {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [overrides, setOverrides] = useState<Overrides>(loadOverrides);
  const [viewDate, setViewDate] = useState<string | null>(null); // null = automatic (next commute)
  const [now, setNow] = useState(new Date());
  const [sheet, setSheet] = useState<'settings' | 'time' | null>(null);
  const fired = useRef(new Set<string>());

  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id); }, []);

  const today = dateKey(now);
  const live = useMemo(() => Object.fromEntries(Object.entries(overrides).filter(([k]) => k >= today)), [overrides, today]);
  const picked = viewDate && viewDate >= today ? viewDate : undefined; // a picked day expires once it's past
  const autoPlan = useMemo(() => computePlan(settings, live, now), [settings, live, now]);
  const plan = useMemo(() => (picked ? computePlan(settings, live, now, picked) : autoPlan), [settings, live, now, picked, autoPlan]);
  const autoKey = autoPlan ? dateKey(autoPlan.day) : today;
  const dayKey = picked ?? autoKey;

  // Optional alerts (only while the page is open): 10 min before and at leave time.
  useEffect(() => {
    if (!settings.notify || !autoPlan?.isToday || !('Notification' in window) || Notification.permission !== 'granted') return;
    const mins = Math.round((autoPlan.chosen.leaveAt.getTime() - now.getTime()) / 60000);
    for (const [at, text] of [[10, 'Leave in 10 minutes'], [0, 'Time to leave now!']] as const) {
      const key = `${autoPlan.chosen.leaveAt.getTime()}-${at}`;
      if (mins === at && !fired.current.has(key)) {
        fired.current.add(key);
        new Notification(`🚌 Line ${settings.line}`, { body: text });
        navigator.vibrate?.([200, 100, 200]);
      }
    }
  }, [now, autoPlan, settings.notify, settings.line]);

  const update = (s: Settings) => { setSettings(s); saveSettings(s); };
  const writeOverrides = (o: Overrides) => { setOverrides(o); saveOverrides(o); };
  const patchDay = (p: Partial<DayOverride>) => {
    const merged = { ...live[dayKey], ...p };
    if (merged.arrivalTime === settings.arrivalTime) delete merged.arrivalTime;
    const next = { ...live, [dayKey]: merged };
    if (!merged.arrivalTime && !merged.dep) delete next[dayKey];
    writeOverrides(next);
  };
  const resetDay = () => { const next = { ...live }; delete next[dayKey]; writeOverrides(next); };

  return (
    <>
      <Dashboard
        settings={settings} plan={plan} now={now}
        dayKey={dayKey} autoKey={autoKey} picked={!!picked} overrides={live}
        arrival={arrivalFor(settings, live, fromKey(dayKey))}
        onSelectDay={(k) => setViewDate(k === autoKey ? null : k)}
        onPatch={patchDay} onReset={resetDay}
        onOpenSettings={() => setSheet('settings')} onOpenTime={() => setSheet('time')}
      />
      {sheet === 'settings' && <SettingsPanel settings={settings} onChange={update} onClose={() => setSheet(null)} />}
      {sheet === 'time' && (
        <TimeSheet
          day={fromKey(dayKey)} isToday={dayKey === today}
          value={arrivalFor(settings, live, fromKey(dayKey))} usual={settings.arrivalTime}
          onClose={() => setSheet(null)}
          onApply={(time, scope) => {
            if (scope === 'usual') {
              update({ ...settings, arrivalTime: time });
              const next = { ...live };
              if (next[dayKey]) { delete next[dayKey].arrivalTime; delete next[dayKey].dep; }
              writeOverrides(next);
            } else patchDay({ arrivalTime: time, dep: undefined });
            setSheet(null);
          }}
        />
      )}
    </>
  );
}
