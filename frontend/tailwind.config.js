/** @type {import('tailwindcss').Config} */

// Token của theme nằm ở src/index.css dưới dạng biến CSS, nên đổi theme = đổi một thuộc tính
// data-theme trên <html>, KHÔNG phải build lại Tailwind và không phải sửa class trong view.
// Biến phải chứa 3 kênh RGB rời ("79 70 229"), không phải mã hex — viết hex vào thì mọi
// class màu hỏng im lặng, build vẫn xanh.
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Màu thương hiệu. Giá trị thật xem src/index.css: indigo (mặc định) / xanh ngọc (nature).
        // Brand colors; actual values live in src/index.css, one block per theme.
        brand: {
          50: v("brand-50"),
          100: v("brand-100"),
          200: v("brand-200"),
          500: v("brand-500"),
          600: v("brand-600"),
          700: v("brand-700"),
        },
        // Panel tối + nền giấy của theme nature. Theme mặc định để giá trị trung tính.
        ink: { 700: v("ink-700"), 800: v("ink-800"), 900: v("ink-900") },
        canvas: v("canvas"),
        paper: v("paper"),
        // Ba mức xám dưới đây là ĐƯỜNG KẺ và NỀN NHẠT của giao diện (border-gray-200,
        // bg-gray-100, divide-gray-100...). Ghi đè ngay trong bảng màu của Tailwind để
        // ~80 chỗ trong view không phải đổi tên class. Theme mặc định giữ nguyên giá trị
        // gray gốc của Tailwind, nên không có gì đổi màu ngoài ý muốn.
        gray: { 100: v("line-50"), 200: v("line-100"), 300: v("line-200") },
        slate: { 200: v("line-100") },
      },
      // Bo góc cũng là token: theme nature vuông góc, nên rounded-lg/xl/2xl về 0.
      // rounded-full KHÔNG đụng tới — badge và avatar phải tròn ở cả hai theme.
      borderRadius: {
        md: "var(--r-md)",
        lg: "var(--r-lg)",
        xl: "var(--r-xl)",
        "2xl": "var(--r-2xl)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["var(--heading)", "Georgia", "serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
