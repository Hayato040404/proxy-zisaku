const fetch = require('node-fetch');
const { URL } = require('url');

module.exports = async (req, res) => {
  let { url } = req.query;

  // URLが存在しない場合のエラーハンドリング
  if (!url) {
    return res.status(400).json({ success: false, error: 'URL parameter is missing' });
  }

  // URLデコードを試みる
  try {
    url = decodeURIComponent(url);
  } catch (e) {
    return res.status(400).json({ success: false, error: 'Invalid URL encoding' });
  }

  // 相対URLを絶対URLに変換（必要に応じてベースURLを指定）
  try {
    new URL(url); // 有効なURLかチェック
  } catch (e) {
    // 相対URLの場合、ベースURLを補完（例：YouTubeのドメイン）
    const baseUrl = 'https://www.youtube.com';
    url = new URL(url, baseUrl).href;
  }

  // URLがhttpまたはhttpsで始まるか確認
  if (!url.match(/^https?:\/\//)) {
    return res.status(400).json({ success: false, error: 'Invalid URL scheme' });
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': '*/*',
        'Referer': 'https://www.youtube.com/',
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ success: false, error: `Failed to fetch resource: ${response.statusText}` });
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const data = await response.buffer();

    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).send(data);
  } catch (error) {
    console.error('Proxy resource error:', error);
    res.status(500).json({ success: false, error: `Server error: ${error.message}` });
  }
};
