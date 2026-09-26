// Assembles the website into .site/ (site/ plus the app's UI in src/ and the demo pages and
// GIFs from design/, which the live demo loads) and, unless --build is passed, serves it.
//   pnpm site          build and serve at http://localhost:8080
//   pnpm site --build  build only (used by the Pages workflow)
import { cpSync, mkdirSync, rmSync, readFileSync, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const out = ".site";
rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, "design/demo"), { recursive: true });
cpSync("site", out, { recursive: true });
cpSync("src", join(out, "src"), { recursive: true });
for (const gif of ["demo.gif", "accounts.gif"]) cpSync(join("design", gif), join(out, "design", gif));
for (const page of ["island.html", "settings.html"]) cpSync(join("design/demo", page), join(out, "design/demo", page));
console.log(`Built ${out}/`);

if (!process.argv.includes("--build")) {
  const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".gif": "image/gif", ".svg": "image/svg+xml", ".json": "application/json" };
  const server = createServer((req, res) => {
    const path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^([/\\])+/, "");
    let file = join(out, path);
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
    if (!file.startsWith(out) || !existsSync(file)) {
      res.writeHead(404).end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": types[extname(file)] ?? "application/octet-stream" }).end(readFileSync(file));
  });
  // Start at 8080 (or $PORT) and move up if the port is taken.
  let port = Number(process.env.PORT) || 8080;
  server.on("error", (err) => {
    if (err.code !== "EADDRINUSE") throw err;
    port += 1;
    server.listen(port);
  });
  server.on("listening", () => console.log(`Serving at http://localhost:${port}`));
  server.listen(port);
}
