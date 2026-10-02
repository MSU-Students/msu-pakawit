/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        msu: {
          maroon: {
            DEFAULT: '#7B1113',
            dark: '#590D0E',
            light: '#9B1619',
          },
          gold: {
            DEFAULT: '#F5A623',
            light: '#FFC83B',
            dark: '#D48806',
          },
          emerald: '#10B981',
          slate: '#1E293B',
        },
      },
    },
  },
  plugins: [],
}
