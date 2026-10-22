import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In development, /api calls are forwarded to the Express server so the session cookie stays same-origin.
export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': 'http://localhost:5000' } },
})
