import http from "http";

const PORT = 3000;
const VERSION = process.env.APP_VERSION ?? "1.0.0";
const DEPLOYED_AT = new Date().toISOString();

const server = http.createServer((req, res) => {
    res.setHeader("Content-Type", "application/json");

    if (req.method === "GET" && req.url === "/health") {
        res.writeHead(200);
        res.end(JSON.stringify({ status: "ok" }));
        return;
    }

    if (req.method === "GET" && req.url === "/version") {
        res.writeHead(200);
        res.end(JSON.stringify({ version: VERSION, deployedAt: DEPLOYED_AT }));
        return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

export default server;