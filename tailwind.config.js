/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/src/**/*.{js,ts,jsx,tsx}', './src/renderer/index.html'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"SF Pro Text"',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif'
        ]
      },
      borderRadius: {
        macos: '10px',
        'macos-sm': '6px',
        'macos-lg': '14px'
      },
      colors: {
        macos: {
          bg: '#1e1e1e',
          sidebar: '#252525',
          toolbar: '#2d2d2d',
          surface: '#2a2a2a',
          border: '#3a3a3a',
          accent: '#0A84FF',
          text: '#f5f5f5',
          'text-secondary': '#ababab'
        }
      },
      backdropBlur: {
        macos: '20px'
      }
    }
  },
  plugins: []
}
