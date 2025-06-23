const fetch = require('node-fetch');
const { URL } = require('url');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { url } = req.body;
  if (!url || !url.match(/^https?:\/\//)) {
    return res.status(400).json({ success: false, error: 'Invalid URL' });
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Referer': new URL(url).origin,
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ success: false, error: `Failed to fetch: ${response.statusText}` });
    }

    const contentType = response.headers.get('content-type') || 'text/html';
    let data = await response.buffer();

    if (contentType.includes('video') || contentType.includes('stream')) {
      res.setHeader('Content-Type', contentType);
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.status(200).send(data);
    }

    if (contentType.includes('text/html')) {
      data = data.toString();
      const baseUrl = new URL(url).origin;
      const proxyBase = '/api/proxy-resource?url=';

      // リソースURLを書き換え
      data = data.replace(/(href|src|action|data|poster)=["'](.*?)["']/gi, (match, attr, value) => {
        let newValue = value;
        try {
          if (value.startsWith('http') || value.startsWith('//')) {
            newValue = `${proxyBase}${encodeURIComponent(value)}`;
          } else if (value.startsWith('/')) {
            newValue = `${proxyBase}${encodeURIComponent(baseUrl + value)}`;
          } else if (!value.startsWith('#') && !value.startsWith('javascript:') && !value.startsWith('data:')) {
            newValue = `${proxyBase}${encodeURIComponent(new URL(value, baseUrl).href)}`;
          }
        } catch (e) {
          console.error(`Failed to rewrite URL: ${value}`, e);
        }
        return `${attr}="${newValue}"`;
      });

      // インラインスクリプトやJSON内のURLを書き換え
      data = data.replace(/['"](https?:\/\/[^'"]+)['"]/g, (match, url) => {
        return `"${proxyBase}${encodeURIComponent(url)}"`;
      });

      // プリロードリンクの書き換え
      data = data.replace(/<link[^>]+rel=["']preload["'][^>]+>/gi, (match) => {
        return match.replace(/(href)=["'](.*?)["']/i, (m, attr, value) => {
          let newValue = value;
          try {
            if (value.startsWith('http') || value.startsWith('//')) {
              newValue = `${proxyBase}${encodeURIComponent(value)}`;
            } else if (value.startsWith('/')) {
              newValue = `${proxyBase}${encodeURIComponent(baseUrl + value)}`;
            }
          } catch (e) {
            console.error(`Failed to rewrite preload URL: ${value}`, e);
          }
          return `${attr}="${newValue}"`;
        });
      });

      // baseタグを追加
      data = data.replace('<head>', `<head><base href="${baseUrl}">`);

      // CSPとX-Frame-Optionsを無効化
      res.setHeader('Content-Security-Policy', '');
      res.removeHeader('X-Frame-Options');
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).send(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ success: false, error: `Server error: ${error.message}` });
  }
};
