const { randomUUID } = require('node:crypto');

// Một chỗ duy nhất dựng dòng test_evidences, cho CẢ HAI đường chạy test:
//   - CI (GitHub Actions) đẩy ảnh qua POST /ingest/results/:id/evidences  → ingest.service
//   - PlaywrightRunner chạy ngay trong backend (local)                    → PlaywrightRunner
// Gộp ở đây để URL và mime chỉ có một bản: hai bản là hai cách sai khác nhau.
const MIME_BY_TYPE = { screenshot: 'image/png', trace: 'application/zip' };

// item: { type, path, data?: base64, content?: Buffer, mime? }
// Có file (data hoặc content) → giữ bytes, sinh token, file_path thành URL tải được.
// Không có → chỉ ghi đường dẫn (trace: zip vài MB nằm trong artifact của CI).
function toEvidenceRow(item, baseUrl) {
  const content = item.content || (item.data ? Buffer.from(item.data, 'base64') : null);
  if (!content) return { type: item.type, path: item.path };

  const token = randomUUID();
  return {
    type: item.type,
    path: `${String(baseUrl).replace(/\/$/, '')}/api/evidences/${token}`,
    content,
    mime: item.mime || MIME_BY_TYPE[item.type],
    token,
  };
}

const toEvidenceRows = (items, baseUrl) => items.map((item) => toEvidenceRow(item, baseUrl));

module.exports = { toEvidenceRows, MIME_BY_TYPE };
