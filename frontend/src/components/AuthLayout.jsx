// Khung 2 cột cho Login / Register / Forgot password: hero thương hiệu bên trái, form bên phải.
// Two-column frame for Login / Register / Forgot password: brand hero left, form right.
//
// Cần làm / To do:
// - Cột trái: nền gradient brand-600 → brand-700, logo trên, khẩu hiệu + minh họa giữa, chân trang dưới.
//   Chỉ để trang trí nên ẩn dưới breakpoint lg.
// - Cột phải: canh giữa, bọc {children} trong khung rộng tối đa max-w-md.

import {
  Terminal,
  ShieldCheck,
  Check,
  CheckCircle2,
  Users,
} from "lucide-react";
// Dữ liệu trang trí cho cột trái (nội dung tĩnh, không gọi API)
const TERMINAL_LINES = [
  { text: "Suite: PolymorphismTest.cpp", value: "0.18s" },
  { text: "Valgrind Memory Leak: 0 bytes lost", value: "clean" },
  {
    text: "Assertion 12/12 verified (Deep Copy & Virtual Destructor)",
    value: "100 pts",
  },
];

const TERMINAL_TAGS = [
  { label: "Cluster v2.4 Online", dot: "bg-green-500" },
  { label: "Docker Sandbox Isolate", dot: "bg-blue-500" },
  { label: "LLVM Coverage: 98.4%", dot: "bg-brand-500" },
];

const FEATURES = [
  { title: "Automated Testing", desc: "Instant test case execution at scale" },
  { title: "Real-time Monitoring", desc: "Live terminal execution streams" },
  { title: "Centralized Reports", desc: "Automated rubric scoring 10/10" },
];

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen w-full grid lg:grid-cols-2 bg-slate-50">
      {/* Cột trái: hero thương hiệu, ẩn dưới breakpoint lg */}
      <div className="relative hidden lg:flex flex-col justify-between gap-8 overflow-hidden p-10 xl:p-12 bg-gradient-to-br from-brand-600 to-brand-700 text-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(circle,#fff_1px,transparent_1px)] [background-size:24px_24px]"
        />
        <div className="relative flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/15 border border-white/20 flex items-center justify-center">
              <Terminal size={20} />
            </div>
            <div>
              <p className="text-base font-semibold leading-5">OOP Grader</p>
              <p className="font-mono text-xs leading-4 text-white/70">
                system.ci.core
              </p>
            </div>
          </div>

          {/* Badge trạng thái */}
          <span className="inline-flex items-center gap-2 h-[22px] px-3 rounded-full bg-white/15 border border-white/20 text-[11px] font-semibold uppercase tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
            Auto-test v2.4 active
          </span>
        </div>
        <div className="relative space-y-6">
          {/* Pill nhãn nền tảng */}
          <span className="inline-flex items-center gap-2 h-7 px-3 rounded-full bg-white/15 border border-white/20 text-xs font-medium">
            <ShieldCheck size={14} />
            Automated Evaluation &amp; CI/CD Platform
          </span>

          {/* Tiêu đề: m-0 để ghi đè margin 32px của rule h1 trong index.css */}
          <h1 className="m-0 text-4xl font-bold leading-[44px] tracking-tight text-white">
            Smart Testing.
            <br />
            Accurate Results.
          </h1>

          <p className="max-w-md text-base leading-6 text-white/80">
            Manage, automate, and track software test suites in a unified
            platform for educators and software engineers.
          </p>

          {/* Khung terminal: nền #0F172A, viền hairline, không đổ bóng (theo spec) */}
          <div className="rounded-lg bg-slate-900 border border-white/10 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
              <span className="ml-2 font-mono text-xs text-slate-400">
                {"g++ -std=c++20 -O2 && ctest"}
              </span>
              <span className="ml-auto inline-flex items-center h-[22px] px-2 rounded bg-green-500/15 text-green-400 font-mono text-[11px] font-medium">
                PASS 100%
              </span>
            </div>

            <div className="p-4 space-y-2 font-mono text-xs tabular-nums">
              {TERMINAL_LINES.map(({ text, value }) => (
                <div
                  key={text}
                  className="flex items-center gap-2 text-green-400"
                >
                  <CheckCircle2 size={14} className="shrink-0" />
                  <span className="min-w-0 flex-1 text-slate-200">{text}</span>
                  <span className="shrink-0 text-slate-400">{value}</span>
                </div>
              ))}
            </div>

            <div className="px-4 pb-4 flex flex-wrap gap-2">
              {TERMINAL_TAGS.map(({ label, dot }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 h-6 px-2 rounded bg-white/5 border border-white/10 font-mono text-[11px] text-slate-200"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* 3 gạch đầu dòng */}
          <ul className="space-y-3">
            {FEATURES.map(({ title, desc }) => (
              <li key={title} className="flex items-center gap-3 text-sm">
                <span className="w-5 h-5 shrink-0 rounded-full bg-white/20 flex items-center justify-center">
                  <Check size={12} strokeWidth={3} />
                </span>
                <span>
                  <strong className="font-semibold">{title}</strong>
                  <span className="text-white/80"> — {desc}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-center gap-2 text-xs text-white/70">
          <Users size={14} className="shrink-0" />
          <p>
            Trusted by 1,200+ CS faculty &amp; software engineering students.{" "}
            <span className="font-mono">ISO/IEC 25010 compliant.</span>
          </p>
        </div>
      </div>

      {/* Cột phải: form */}
      <div className="flex items-center justify-center p-6 sm:p-8">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
