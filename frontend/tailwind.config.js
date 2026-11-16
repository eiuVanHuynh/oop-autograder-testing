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
        gray: { 50: v("canvas"), 100: v("line-50"), 200: v("line-100"), 300: v("line-200") },
        slate: { 50: v("canvas"), 200: v("line-100") },
        // Nền thẻ/panel: 61 chỗ viết bg-white, nên trắng CŨNG phải là token, nếu không đổi
        // theme chỉ đổi được màu nhấn còn nền vẫn trắng. text-white đi theo luôn — ở theme
        // nature chữ thành #F6F9F6 trên nền teal đậm, mắt không phân biệt được.
        white: v("paper"),
      },
      // Bo góc cũng là token: theme nature vuông góc, nên rounded-lg/xl/2xl về 0.
      // rounded-full KHÔNG đụng tới — badge và avatar phải tròn ở cả hai theme.
      borderRadius: {
        md: "var(--r-md)",
        lg: "var(--r-lg)",
        xl: "var(--r-xl)",
        "2xl": "var(--r-2xl)",
      },
      // Đổ bóng cũng là token: theme nature nổi khối hơn một nhịp, mà 28 chỗ shadow-sm /
      // shadow-lg trong view không phải đổi tên class. Giá trị :root chép đúng nguyên văn
      // mặc định của Tailwind nên theme Indigo không đổi một pixel.
      boxShadow: {
        sm: "var(--shadow-sm)",
        DEFAULT: "var(--shadow)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
      },
      // Hoạt ảnh chuyển trang / chuyển tab. Thời lượng là MỘT token (--anim ở src/index.css)
      // để đổi một chỗ là đổi hết, và để prefers-reduced-motion tắt được bằng cách đặt lại nó.
      keyframes: {
        // Vào từ PHẢI sang TRÁI: bắt đầu lệch sang phải rồi trượt về chỗ.
        "page-in": {
          from: { opacity: "0", transform: "translateX(24px)" },
          to: { opacity: "1", transform: "none" },
        },
        "panel-in": {
          from: { opacity: "0", transform: "translateX(12px)" },
          to: { opacity: "1", transform: "none" },
        },
      },
      animation: {
        "page-in": "page-in var(--anim) cubic-bezier(0.22, 1, 0.36, 1) both",
        "panel-in": "panel-in var(--anim) cubic-bezier(0.22, 1, 0.36, 1) both",
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
