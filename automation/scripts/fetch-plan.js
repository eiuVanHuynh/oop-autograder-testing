// Lấy kế hoạch chạy của một run về plan.json, trước khi Playwright thu thập test.
// Fetches a run's plan into plan.json, before Playwright collects tests.
//
// Chạy tách rời (không nằm trong spec) vì Playwright cần biết danh sách test NGAY LÚC nạp
// file spec — không await được ở đó. Nhờ vậy mỗi test case là một test() thật: có retry,
// có trace, có screenshot riêng.
//
// plan.json KHÔNG chứa bí mật: test_data giữ nguyên 'env:TEN_BIEN', mật khẩu thật nằm ở
// GitHub Secrets và chỉ được giải lúc chạy bước FILL.
const fs = require('fs');
const path = require('path');

const { API_BASE_URL, INGEST_API_KEY, RUN_ID } = process.env;

async function main() {
  for (const [name, value] of Object.entries({ API_BASE_URL, INGEST_API_KEY, RUN_ID })) {
    if (!value) throw new Error(`Thiếu biến môi trường ${name}`);
  }

  const url = `${API_BASE_URL.replace(/\/$/, '')}/api/ingest/runs/${RUN_ID}/plan`;
  const res = await fetch(url, { headers: { 'x-api-key': INGEST_API_KEY } });
  if (!res.ok) {
    throw new Error(`GET plan ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }

  const { data } = await res.json();
  fs.writeFileSync(path.join(__dirname, '..', 'plan.json'), JSON.stringify(data, null, 2));
  console.log(`[plan] run ${data.runId}: ${data.cases.length} test case — ${data.cases.map((c) => c.code).join(', ')}`);
}

main().catch((err) => {
  console.error(`[plan] ${err.message}`);
  process.exit(1);
});
