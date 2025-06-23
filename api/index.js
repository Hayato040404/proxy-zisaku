import https from "https";
import http from "http";
import { parse as parseUrl } from "url";

// Vercel serverless function entry point
export default async function handler(req, res) {
  try {
    let { pathname } = parseUrl(req.url);
    if (!pathname || pathname === "/") {
      res.writeHead(400, { "content-type": "text/plain" });
      res.end("Usage: /https://target-url");
      return;
    }
    let targetUrl = decodeURIComponent(pathname.slice(1));
    if (!/^https?:\/\//.test(targetUrl)) {
      res.writeHead(400, { "content-type": "text/plain" });
      res.end("URL must start with http:// or https://");
      return;
    }

    let headers = { ...req.headers };
    try {
      headers["host"] = new URL(targetUrl).host;
      headers["x-forwarded-for"] = req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "";
      delete headers["referer"];
      delete headers["origin"];
    } catch {}

    let client = targetUrl.startsWith("https") ? https : http;
    let proxyReq = client.request(
      targetUrl,
      {
        method: req.method,
        headers,
      },
      proxyRes => {
        let resHeaders = { ...proxyRes.headers };
        resHeaders["access-control-allow-origin"] = "*";
        resHeaders["access-control-allow-credentials"] = "true";
        resHeaders["access-control-expose-headers"] = "*";
        if ("set-cookie" in resHeaders) delete resHeaders["set-cookie"];
        res.writeHead(proxyRes.statusCode, resHeaders);
        proxyRes.pipe(res);
      }
    );

    proxyReq.on("error", error => {
      res.writeHead(502, { "content-type": "text/plain" });
      res.end("Proxy error: " + error.message);
    });

    if (["POST", "PUT", "PATCH"].includes(req.method)) {
      req.pipe(proxyReq);
    } else {
      proxyReq.end();
    }
  } catch (e) {
    res.writeHead(500, { "content-type": "text/plain" });
    res.end("Server error: " + e.message);
  }
}

export const config = {
  runtime: "nodejs",
};
