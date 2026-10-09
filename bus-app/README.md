# Leave Home – bus departure planner

React + TypeScript + Tailwind (Vite). Tells you when to leave home to catch the bus that gets you to Cirklen, Dragør on time.

## Run
```bash
cd bus-app
npm install
cp .env.example .env      # then paste your Rejseplanen accessId (optional – see below)
npm run dev               # http://localhost:5173
npm test                  # planner unit tests
```
No key yet? Open **Settings → Demo mode** for simulated data.

## Rejseplanen access
Uses the Rejseplanen API 2.0 (HAFAS ReST, `https://www.rejseplanen.dk/api/`, `accessId` parameter). Request a key at https://labs.rejseplanen.dk/. Put it in `.env` (`REJSEPLANEN_ACCESS_ID`) or paste it into Settings. The Vite dev proxy forwards requests, so there are no CORS problems.

Flow: DAWA geocodes your address → `location.nearbystops` → `location.name` for the destination → `trip` (searchForArrival) from the 3 nearest stops → pick the latest bus that arrives in time and that you can still catch. Leave time = realtime departure − walk time − safety buffer.

## Layout
`src/rejseplanen.ts` API client · `src/planner.ts` pure selection logic (tested) · `src/demo.ts` simulated data · `Dashboard.tsx` / `SettingsPanel.tsx` UI.

## On your phone
`npm run dev` also prints a `Network:` URL (e.g. `http://192.168.x.x:5173`). Open it on a phone on the same Wi-Fi. Pull down to refresh; the bottom bar nudges the arrival time ±15 min. Note: the dev proxy (and your API key) is then reachable by devices on your network.
