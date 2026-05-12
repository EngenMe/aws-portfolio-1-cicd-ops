import http from "http";
import server from "../src/index";

const PORT = 3000;

afterAll(() => {
    server.close();
});

function get(path: string): Promise<{ status: number; body: unknown }> {
    return new Promise((resolve, reject) => {
        http
            .get(`http://localhost:${PORT}${path}`, (res) => {
                let raw = "";
                res.on("data", (chunk) => (raw += chunk));
                res.on("end", () => {
                    resolve({ status: res.statusCode ?? 0, body: JSON.parse(raw) });
                });
            })
            .on("error", reject);
    });
}

test("GET /health returns 200 and status ok", async () => {
    const { status, body } = await get("/health");
    expect(status).toBe(200);
    expect(body).toEqual({ status: "ok" });
});

test("GET /version returns 200 and version field", async () => {
    const { status, body } = await get("/version");
    expect(status).toBe(200);
    expect((body as { version: string }).version).toBe("1.1.0");
});

test("GET /unknown returns 404", async () => {
    const { status } = await get("/unknown");
    expect(status).toBe(404);
});