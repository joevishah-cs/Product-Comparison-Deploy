/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        daikin: {
          50: "#eef8ff",
          100: "#d9efff",
          200: "#bce4ff",
          300: "#8ed4ff",
          400: "#59bcff",
          500: "#2e9fff",
          600: "#0097e0",
          700: "#0079b5",
          800: "#066695",
          900: "#0b557b",
        },
        navy: {
          50: "#f4f7fb",
          100: "#e7edf6",
          200: "#cbd9ea",
          300: "#9db8d8",
          400: "#6892c1",
          500: "#4574aa",
          600: "#345c8e",
          700: "#2b4a73",
          800: "#274060",
          900: "#0f2740",
          950: "#0a1a2b",
        },
        canvas: "#f6f9fc",
        edge: "#e4ecf4",
        verified: {
          50: "#effaf3",
          100: "#d8f3e1",
          500: "#16a45c",
          600: "#108048",
          700: "#0e6539",
        },
        caution: {
          50: "#fff8eb",
          100: "#feefc7",
          500: "#e0900b",
          600: "#b97309",
          700: "#8f5709",
        },
        risk: {
          50: "#fef2f2",
          100: "#fee2e2",
          500: "#e0333a",
          600: "#bb2027",
          700: "#951b21",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      fontSize: {
        xs: ["0.8125rem", { lineHeight: "1.15rem" }],
        sm: ["0.9375rem", { lineHeight: "1.4rem" }],
        base: ["1rem", { lineHeight: "1.6rem" }],
        lg: ["1.125rem", { lineHeight: "1.75rem" }],
        xl: ["1.3125rem", { lineHeight: "1.9rem" }],
        "2xl": ["1.625rem", { lineHeight: "2.1rem" }],
        "3xl": ["2rem", { lineHeight: "2.4rem" }],
        "4xl": ["2.5rem", { lineHeight: "2.9rem" }],
        "5xl": ["3.25rem", { lineHeight: "3.5rem" }],
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1rem",
        "3xl": "1.25rem",
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,39,64,0.04), 0 8px 24px -12px rgba(15,39,64,0.14)",
        lift: "0 2px 4px rgba(15,39,64,0.05), 0 18px 40px -18px rgba(15,39,64,0.28)",
        pop: "0 24px 60px -20px rgba(15,39,64,0.35)",
        glow: "0 1px 2px rgba(15,39,64,0.04), 0 12px 32px -10px rgba(0,151,224,0.35)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        drift: {
          from: { transform: "translate3d(0,0,0)" },
          to: { transform: "translate3d(0,22px,0)" },
        },
        /* Login backdrop: oversized soft shapes breathing very slowly. Transform
           only, so the whole scene stays on the compositor. */
        "float-slow": {
          "0%, 100%": { transform: "translate3d(0,0,0) scale(1)" },
          "50%": { transform: "translate3d(-2.5%,-3.5%,0) scale(1.08)" },
        },
        "float-slower": {
          "0%, 100%": { transform: "translate3d(0,0,0) scale(1.05)" },
          "50%": { transform: "translate3d(3%,2.5%,0) scale(1)" },
        },
        /* A light bloom easing around the panel — the "aurora" layer. */
        aurora: {
          "0%, 100%": { transform: "translate3d(0,0,0) scale(1)", opacity: "0.55" },
          "33%": { transform: "translate3d(-6%,4%,0) scale(1.15)", opacity: "0.8" },
          "66%": { transform: "translate3d(5%,-3%,0) scale(1.05)", opacity: "0.65" },
        },
        /* Slow rising motes. */
        rise: {
          "0%": { transform: "translate3d(0,0,0)", opacity: "0" },
          "12%": { opacity: "0.55" },
          "80%": { opacity: "0.35" },
          "100%": { transform: "translate3d(0,-58vh,0)", opacity: "0" },
        },
      },
      animation: {
        /* `backwards` (not `both`) so the finished animation releases `transform`
           back to the cascade — hover lifts on the same element keep working. */
        "fade-up": "fade-up 0.35s cubic-bezier(0.16,1,0.3,1) backwards",
        "scale-in": "scale-in 0.18s cubic-bezier(0.16,1,0.3,1) backwards",
        shimmer: "shimmer 1.8s ease-in-out infinite",
        drift: "drift 14s ease-in-out infinite alternate",
        "float-slow": "float-slow 24s ease-in-out infinite",
        "float-slower": "float-slower 32s ease-in-out infinite",
        aurora: "aurora 28s ease-in-out infinite",
        rise: "rise 18s linear infinite",
      },
      maxWidth: { content: "1600px" },
    },
  },
  plugins: [],
};
