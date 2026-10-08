import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// The dev server proxies API calls so the browser avoids CORS and the
// access key from .env never has to be shipped to the client.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const envKey = env.REJSEPLANEN_ACCESS_ID?.trim() ?? '';

  const config: Plugin = {
    name: 'api-config',
    configureServer(server) {
      server.middlewares.use('/proxy/config', (_req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ hasEnvKey: envKey.length > 0 }));
      });
    },
  };

  return {
    plugins: [react(), config],
    server: {
      proxy: {
        '/proxy/rejseplanen': {
          target: 'https://www.rejseplanen.dk',
          changeOrigin: true,
          // Appends the .env key unless the UI supplied its own accessId.
          rewrite: (p) => {
            let out = p.replace(/^\/proxy\/rejseplanen/, '/api');
            if (envKey && !/[?&]accessId=/.test(out)) out += `${out.includes('?') ? '&' : '?'}accessId=${encodeURIComponent(envKey)}`;
            return out;
          },
        },
        '/proxy/dawa': {
          target: 'https://api.dataforsyningen.dk',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/proxy\/dawa/, ''),
        },
      },
    },
  };
});
