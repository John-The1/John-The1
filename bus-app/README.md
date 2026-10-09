# Leave Home – line 35

Offline commute planner (React + TypeScript + Tailwind). No API, no internet needed: you enter line 35's departure times once, and it tells you when to leave home every day.

```bash
cd bus-app
npm install
npm run dev                       # http://localhost:5173 (also prints a Network URL for your phone)
# or, installable/offline PWA:
npm run build && npm run preview
npm test
```

It ships with a **demo timetable** (marked DEMO DATA – not the real line 35 schedule). To use real times, open ⚙ Settings and enter/paste the bus departure times (Mon–Fri / Sat–Sun, or generate by interval), your arrival time, commute days, walking distance and ride time. Distance (300 m) and ride time (10 min) are placeholders – set your real values.

Leave time = departure − walking time − safety buffer. It picks the latest bus that arrives in time, rolls over to the next commute day once today's bus is out of reach, and lets you change the arrival time or pick another bus for today only.

Code: `src/planner.ts` (pure logic, tested) · `Dashboard.tsx` · `SettingsPanel.tsx`. The earlier Rejseplanen/demo version is in git history.
