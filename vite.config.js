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
        manualChunks: {
          // Split React core to keep the main bundle small
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          
          // Split Firebase because it is very large
          'firebase-vendor': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage', 'firebase/analytics'],
          
          // Split UI animations and charts
          'ui-libs': ['framer-motion', 'recharts', 'lucide-react', 'react-hot-toast'],
          
          // Split Mapping libraries (heavy)
          'maps-vendor': ['leaflet', 'react-leaflet', '@react-google-maps/api'],
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