export default {
  content: ["./index.html","./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: '#6A40A7',
        accent: '#DF00FF',
        dark: '#28282B',
        lighterDark: '#3A3A3E',
        card: '#4A4A4E',
      },
      fontFamily: {
        'space-grotesk': ['"Space Grotesk"', 'sans-serif'],
        'inter': ['"Inter"', 'sans-serif'],
        'code': ['"Source Code Pro"', 'monospace'],
      },
      borderRadius: {
        '2xl': '1rem',
      },
    },
  },
  plugins: [],
}
