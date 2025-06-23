const fetch = require('node-fetch');
const { URL } = require('url');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { url } = req.body;
  if (!url || !url.startsWith('http')) {
    return res.status(400).json({ success: false, error: 'Invalid URL' });
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      },
    });

    const contentType = response.headers.get('content-type');
    let data = await response.buffer();

    // 動画ストリーミングの場合、データをそのまま返す
    if (contentType.includes('video') || contentType.includes('stream')) {
      res.setHeader('Content-Type', contentType);
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.status(200).send(data);
    }

    // HTMLの場合、リソースURLをプロキシURLに書き換える
    if (contentType.includes('text/html')) {
      data = data.toString();
      const baseUrl = new URL(url).origin;
      const proxyBase = '/api/proxy-resource?url=';

      // 相対URLをプロキシURLに変換
      data = data.replace(/(href|src|action)=["'](.*?)["']/gi, (match, attr, value) => {
        if (value.startsWith('http') || value.startsWith('//')) {
          return `${attr}="${proxyBase}${encodeURIComponent(value)}"`;
        } else if (value.startsWith('/')) {
          return `${attr}="${proxyBase}${encodeURIComponent(baseUrl + value)}"`;
        }
        return match;
      });

      // CSPとX-Frame-Optionsを無効化
      res.setHeader('Content-Security-Policy', '');
      res.removeHeader('X-Frame-Options');
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).send(data);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
