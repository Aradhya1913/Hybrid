import { defineConfig } from 'vite'

export default defineConfig({
  server: { 
    port: 5173,
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '.ngrok-free.app',
      '.ngrok.io'
    ]
  }
})
