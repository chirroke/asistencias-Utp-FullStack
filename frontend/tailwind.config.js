/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        utp: {
          red: '#C8102E',
          navy: '#002B49',
          dark: '#00182b',
        },
      },
    },
  },
  plugins: [],
}