import AWSXRay from 'aws-xray-sdk-core';
import http from 'http';

const PORT = 3000;
const VERSION = process.env.APP_VERSION ?? '1.2.0';
const REGION = process.env.AWS_REGION ?? 'eu-west-1';
const DEPLOYED_AT = new Date().toISOString();

AWSXRay.setDaemonAddress('localhost:2000');
AWSXRay.config([AWSXRay.plugins.ECSPlugin]);

const healthHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Health - ops.faroukhasnaoui.tech</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0f1117; color: #e2e8f0;
      min-height: 100vh; display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 2rem; padding: 2rem;
    }
    .badge {
      display: flex; align-items: center; gap: 0.75rem;
      background: #1a1f2e; border: 1px solid #2d3748;
      border-radius: 9999px; padding: 0.5rem 1.25rem;
      font-size: 0.85rem; color: #a0aec0;
      letter-spacing: 0.05em; text-transform: uppercase;
    }
    .dot {
      width: 10px; height: 10px; border-radius: 50%;
      background: #48bb78; box-shadow: 0 0 8px #48bb78;
      animation: pulse 2s infinite;
    }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
    h1 {
      font-size: 3.5rem; font-weight: 700;
      background: linear-gradient(135deg, #48bb78, #38b2ac);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .subtitle { color: #718096; font-size: 1rem; }
    .grid {
      display: grid; grid-template-columns: repeat(2, 1fr);
      gap: 1rem; width: 100%; max-width: 640px;
    }
    .card {
      background: #1a1f2e; border: 1px solid #2d3748;
      border-radius: 12px; padding: 1.25rem 1.5rem;
    }
    .card-label {
      font-size: 0.7rem; text-transform: uppercase;
      letter-spacing: 0.1em; color: #4a5568; margin-bottom: 0.4rem;
    }
    .card-value { font-size: 1rem; font-weight: 600; color: #e2e8f0; word-break: break-all; }
    .card-value.green { color: #48bb78; }
    .links { display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center; }
    a { color: #63b3ed; text-decoration: none; font-size: 0.9rem; }
    a:hover { text-decoration: underline; }
    footer { color: #4a5568; font-size: 0.75rem; }
  </style>
</head>
<body>
  <div class="badge"><span class="dot"></span>All systems operational</div>
  <h1>&#10003; Healthy</h1>
  <p class="subtitle">ops.faroukhasnaoui.tech &mdash; Project 1: CI/CD Pipeline</p>
  <div class="grid">
    <div class="card"><div class="card-label">Status</div><div class="card-value green">ok</div></div>
    <div class="card"><div class="card-label">Version</div><div class="card-value">${VERSION}</div></div>
    <div class="card"><div class="card-label">Region</div><div class="card-value">${REGION}</div></div>
    <div class="card"><div class="card-label">Deployed at</div><div class="card-value">${DEPLOYED_AT}</div></div>
  </div>
  <div class="links">
    <a href="/version">JSON version</a>
    <a href="/dashboard">Dashboard &rarr;</a>
  </div>
  <footer>Deployed via CodePipeline &middot; Blue/Green on ECS Fargate &middot; eu-west-1</footer>
</body>
</html>`;

const server = http.createServer((req, res) => {
    const segment = new AWSXRay.Segment('portfolio-1-app');
    segment.addAnnotation('version', VERSION);
    segment.addAnnotation('path', req.url ?? '/');

    if (req.method === 'GET' && req.url === '/health') {
        const acceptsHtml = (req.headers['accept']?.includes('text/html') ?? false) ||
            (req.headers['user-agent']?.includes('Mozilla') ?? false);
        if (acceptsHtml) {
            res.setHeader('Content-Type', 'text/html');
            res.writeHead(200);
            res.end(healthHtml);
        } else {
            res.setHeader('Content-Type', 'application/json');
            const forceError = process.env.FORCE_ERROR === 'true';
            res.writeHead(forceError ? 500 : 200);
            res.end(JSON.stringify({ status: 'ok' }));
        }
        segment.close();
        return;
    }

    if (req.method === 'GET' && req.url === '/version') {
        const acceptsHtml = (req.headers['accept']?.includes('text/html') ?? false) ||
            (req.headers['user-agent']?.includes('Mozilla') ?? false);
        if (acceptsHtml) {
            res.setHeader('Content-Type', 'text/html');
            res.writeHead(200);
            res.end(`<!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
              <title>Version - ops.faroukhasnaoui.tech</title>
              <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                  background: #0f1117; color: #e2e8f0;
                  min-height: 100vh; display: flex; flex-direction: column;
                  align-items: center; justify-content: center; gap: 2rem; padding: 2rem;
                }
                .badge {
                  display: flex; align-items: center; gap: 0.75rem;
                  background: #1a1f2e; border: 1px solid #2d3748;
                  border-radius: 9999px; padding: 0.5rem 1.25rem;
                  font-size: 0.85rem; color: #a0aec0;
                  letter-spacing: 0.05em; text-transform: uppercase;
                }
                .dot { width: 10px; height: 10px; border-radius: 50%; background: #63b3ed; box-shadow: 0 0 8px #63b3ed; }
                h1 {
                  font-size: 3.5rem; font-weight: 700;
                  background: linear-gradient(135deg, #63b3ed, #764abc);
                  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
                  background-clip: text;
                }
                .subtitle { color: #718096; font-size: 1rem; }
                .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; width: 100%; max-width: 640px; }
                .card { background: #1a1f2e; border: 1px solid #2d3748; border-radius: 12px; padding: 1.25rem 1.5rem; }
                .card-label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.1em; color: #4a5568; margin-bottom: 0.4rem; }
                .card-value { font-size: 1rem; font-weight: 600; color: #e2e8f0; word-break: break-all; }
                .card-value.blue { color: #63b3ed; }
                .links { display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center; }
                a { color: #63b3ed; text-decoration: none; font-size: 0.9rem; }
                a:hover { text-decoration: underline; }
                footer { color: #4a5568; font-size: 0.75rem; }
              </style>
            </head>
            <body>
              <div class="badge"><span class="dot"></span>Current deployment</div>
              <h1>v${VERSION}</h1>
              <p class="subtitle">ops.faroukhasnaoui.tech &mdash; Project 1: CI/CD Pipeline</p>
              <div class="grid">
                <div class="card"><div class="card-label">Version</div><div class="card-value blue">${VERSION}</div></div>
                <div class="card"><div class="card-label">Region</div><div class="card-value">${REGION}</div></div>
                <div class="card"><div class="card-label">Deployed at</div><div class="card-value">${DEPLOYED_AT}</div></div>
                <div class="card"><div class="card-label">Status</div><div class="card-value blue">running</div></div>
              </div>
              <div class="links">
                <a href="/health">Health check</a>
                <a href="/dashboard">Dashboard &rarr;</a>
              </div>
              <footer>Deployed via CodePipeline &middot; Blue/Green on ECS Fargate &middot; eu-west-1</footer>
            </body>
            </html>`);
        } else {
            res.setHeader('Content-Type', 'application/json');
            res.writeHead(200);
            res.end(JSON.stringify({ version: VERSION, region: REGION, deployedAt: DEPLOYED_AT }));
        }
        segment.close();
        return;
    }

    if (req.method === 'GET' && req.url === '/dashboard') {
        res.writeHead(302, {
            Location: 'https://cloudwatch.amazonaws.com/dashboard.html?dashboard=portfolio-1-ops&context=eyJSIjoidXMtZWFzdC0xIiwiRCI6ImN3LWRiLTcyNTkyNzMxMDYxNSIsIlUiOiJ1cy1lYXN0LTFfS0E5dXJ1R3hKIiwiQyI6Ijc2NGFxZzBoZWhzb3AydG5rcmFmNDBpbTJmIiwiSSI6InVzLWVhc3QtMTphMzdiYjE1OS1jY2I5LTQxZjYtYWZkMy0yY2JkOTQ4ZjhmM2YiLCJNIjoiUHVibGljIn0=',
        });
        res.end();
        segment.close();
        return;
    }

    res.setHeader('Content-Type', 'application/json');
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
    segment.close();
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

export default server;