/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bxp: {
          navy: "#1B1FA8",
          navydeep: "#141782",
          cream: "#F7F5EF",
          ink: "#0C0C10",
          gold: "#C9A24B",
        },
        bone: "#F6F3EC",
        ink: "#1C1B19",
        muted: "#6B6862",
        forest: "#1F3A2E",
        forestlight: "#28503F",
        brass: "#B08D57",
        stone: "#DDD6C8",
      },
      fontFamily: {
        display: ["'Barlow Condensed'", "sans-serif"],
        serif: ["'Fraunces'", "serif"],
        mark: ["'Poppins'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
      },
    },
  },
  plugins: [],
}

