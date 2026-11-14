const http = require("http");
const fs = require("fs");
const path = require("path");
const { WebSocketServer } = require("ws");

function release() {
  try {
    return fs.readFileSync(path.join(__dirname, "public/zdt-marker.txt"), "utf8").trim();
  } catch {
    return "unknown";
  }
}

const started = Date.now();
const server = http.createServer((req, res) => {
  const url = (req.url || "/").split("?")[0];
  if (url === "/up" || url === "/healthz") {
    res.writeHead(200, { "content-type": "text/plain" });
    res.end("ok\n");
    return;
  }
  if (url === "/zdt-marker.txt") {
    res.writeHead(200, { "content-type": "text/plain" });
    res.end(release() + "\n");
    return;
  }
  if (url === "/" || url === "/index.html") {
    const rel = release();
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>wszdt ${rel}</title></head>
<body>
<h1>wszdt</h1>
<p>app release: ${rel}</p>
<p>pid: ${process.pid}</p>
<pre id="log"></pre>
<script>
const log = (m) => { document.getElementById("log").textContent += m + "\\n"; };
const proto = location.protocol === "https:" ? "wss" : "ws";
const ws = new WebSocket(proto + "://" + location.host + "/ws");
ws.onopen = () => log("open");
ws.onmessage = (e) => log("msg " + e.data);
ws.onclose = (e) => log("close " + e.code + " " + e.reason);
ws.onerror = () => log("error");
</script>
</body></html>`;
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(html);
    return;
  }
  res.writeHead(404, { "content-type": "text/plain" });
  res.end("not found\n");
});

const wss = new WebSocketServer({ server, path: "/ws" });
wss.on("connection", (socket) => {
  socket.send(JSON.stringify({ type: "hello", release: release(), pid: process.pid, started, t: Date.now() }));
  const iv = setInterval(() => {
    if (socket.readyState === 1) {
      socket.send(JSON.stringify({ type: "tick", release: release(), pid: process.pid, t: Date.now() }));
    }
  }, 2000);
  socket.on("message", (data) => {
    socket.send(JSON.stringify({ type: "echo", release: release(), data: String(data) }));
  });
  socket.on("close", () => clearInterval(iv));
});

const port = Number(process.env.PORT) || 3020;
server.listen(port, "0.0.0.0", () => {
  console.log("listening", port, release());
});
