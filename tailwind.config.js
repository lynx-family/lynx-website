/**
 * @type {import('tailwindcss').Config}
 *
 * This is largely copied from shadcn/ui except for the `content`
 * @see https://ui.shadcn.com/docs/installation/manual
 */

const { fontFamily } = require('tailwindcss/defaultTheme');
export default {
  content: ['./src/**/*.{js,ts,jsx,tsx}', './theme/**/*.{js,ts,jsx,tsx}'],
  // When there is no explicit usage of the `.dark` class in project files,
  // tailwind will not include dark mode styles in the final bundle.
  // Adding 'dark' to safelist ensures the dark mode classes are preserved.
  // See: https://github.com/shadcn-ui/ui/issues/313#issuecomment-1927525155
  safelist: ['dark'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    backgroundColor: (ctx) => ({
      ...ctx.theme('colors'),
      white: 'var(--rp-c-bg)',
      soft: 'var(--rp-c-bg-soft)',
      mute: 'var(--rp-c-bg-mute)',
    }),
    extend: {
      colors: {
        border: 'var(--rp-c-divider)',
        input: 'var(--rp-c-divider)',
        ring: 'var(--rp-c-brand)',
        background: 'var(--rp-c-bg)',
        foreground: 'var(--rp-c-text-1)',
        primary: {
          DEFAULT: 'var(--rp-c-brand)',
          foreground: 'var(--rp-c-text-1)',
          hover: 'var(--rp-c-brand-dark)',
        },
        secondary: {
          DEFAULT: 'var(--rp-c-bg-soft)',
          foreground: 'var(--rp-c-text-2)',
        },
        destructive: {
          DEFAULT: 'var(--rp-c-danger)',
          foreground: 'var(--rp-c-text-1)',
        },
        muted: {
          DEFAULT: 'var(--rp-c-bg-mute)',
          foreground: 'var(--rp-c-text-2)',
        },
        accent: {
          DEFAULT: 'var(--rp-c-bg-soft)',
          foreground: 'var(--rp-c-brand)',
        },
        popover: {
          DEFAULT: 'var(--rp-c-bg)',
          foreground: 'var(--rp-c-text-1)',
        },
        card: {
          DEFAULT: 'var(--rp-c-bg)',
          foreground: 'var(--rp-c-text-1)',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', ...fontFamily.sans],
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'blink-caret': {
          'from, to': { borderColor: 'transparent' },
          '50%': { borderColor: 'currentColor' },
        },
        shine: {
          '0%': { backgroundPosition: '200% 50%' },
          '100%': { backgroundPosition: '-200% 50%' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'blink-caret': 'blink-caret 0.75s step-end infinite',
        shine: 'shine 14s linear infinite',
      },
      backgroundImage: {
        shine:
          'linear-gradient(120deg, transparent 0%, transparent 20%, var(--rp-c-brand) 40%, var(--rp-c-divider-secondary) 50%, var(--rp-c-brand) 60%, transparent 80%, transparent 100%)',
      },
      transitionProperty: {
        'gradient-border': 'opacity, transform',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
