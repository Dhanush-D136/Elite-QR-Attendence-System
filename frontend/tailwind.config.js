/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'SF Pro Display', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        display: ['Manrope', 'Inter', 'sans-serif'],
      },
      colors: {
        surface: {
          bg: '#FAFAFA',
          card: '#FFFFFF',
          border: '#E7E7E7',
          sand: '#F7F3EE',
          lavender: '#F3F0FF',
        },
        brand: {
          purple: '#6D5DFC',
          blue: '#4F7CFF',
          green: '#12B76A',
          dark: '#111827',
          muted: '#6B7280',
        }
      },
      borderRadius: {
        '24': '24px',
        '20': '20px',
        '3xl': '24px',
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(0, 0, 0, 0.02), 0 1px 2px -1px rgba(0, 0, 0, 0.02)',
        'enterprise': '0 10px 30px -5px rgba(0, 0, 0, 0.03), 0 4px 12px -2px rgba(0, 0, 0, 0.02)',
        'floating': '0 20px 40px -15px rgba(109, 93, 252, 0.12), 0 8px 16px -4px rgba(0, 0, 0, 0.03)',
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        }
      }
    },
  },
  plugins: [],
}
