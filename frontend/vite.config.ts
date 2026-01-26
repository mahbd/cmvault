import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    port: 5173
  },
  // Load Vite env vars from the repo root so VITE_API_URL/VITE_API_TOKEN in .env are picked up.
  envDir: '..'
});
