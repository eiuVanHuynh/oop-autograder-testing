// Liệt kê các endpoint ĐANG hoạt động, đọc từ bảng route của Express chứ không từ
// tài liệu viết tay — nên không bao giờ lệch với code. Chạy: npm run routes
//
// Không cần kết nối DB: chỉ require app rồi đi qua router stack.
// No DB needed: it only requires the app and walks the router stack.
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://x:x@localhost:5432/x';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'x';

const app = require('../src/app');
const requireAuth = require('../src/middlewares/requireAuth');
const requireApiKey = require('../src/middlewares/requireApiKey');

// Express 4 giữ tiền tố của router con trong layer.regexp — gỡ ngược ra thành chuỗi.
const prefixOf = (layer) => {
  if (layer.path) return layer.path;
  const m = /^\^\\\/(.*?)\\\/\?/.exec(layer.regexp.source);
  return m ? `/${m[1].replace(/\\\//g, '/')}` : '';
};

const walk = (stack, prefix, out) => {
  for (const layer of stack) {
    if (layer.route) {
      const handlers = layer.route.stack.map((s) => s.handle);
      out.push({
        methods: Object.keys(layer.route.methods).map((x) => x.toUpperCase()),
        path: (prefix + layer.route.path).replace(/\/$/, '') || '/',
        auth: handlers.includes(requireAuth)
          ? 'JWT'
          : handlers.includes(requireApiKey)
            ? 'API key'
            : 'công khai',
        // requireRole tự gắn .roles vào middleware nó trả về
        roles: handlers.find((h) => h.roles)?.roles ?? null,
      });
    } else if (layer.name === 'router' && layer.handle?.stack) {
      walk(layer.handle.stack, prefix + prefixOf(layer), out);
    }
  }
};

const routes = [];
walk(app._router.stack, '', routes);
routes.sort((a, b) => a.path.localeCompare(b.path) || a.methods[0].localeCompare(b.methods[0]));

if (!routes.length) {
  console.log('Không có endpoint nào đang hoạt động.');
  process.exit(0);
}

const rows = routes.map((r) => [
  r.methods.join(','),
  r.path,
  r.auth,
  r.roles ? r.roles.join(', ') : r.auth === 'công khai' ? '—' : 'mọi user đã đăng nhập',
]);
const head = ['METHOD', 'ĐƯỜNG DẪN', 'XÁC THỰC', 'VAI TRÒ'];
const w = head.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
const line = (cells) => cells.map((c, i) => c.padEnd(w[i])).join('  ');

console.log(`\n${routes.length} endpoint đang hoạt động:\n`);
console.log(line(head));
console.log(w.map((n) => '-'.repeat(n)).join('  '));
rows.forEach((r) => console.log(line(r)));

// Nhóm nào đã mount router nhưng chưa có route nào — controller còn rỗng.
const mounted = [];
walk(app._router.stack, '', []);
for (const layer of app._router.stack) {
  if (layer.name !== 'router' || !layer.handle?.stack) continue;
  for (const sub of layer.handle.stack) {
    if (sub.name === 'router' && sub.handle?.stack) {
      const inner = [];
      walk(sub.handle.stack, '', inner);
      if (!inner.length) mounted.push(prefixOf(layer) + prefixOf(sub));
    }
  }
}
if (mounted.length) {
  console.log(`\nĐã mount nhưng CHƯA có endpoint nào (controller còn rỗng):`);
  mounted.forEach((p) => console.log(`  ${p}`));
}
console.log();
