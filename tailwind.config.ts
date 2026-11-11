import type { Config } from "tailwindcss"

/** hsl(var(--token) / <alpha-value>) so `bg-gain/10`, `border-primary/30` etc. all work */

const c = (v: string) => `hsl(var(--${v}) / <alpha-value>)`

const config: Config = {

  darkMode: ["class"],

  content: [

    "./pages/**/*.{js,ts,jsx,tsx,mdx}",

    "./components/**/*.{js,ts,jsx,tsx,mdx}",

    "./app/**/*.{js,ts,jsx,tsx,mdx}",

  ],

  theme: {

    container: {

      center: true,

      padding: { DEFAULT: "1rem", sm: "1.5rem", lg: "2rem" },

      screens: { "2xl": "1440px" },

    },

    extend: {

      fontFamily: {

        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],

        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],

      },

      colors: {

        border: c("border"),

        input: c("input"),

        ring: c("ring"),

        background: c("background"),

        foreground: c("foreground"),

        primary: { DEFAULT: c("primary"), foreground: c("primary-foreground") },

        secondary: { DEFAULT: c("secondary"), foreground: c("secondary-foreground") },

        destructive: { DEFAULT: c("destructive"), foreground: c("destructive-foreground") },

        muted: { DEFAULT: c("muted"), foreground: c("muted-foreground") },

        accent: { DEFAULT: c("accent"), foreground: c("accent-foreground") },

        popover: { DEFAULT: c("popover"), foreground: c("popover-foreground") },

        card: { DEFAULT: c("card"), foreground: c("card-foreground") },

        /* brand + semantic finance colours */

        brand: c("brand"),

        gain: { DEFAULT: c("gain"), foreground: c("gain-foreground") },

        loss: { DEFAULT: c("loss"), foreground: c("loss-foreground") },

        warning: c("warning"),

        info: c("info"),

        chart: {

          1: c("chart-1"),

          2: c("chart-2"),

          3: c("chart-3"),

          4: c("chart-4"),

          5: c("chart-5"),

        },

        sidebar: {

          DEFAULT: c("sidebar-background"),

          foreground: c("sidebar-foreground"),

          primary: c("sidebar-primary"),

          "primary-foreground": c("sidebar-primary-foreground"),

          accent: c("sidebar-accent"),

          "accent-foreground": c("sidebar-accent-foreground"),

          border: c("sidebar-border"),

          ring: c("sidebar-ring"),

        },

        /* ---- legacy aliases so existing pages keep rendering ---- */

        dark: c("foreground"),

        "calm-green": { light: c("gain"), DEFAULT: c("gain"), dark: c("gain") },

        action: {

          buy: { DEFAULT: c("gain"), light: "hsl(var(--gain) / 0.12)", hover: "hsl(var(--gain) / 0.85)" },

          sell: { DEFAULT: c("loss"), light: "hsl(var(--loss) / 0.12)", hover: "hsl(var(--loss) / 0.85)" },

        },

      },

      borderRadius: {

        lg: "var(--radius)",

        md: "calc(var(--radius) - 2px)",

        sm: "calc(var(--radius) - 4px)",

        xl: "calc(var(--radius) + 4px)",

        "2xl": "calc(var(--radius) + 8px)",

      },

      boxShadow: {

        card: "0 1px 2px hsl(var(--shadow) / 0.05), 0 8px 24px -14px hsl(var(--shadow) / 0.18)",

        pop: "0 12px 40px -12px hsl(var(--shadow) / 0.35)",

        glow: "0 0 0 1px hsl(var(--primary) / 0.35), 0 8px 30px -8px hsl(var(--primary) / 0.45)",

      },

      keyframes: {

        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },

        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },

        "fade-up": { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "translateY(0)" } },

        shimmer: { "100%": { transform: "translateX(100%)" } },

        "pulse-dot": { "0%,100%": { opacity: "1", transform: "scale(1)" }, "50%": { opacity: ".4", transform: "scale(.8)" } },

      },

      animation: {

        "accordion-down": "accordion-down 0.2s ease-out",

        "accordion-up": "accordion-up 0.2s ease-out",

        "fade-up": "fade-up 0.4s ease-out both",

        "pulse-dot": "pulse-dot 1.8s ease-in-out infinite",

      },

    },

  },

  plugins: [require("tailwindcss-animate")],

}

export default config
