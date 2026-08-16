import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { apiPlugin } from './vite-api-server.js'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env variables into process.env so our middleware can read them
  process.env = { ...process.env, ...loadEnv(mode, process.cwd(), '') };

  return {
    base: '/Sehat-Setu/',
    plugins: [react(), apiPlugin()],
    server: {
      headers: {
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://www.gstatic.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https://res.cloudinary.com https://*.tile.openstreetmap.org https://*.googleapis.com https://*.gstatic.com; connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://api.cloudinary.com https://api.minimoth.dev wss://*.firebaseio.com https://cdn.jsdelivr.net https://storage.googleapis.com; frame-src 'self' https://*.firebaseapp.com;",
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'geolocation=(self), microphone=(self)'
      }
    }
  };
})
