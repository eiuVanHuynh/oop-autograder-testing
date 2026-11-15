// Lists the endpoints that are LIVE, read from Express's route table rather than from
// hand-written docs — so it can never drift from the code. Run: npm run routes
//
// No DB connection needed: it just requires the app and walks the router stack.
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://x:x@localhost:5432/x';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'x';

const app = require('../src/app');
const requireAuth = require('../src/middlewares/requireAuth');
const requireApiKey = require('../src/middlewares/requireApiKey');

// Express 4 keeps a sub-router's prefix in layer.regexp — unpick it back into a string.
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
            : 'public',
        // requireRole attaches .roles to the middleware it returns
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
  console.log('No endpoint is live.');
  process.exit(0);
}

const rows = routes.map((r) => [
  r.methods.join(','),
  r.path,
  r.auth,
  r.roles ? r.roles.join(', ') : r.auth === 'public' ? '—' : 'any signed-in user',
]);
const head = ['METHOD', 'PATH', 'AUTH', 'ROLES'];
const w = head.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
const line = (cells) => cells.map((c, i) => c.padEnd(w[i])).join('  ');

console.log(`\n${routes.length} live endpoints:\n`);
console.log(line(head));
console.log(w.map((n) => '-'.repeat(n)).join('  '));
rows.forEach((r) => console.log(line(r)));

// Groups whose router is mounted but that have no route yet — an empty controller.
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
  console.log(`\nMounted but NO endpoint yet (controller still empty):`);
  mounted.forEach((p) => console.log(`  ${p}`));
}
console.log();
