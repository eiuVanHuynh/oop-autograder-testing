// Xuất báo cáo PDF/HTML và link chia sẻ.
// PDF/HTML report export and share links.
// Quy tắc nghiệp vụ nằm ở đây. Không require pg, không chạm req/res.
// Business rules live here. Never require pg, never touch req/res.
// Nhận repository qua constructor để test thay được bằng bản giả.
// Takes its repositories through the constructor so tests can pass fakes.
//
// Cần làm / To do:
// - Dùng lại logic từ automation/scripts/export-report.js, đừng viết lại.
// - Vercel chỉ ghi được /tmp → stream thẳng về client.
// - Run chưa xong → 409. Link chia sẻ hết hạn → 410.
class ReportsService {
  constructor(deps = {}) {
    // TODO: nhận repository cần dùng từ config/container.js
  }

  // TODO
}

module.exports = ReportsService;
