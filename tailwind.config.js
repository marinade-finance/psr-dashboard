/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
          light: 'var(--primary-light)',
          'light-10': 'var(--primary-light-10)',
          'light-05': 'var(--primary-light-05)',
          90: 'var(--primary-90)',
        },
        background: {
          DEFAULT: 'var(--background)',
          page: 'var(--background-page)',
        },
        foreground: {
          DEFAULT: 'var(--foreground)',
          secondary: 'var(--secondary-foreground)',
          muted: 'var(--muted-foreground)',
        },
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        border: {
          DEFAULT: 'var(--border)',
          grid: 'var(--border-grid)',
        },
        input: 'var(--input)',
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        accent: 'var(--accent)',
        tertiary: {
          DEFAULT: 'var(--tertiary)',
          foreground: 'var(--tertiary-foreground)',
        },
        ring: 'var(--ring)',
        destructive: {
          DEFAULT: 'var(--destructive)',
          light: 'var(--destructive-light)',
          20: 'var(--destructive-20)',
        },
        warning: {
          DEFAULT: 'var(--warning)',
          light: 'var(--warning-light)',
          20: 'var(--warning-20)',
          10: 'var(--warning-10)',
        },
        info: {
          DEFAULT: 'var(--info)',
          light: 'var(--info-light)',
          20: 'var(--info-20)',
        },
        chart: {
          1: 'var(--chart-1)',
          2: 'var(--chart-2)',
          3: 'var(--chart-3)',
          4: 'var(--chart-4)',
          5: 'var(--chart-5)',
        },
        tag: {
          1: { DEFAULT: 'var(--tag-1)', bg: 'var(--tag-1-bg)' },
          2: { DEFAULT: 'var(--tag-2)', bg: 'var(--tag-2-bg)' },
          3: { DEFAULT: 'var(--tag-3)', bg: 'var(--tag-3-bg)' },
          4: { DEFAULT: 'var(--tag-4)', bg: 'var(--tag-4-bg)' },
        },
      },
      fontFamily: {
        sans: ['Geist', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['Geist Mono', 'SF Mono', 'monospace'],
        serif: ['PT Serif', 'serif'],
      },
      fontSize: {
        '2xs': ['12px', { lineHeight: '16px' }],
        xs: ['13px', { lineHeight: '18px' }],
        sm: ['14px', { lineHeight: '20px' }],
        base: ['16px', { lineHeight: '24px' }],
        lg: ['18px', { lineHeight: '28px' }],
        xl: ['20px', { lineHeight: '28px' }],
        '2xl': ['24px', { lineHeight: '32px' }],
        '3xl': ['30px', { lineHeight: '36px' }],
      },
      borderRadius: {
        xs: '2px',
        sm: '6px',
        md: '8px',
        lg: '10px',
        xl: '12px',
        '2xl': '16px',
        '3xl': '24px',
        '4xl': '32px',
      },
      boxShadow: {
        xs: '0 2px 8px rgba(0, 0, 0, 0.05)',
        sm: '0 1px 14px rgba(0, 0, 0, 0.03)',
        md: '0 4px 8px -1px rgba(0, 0, 0, 0.07), 0 10px 18px rgba(0, 0, 0, 0.05)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.09), 0 4px 18px 3px rgba(0, 0, 0, 0.08)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.10), 0 9px 33px 4px rgba(0, 0, 0, 0.08)',
      },
    },
  },
  plugins: [],
}
