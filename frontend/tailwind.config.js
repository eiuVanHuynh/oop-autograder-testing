/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // Màu thương hiệu OOP Grader (indigo) theo bản thiết kế v3. Dùng `brand-600` thay cho `purple-600`.
      // OOP Grader brand colors (indigo) from design v3. Use `brand-600` instead of `purple-600`.
      colors: {
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
        },
      },
    },
  },
  plugins: [],
};
