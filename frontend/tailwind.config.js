/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Core brand palette — locked from landing page
        cream: '#fef3e0',
        ink: '#1a0b2e',
        pink: {
          hot: '#ff3d8a',
          soft: '#ffb3d1',
        },
        purple: {
          electric: '#8b3dff',
          deep: '#5a189a',
          night: '#2d0a4e',
        },
        yellow: {
          pop: '#ffd60a',
        },
        mint: '#7df9c0',
      },
      fontFamily: {
        display: ['"Rubik Mono One"', 'sans-serif'],
        body: ['"Zen Maru Gothic"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'hard-sm': '3px 3px 0 #1a0b2e',
        'hard': '4px 4px 0 #1a0b2e',
        'hard-md': '6px 6px 0 #1a0b2e',
        'hard-lg': '8px 8px 0 #1a0b2e',
        'hard-xl': '12px 12px 0 #1a0b2e',
        'hard-pink': '4px 4px 0 #ff3d8a',
        'hard-yellow': '4px 4px 0 #ffd60a',
      },
      animation: {
        'float-1': 'float1 6s ease-in-out infinite',
        'float-2': 'float2 7s ease-in-out infinite',
        'float-3': 'float3 8s ease-in-out infinite',
        'bob': 'bob 4s ease-in-out infinite',
        'badge-bob': 'badgeBob 3s ease-in-out infinite',
        'sparkle': 'sparkleSpin 4s linear infinite',
        'marquee': 'marquee 30s linear infinite',
        'pulse-dot': 'pulse 2s infinite',
      },
      keyframes: {
        float1: {
          '0%, 100%': { transform: 'rotate(-8deg) translateY(0)' },
          '50%': { transform: 'rotate(-6deg) translateY(-12px)' },
        },
        float2: {
          '0%, 100%': { transform: 'rotate(5deg) translateY(0)' },
          '50%': { transform: 'rotate(7deg) translateY(-10px)' },
        },
        float3: {
          '0%, 100%': { transform: 'rotate(-4deg) translateY(0)' },
          '50%': { transform: 'rotate(-2deg) translateY(-8px)' },
        },
        bob: {
          '0%, 100%': { transform: 'translateY(0) rotate(0)' },
          '50%': { transform: 'translateY(-8px) rotate(2deg)' },
        },
        badgeBob: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-3px)' },
        },
        sparkleSpin: {
          '0%': { transform: 'scale(0.8) rotate(0)', opacity: '0.6' },
          '50%': { transform: 'scale(1.2) rotate(180deg)', opacity: '1' },
          '100%': { transform: 'scale(0.8) rotate(360deg)', opacity: '0.6' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        pulse: {
          '0%': { boxShadow: '0 0 0 0 rgba(0, 183, 106, 0.6)' },
          '70%': { boxShadow: '0 0 0 8px rgba(0, 183, 106, 0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(0, 183, 106, 0)' },
        },
      },
    },
  },
  plugins: [],
}
