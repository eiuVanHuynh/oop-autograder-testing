const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');

// Chuỗi xử lý (Chain of Responsibility): cors → parse JSON → router → bắt lỗi.
// Processing chain (Chain of Responsibility): cors → JSON parse → router → error handler.
// File này đã đủ, không cần sửa khi thêm nhóm endpoint — khai báo ở routes/index.js.
// This file is complete; adding an endpoint group means editing routes/index.js instead.
const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use('/api', routes);

// errorHandler phải đứng cuối cùng, sau mọi route.
// errorHandler must come last, after every route.
app.use(errorHandler);

module.exports = app;
