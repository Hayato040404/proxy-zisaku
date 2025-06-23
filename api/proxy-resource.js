const fetch = require('node-fetch');

module.exports = async (req, res) => {
  const { url } = req.query;
  if (!url || !url.startsWith('http')) {
    return res.status(400).json({ success: false, error: 'Invalid URL' });
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*',
      },
    });

    const contentType = response.headers.get('content-type');
    const data = await response.buffer();

    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).send(data);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
