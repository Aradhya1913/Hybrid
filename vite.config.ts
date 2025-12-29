import { defineConfig } from 'vite'

export default defineConfig({
  server: { 
    port: 5173,
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '.ngrok-free.dev',
      '.ngrok-free.app',
      '.ngrok.io',
      'micki-lyriform-irina.ngrok-free.dev'
    ]
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  optimizeDeps: {
    exclude: ['aframe']
  }
})
