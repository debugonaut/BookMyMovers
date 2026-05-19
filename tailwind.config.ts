// Plain tailwind configuration export to avoid import errors when tailwindcss is not installed
const config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "#00C9A7",
        "primary-dark": "#00A389",
        "primary-light": "#E6FAF7",
        "accent-blue": "#1B3FAB",
      },
    },
  },
  plugins: [],
};

export default config;
