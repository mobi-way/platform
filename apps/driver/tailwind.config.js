/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        rajdhani: ['Rajdhani', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
      colors: {
        brand: {
          blue: '#3b82f6',
          green: '#22c55e',
          red: '#ef4444',
          dark: '#111827',
          card: '#1f2937',
          border: '#374151',
          muted: '#9ca3af',
          subtle: '#6b7280',
          light: '#d1d5db',
        }
      }
    },
  },
  plugins: [],
}
