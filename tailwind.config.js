/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#18141F",
        card: "#221B2E",
        card2: "#2A2138",
        purple: "#5B2D8B",
        lavender: "#CDB7E9",
        green: "#4CAF7A",
        amber: "#E6B566",
        red: "#D46A6A",
      },
    },
  },
  plugins: [],
};