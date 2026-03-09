/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#e6f0ff',
          100: '#cce0ff',
          500: '#0066cc',
          700: '#004080',
          900: '#002855',
        },
      },
    },
  },
  plugins: [],
}
