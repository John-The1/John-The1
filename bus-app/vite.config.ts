import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Fully offline app: no API, no proxy. `host: true` makes it reachable from a phone on your Wi-Fi.
export default defineConfig({
  plugins: [react()],
  server: { host: true },
  preview: { host: true },
});
