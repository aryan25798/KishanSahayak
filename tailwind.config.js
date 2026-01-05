/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      // ✅ Mapping 'brand' to standard 'emerald' to prevent broken styles
      colors: {
        brand: {
          50: '#ecfdf5',
          100: '#d1fae5',
          500: '#10b981', // emerald-500
          600: '#059669', // emerald-600
          900: '#064e3b', // emerald-900
        },
        canvas: '#f1f5f9', // slate-100
      },
      // ✅ NEW: Added support for Mesh Gradients & Hero Glows
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'hero-glow': 'conic-gradient(from 180deg at 50% 50%, #10b981 0deg, #059669 180deg, #10b981 360deg)',
      },
      animation: {
        'fade-up': 'fadeUp 0.5s ease-out forwards',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      },
      // ✅ NEW: Combined your existing shadows with new Glassmorphism & Neon shadows
      boxShadow: {
        // Your existing shadows
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.1)',
        'soft': '0 10px 40px -10px rgba(0,0,0,0.08)',
        
        // New Industry-Grade Shadows
        'glass-sm': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03), inset 0 0 0 1px rgba(255,255,255,0.1)',
        'glass-md': '0 8px 30px rgba(0, 0, 0, 0.06), inset 0 0 0 1px rgba(255,255,255,0.1)',
        'neon': '0 0 20px -5px rgba(16, 185, 129, 0.4)', // Emerald glow for buttons/cards
      }
    },
  },
  plugins: [],
}