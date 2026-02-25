/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#0f172a',
        'bg-card': '#1e293b',
        'bg-elevated': '#1e293b',
        'text-primary': '#e2e8f0',
        'text-muted': '#94a3b8',
        'accent-blue': '#3b82f6',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
