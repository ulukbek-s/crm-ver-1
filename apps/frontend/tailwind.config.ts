import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        sidebar: 'hsl(220 18% 12%)',
        surface: 'hsl(220 14% 96%)',
        primary: 'hsl(221 83% 53%)',
        muted: 'hsl(220 9% 46%)',
      },
      fontFamily: {
        sans: ['system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
