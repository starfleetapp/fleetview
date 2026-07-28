/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg-1)',
        elev: 'var(--bg-2)',
        surface: 'var(--bg-2)',
        line: 'var(--line)',
        ink: 'var(--ink)',
        dim: 'var(--dim)',
        faint: 'var(--faint)',
        online: 'var(--online)',
        degraded: 'var(--degraded)',
        offline: 'var(--offline)',
        accent: 'var(--accent)',
        accent2: 'var(--accent-2)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['D-DIN-Bold', 'D-DIN', 'Arial', 'sans-serif'],
        serif: ['D-DIN-Bold', 'D-DIN', 'sans-serif'],
        mono: ['Roboto Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      letterSpacing: { label: '0.18em' },
    },
  },
  plugins: [],
};
