import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import viteString from 'vite-plugin-string';

// https://vite.dev/config/
export default defineConfig({
  plugins: [viteString()],
})
