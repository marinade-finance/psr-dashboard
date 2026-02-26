/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        'background-page': 'var(--background-page)',
        foreground: 'var(--foreground)',
        card: { DEFAULT: 'var(--card)', foreground: 'var(--card-foreground)' },
        secondary: { DEFAULT: 'var(--secondary)', foreground: 'var(--secondary-foreground)' },
        tertiary: { DEFAULT: 'var(--tertiary)', foreground: 'var(--tertiary-foreground)' },
        muted: { DEFAULT: 'var(--muted)', foreground: 'var(--muted-foreground)' },
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
          alpha: 'var(--primary-alpha)',
        },
        destructive: 'var(--destructive)',
        warning: 'var(--warning)',
        info: 'var(--info)',
        border: 'var(--border)',
        'border-grid': 'var(--border-grid)',
        ring: 'var(--ring)',
        'cell-red': 'var(--cell-red)',
        'cell-green': 'var(--cell-green)',
        'cell-yellow': 'var(--cell-yellow)',
        'cell-grey': 'var(--cell-grey)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        card: 'var(--shadow)',
      },
    },
  },
  plugins: [],
}
