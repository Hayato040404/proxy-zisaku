```javascript
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

// CORSヘッダーを追加
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// プロキシ設定
app.use('/', createProxyMiddleware({
  target: 'https://example.com', // デフォルト（routerで上書き）
  changeOrigin: true,
  router: (req) => {
    const targetPath = req.url.slice(1); // 先頭のスラッシュを削除
    if (!targetPath) {
      throw new Error('Target URL is required');
    }
    // ホストとパスを分離（例: api.example.com/data）
    const match = targetPath.match(/^([^\/]+)(\/.*)?$/);
    if (!match) {
      throw new Error('Invalid target URL format. Expected: host/path (e.g., api.example.com/data)');
    }
    const host = match[1]; // api.example.com
    const path = match[2] || ''; // /data または空
    // ホストが有効なドメインか簡易チェック
    if (!host.match(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)) {
      throw new Error('Invalid hostname');
    }
    // HTTPSをデフォルトで付加
    const targetUrl = `https://${host}${path}`;
    return targetUrl;
  },
  onError: (err, req, res) => {
    res.status(500).json({ error: 'Proxy error', message: err.message });
  },
  secure: false, // テスト用。必要に応じてtrueに
}));

// Vercel用のエクスポート
module.exports = app;
