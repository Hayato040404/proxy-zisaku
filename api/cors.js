import https from "https";
import http from "http";
import { parse as parseUrl } from "url";

export default async function handler(req, res) {
  // プリフライトリクエスト対応
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": req.headers["access-control-request-headers"] || "*"
    });
    res.end();
    return;
  }

  // ?url= で転送先を指定
  const { query } = parseUrl(req.url, true);
  const target = query.url;
  if (!target || !/^https?:\/\//.test(target)) {
    res.writeHead(400, { "Access-Control-Allow-Origin": "*" });
    res.end("Missing or invalid ?url= parameter");
    return;
  }

  const client = target.startsWith("https") ? https : http;
  const proxyReq = client.request(
    target,
    {
      method: req.method,
      headers: { ...req.headers, host: new URL(target).host }
    },
    proxyRes => {
      // CORSヘッダー付与
      const headers = { ...proxyRes.headers, "access-control-allow-origin": "*" };
      delete headers["set-cookie"];
      res.writeHead(proxyRes.statusCode, headers);
      proxyRes.pipe(res);
    }
  );

  proxyReq.on("error", err => {
    res.writeHead(502, { "Access-Control-Allow-Origin": "*" });
    res.end("Proxy error: " + err.message);
  });

  if (["POST", "PUT", "PATCH"].includes(req.method)) {
    req.pipe(proxyReq);
  } else {
    proxyReq.end();
  }
}

export const config = { runtime: "nodejs" };
