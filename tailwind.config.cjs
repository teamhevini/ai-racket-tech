/** @type {import('tailwindcss').Config} */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;

module.exports = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: ["./client/src/**/*.{ts,tsx}", "./client/index.html"],
  theme: {
    extend: {
      colors: {
        // Surfaces
        bg: v("bg"),
        surface: v("surface"),
        "surface-2": v("surface-2"),
        line: v("line"),
        // Text
        ink: v("ink"),
        muted: v("muted"),
        faint: v("faint"),
        // Brand + tennis accents
        brand: { DEFAULT: v("brand"), ink: v("brand-ink"), soft: v("brand-soft") },
        grass: { DEFAULT: v("grass"), soft: v("grass-soft") },
        ball: { DEFAULT: v("ball"), ink: v("ball-ink") },
        clay: { DEFAULT: v("clay"), soft: v("clay-soft") },
        hard: { DEFAULT: v("hard"), soft: v("hard-soft") },
        // shadcn-compatible aliases used by the few Radix primitives we keep
        border: v("line"),
        background: v("bg"),
        foreground: v("ink"),
      },
      fontFamily: {
        sans: ['"Inter Tight"', "Inter", "system-ui", "sans-serif"],
        display: ['"Instrument Serif"', "Georgia", "serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.02em" }],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },
      boxShadow: {
        card: "0 1px 0 rgb(var(--shadow) / 0.04), 0 8px 24px -12px rgb(var(--shadow) / 0.18)",
        lift: "0 2px 0 rgb(var(--shadow) / 0.04), 0 18px 40px -18px rgb(var(--shadow) / 0.35)",
        glow: "0 0 0 4px rgb(var(--brand) / 0.15)",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      keyframes: {
        "fade-up": { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "none" } },
        shimmer: { from: { backgroundPosition: "-400px 0" }, to: { backgroundPosition: "400px 0" } },
        bounce: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-14px)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both",
        shimmer: "shimmer 1.4s linear infinite",
        "ball-bounce": "bounce 0.9s cubic-bezier(0.5, 0, 0.5, 1) infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
};
