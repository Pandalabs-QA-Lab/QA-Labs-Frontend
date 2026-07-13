import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vercel serves the app from its domain root, but the GitHub Pages workflow
// (.github/workflows/deploy.yml) still needs the /pandalabs/ subpath - Vercel
// sets the VERCEL env var during its build, so branch on that instead of
// hardcoding one or the other.
export default defineConfig({
  plugins: [react()],
  base: process.env.VERCEL ? '/' : '/pandalabs/',
})
