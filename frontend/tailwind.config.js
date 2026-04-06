/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#6366f1", // Indigo 500
        secondary: "#ec4899", // Pink 500
        background: "#0f172a", // Slate 900
        surface: "#1e293b", // Slate 800
      }
    },
  },
  plugins: [],
}
