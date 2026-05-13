import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-proxima)', 'var(--font-mulish)', 'system-ui', 'sans-serif'],
      },
      colors: {
        // All tokens resolve through CSS variables (set in globals.css :root)
        // so we can flip a whole section to "light theme" by adding the
        // .theme-light class to any wrapper. Accent stays static across
        // themes — it's the brand mark.
        background: 'rgb(var(--bg-rgb) / <alpha-value>)',
        foreground: 'rgb(var(--fg-rgb) / <alpha-value>)',
        muted: 'rgb(var(--muted-rgb) / <alpha-value>)',
        accent: {
          DEFAULT: '#d5a850',           // brand gold (stays — matches the logo)
          soft: '#e8c789',
          deep: '#a88438',
        },
        surface: {
          DEFAULT: 'rgb(var(--surface-rgb) / <alpha-value>)',
          raised: 'rgb(var(--surface-raised-rgb) / <alpha-value>)',
        },
        line: 'rgb(var(--line-rgb) / var(--line-opacity, 1))',
        /* BLACK THEME (parked) --------------------------------------------
        background: '#000000',
        foreground: '#ffffff',
        muted: '#9a9a9a',
        accent: { DEFAULT: '#d5a850', soft: '#e8c789', deep: '#a88438' },
        surface: { DEFAULT: '#0a0a0a', raised: '#141414' },
        line: 'rgba(255, 255, 255, 0.08)',
        -------------------------------------------------------------------- */
        /* LIGHT THEME (parked) --------------------------------------------
        background: '#faf8f3',
        foreground: '#0a0a0a',
        muted: '#6b6b6b',
        accent: { DEFAULT: '#d5a850', soft: '#e8c789', deep: '#a88438' },
        surface: { DEFAULT: '#f3f0e8', raised: '#ffffff' },
        line: 'rgba(0, 0, 0, 0.08)',
        -------------------------------------------------------------------- */
      },
      letterSpacing: {
        wider: '0.04em',
        widest: '0.16em',
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
