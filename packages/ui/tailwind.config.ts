import type { Config } from 'tailwindcss';
import { colors } from './src/tokens/colors.js';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: colors.primary,
        neutral: colors.neutral,
        destructive: colors.destructive,
        warning: colors.warning,
        info: colors.info,
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.5rem',
      },
    },
  },
  plugins: [],
};

export default config;
