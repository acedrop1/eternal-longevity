import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/lineup.ts',
  ],
  theme: {
    extend: {
      // One radius system: shell = every surface, inner = anything nested in a surface, thumb = tiny images.
      borderRadius: { shell: '28px', inner: '18px', thumb: '10px' },
      fontFamily: {
        sans: ['var(--font-geist)', 'var(--font-mulish)', 'system-ui', 'sans-serif'],
        display: ['var(--font-geist)', 'system-ui', 'sans-serif'],
        // Redesign: the typewriter mono is retired; labels read in Geist.
        mono: ['var(--font-geist)', 'system-ui', 'sans-serif'],
      },
      colors: {
        // All tokens resolve through CSS variables (set in globals.css :root)
        // so we can flip a whole section to "light theme" by adding the
        // .theme-light class to any wrapper. Accent stays static across
        // themes — it's the brand mark.
        background: 'rgb(var(--bg-rgb) / <alpha-value>)',
        foreground: 'rgb(var(--fg-rgb) / <alpha-value>)',
        muted: 'rgb(var(--muted-rgb) / <alpha-value>)',
        // Legacy name kept so older portal/admin code still compiles; now the butter palette, not gold.
        accent: {
          DEFAULT: '#F7DD74',
          soft: '#FFEC9F',
          deep: '#E6C54F',
        },
        // Redesign palette: one signature colour (butter), milk panels, soft ink.
        butter: { DEFAULT: '#FFEC9F', deep: '#F7DD74', soft: '#FFF8DC' }, // brand yellow from the logo
        milk: { DEFAULT: '#F4F4F2', deep: '#EBEBE8' },
        // Aura pastels: only ever as soft glows behind frosted glass.
        peach: '#FFC9A8',
        lilac: '#CFC4F6',
        sky: '#BFE0F5',
        ink: { DEFAULT: '#111111', soft: '#55565A' },
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
