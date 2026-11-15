const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');
const requestLog = require('./middlewares/requestLog');

// Chain of Responsibility: cors → parse JSON → router → error handler.
// This file is complete; adding an endpoint group needs no change here — declare it in routes/index.js.
const app = express();

app.use(requestLog);
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use('/api', routes);

// errorHandler must come last, after every route.
app.use(errorHandler);

module.exports = app;
