import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// `base` is set from BASE_PATH env var so GitHub Pages deploys at /<repo>/ work.
// Defaults to '/' for local dev.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    base: env.BASE_PATH || '/',
  };
});
