const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

// CORSヘッダーを追加
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  
  // OPTIONSリクエストに対応
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// プロキシ設定
app.use('/', createProxyMiddleware({
  target: 'http://example.com', // デフォルトターゲット（必要に応じて変更）
  changeOrigin: true,
  router: (req) => {
    // リクエストパスからターゲットURLを取得
    const targetUrl = req.url.slice(1); // 先頭のスラッシュを削除
    if (!targetUrl) {
      throw new Error('Target URL is required');
    }
    return targetUrl;
  },
  onError: (err, req, res) => {
    res.status(500).json({ error: 'Proxy error', message: err.message });
  },
  // HTTPS対応
  secure: false,
}));

// Vercel用のエクスポート
module.exports = app;
