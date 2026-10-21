// Chạy local. Trên Vercel file này không được gọi tới.
// Local run. This file is never invoked on Vercel.
const app = require('./app');
const { PORT } = require('./config/env');

app.listen(PORT, () => console.log(`API: http://localhost:${PORT}/api`));
