const fetch = require('node-fetch');
const { URL } = require('url');

module.exports = async (req, res) => {
  let { url } = req.query;

  if (!url) {
    return res.status(400).json({ success: false, error: 'URL parameter is missing' });
  }

  try {
    url = decodeURIComponent(url);
  } catch (e) {
    return res.status(400).json({ success: false, error: 'Invalid URL encoding' });
  }

  try {
    new URL(url);
  } catch (e) {
    const baseUrl = 'https://www.youtube.com';
    url = new URL(url, baseUrl).href;
  }

  if (!url.match(/^https?:\/\//)) {
    return res.status(400).json({ success: false, error: 'Invalid URL scheme' });
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': '*/*',
        'Referer': new URL(url).origin,
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ success: false, error: `Failed to fetch resource: ${response.statusText}` });
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    let data = await response.buffer();

    // JSやCSSの場合、URLを書き換え
    if (contentType.includes('javascript') || contentType.includes('css')) {
      data = data.toString();
      const baseUrl = new URL(url).origin;
      const proxyBase = '/api/proxy-resource?url=';
      data = data.replace(/(url\(['"]?)(.*?)(['"]?\))/gi, (match, prefix, value, suffix) => {
        let newValue = value;
        try {
          if (value.startsWith('http') || value.startsWith('//')) {
            newValue = `${proxyBase}${encodeURIComponent(value)}`;
          } else if (value.startsWith('/')) {
            newValue = `${proxyBase}${encodeURIComponent(baseUrl + value)}`;
          }
        } catch (e) {
          console.error(`Failed to rewrite URL in resource: ${value}`, e);
        }
        return `${prefix}${newValue}${suffix}`;
      });
      data = data.replace(/['"](https?:\/\/[^'"]+)['"]/g, (match, url) => {
        return `"${proxyBase}${encodeURIComponent(url)}"`;
      });
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).send(data);
  } catch (error) {
    console.error('Proxy resource error:', error);
    res.status(500).json({ success: false, error: `Server error: ${error.message}` });
  }
};
