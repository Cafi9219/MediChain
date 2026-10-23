/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        vtop: {
          blue: '#005696',
          dark: '#003366',
          light: '#e6f0fa',
          accent: '#ff9900'
        },
        med: {
          primary: '#0ea5e9',
          success: '#10b981',
          warning: '#f59e0b',
          danger: '#ef4444',
          slate: '#0f172a'
        }
      }
    },
  },
  plugins: [],
}
