// Điểm vào cho Vercel: serverless chỉ cần đối tượng app, không gọi listen.
// Vercel entry point: serverless only needs the app object, never listen.
module.exports = require('../src/app');
