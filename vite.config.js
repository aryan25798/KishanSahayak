import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import viteCompression from 'vite-plugin-compression'
// ✅ NEW: Import SSL plugin for HTTPS
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig({
  plugins: [
    react(),
    // ✅ NEW: Enables HTTPS for dev server (required for microphone/voice features)
    basicSsl(),
    // Compress assets using Gzip to reduce file size for slow networks
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
    }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.png', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'Kisan Sahayak',
        short_name: 'KisanSahayak',
        description: 'AI-Powered Smart Farming Assistant',
        theme_color: '#10b981', 
        background_color: '#ffffff',
        display: 'standalone', 
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  build: {
    // Advanced optimization for production builds
    rollupOptions: {
      output: {
        // ✅ FIXED: Converted object to function to fix "manualChunks is not a function" error
        manualChunks(id) {
          if (id.includes('node_modules')) {
            
            // 1. UI Libraries (Check first to catch react-hot-toast)
            if (id.includes('framer-motion') || id.includes('recharts') || id.includes('lucide-react') || id.includes('react-hot-toast')) {
              return 'ui-libs';
            }

            // 2. Mapping libraries (Check before react to catch react-leaflet)
            if (id.includes('leaflet') || id.includes('react-leaflet') || id.includes('@react-google-maps/api')) {
              return 'maps-vendor';
            }

            // 3. React core
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'react-vendor';
            }
            
            // 4. Firebase
            if (id.includes('firebase')) {
              return 'firebase-vendor';
            }
          }
        }
      }
    },
    // Ensure chunks don't get too large (warning limit)
    chunkSizeWarningLimit: 1000, 
  },
  // ✅ NEW: Allow access from network IP (useful for testing PWA on phone)
  server: {
    host: true
  }
})