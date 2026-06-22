/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: '#10b981',
        ink: '#0b0f14',
        panel: '#11161d',
        panel2: '#161d26',
        line: '#1f2937',
        flirt: '#fb7185',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
