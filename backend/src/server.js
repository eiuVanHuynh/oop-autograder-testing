// Local run. On Vercel this file is never called.
const app = require('./app');
const { PORT } = require('./config/env');

app.listen(PORT, () => console.log(`[api] http://localhost:${PORT}/api`));
