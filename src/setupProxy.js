const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '.',
    createProxyMiddleware({
      target: 'http://wp.12all.tv:1357',
      changeOrigin: true,
    })
  );
};