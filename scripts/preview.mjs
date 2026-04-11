import http from "node:http";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const DIST_DIR = path.resolve(process.cwd(), "dist");
const PORT = Number(process.env.PORT ?? 4173);
const HOST = process.env.HOST ?? "127.0.0.1";

const MIME_TYPES = {
  ".avif": "image/avif",
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".webp": "image/webp",
  ".woff2": "font/woff2"
};

function resolveInsideDist(targetPath) {
  const resolved = path.resolve(DIST_DIR, `.${targetPath}`);
  const relative = path.relative(DIST_DIR, resolved);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Path escapes dist");
  }

  return resolved;
}

function resolveFilePath(urlPath) {
  const parsed = new URL(urlPath, `http://${HOST}:${PORT}`);
  const cleanPath = decodeURIComponent(parsed.pathname);

  if (cleanPath === "/") {
    return resolveInsideDist("/index.html");
  }

  const targetPath = cleanPath.endsWith("/") ? `${cleanPath}index.html` : cleanPath;
  return resolveInsideDist(targetPath);
}

export async function startPreviewServer() {
  const server = http.createServer(async (request, response) => {
    try {
      const filePath = resolveFilePath(request.url ?? "/");
      const extension = path.extname(filePath);
      const content = await readFile(filePath);
      response.writeHead(200, { "content-type": MIME_TYPES[extension] ?? "application/octet-stream" });
      response.end(content);
    } catch {
      try {
        const fallbackPath = resolveInsideDist("/404.html");
        const content = await readFile(fallbackPath);
        response.writeHead(404, { "content-type": MIME_TYPES[".html"] });
        response.end(content);
      } catch {
        response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        response.end("Not found");
      }
    }
  });

  await new Promise((resolve) => server.listen(PORT, HOST, resolve));
  console.log(`preview server listening at http://${HOST}:${PORT}`);
  return server;
}

const isMainModule =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMainModule) {
  startPreviewServer().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
