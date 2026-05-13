import AWSXRay from 'aws-xray-sdk-core';
import http from 'http';

const PORT = 3000;
const VERSION = process.env.APP_VERSION ?? '1.2.0';
const REGION = process.env.AWS_REGION ?? 'eu-west-1';
const DEPLOYED_AT = new Date().toISOString();
const THUMBNAIL = 'https://raw.githubusercontent.com/EngenMe/aws-portfolio-1-cicd-ops/main/docs/aws-cicd-pipeline.png';
const GITHUB_URL = 'https://github.com/EngenMe/aws-portfolio-1-cicd-ops';
const LOOM_URL = 'https://www.loom.com/share/ae7642c083e247b19e16a83688d6b1e2';

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
    .hero-img {
      width: 100%; max-width: 740px; border-radius: 12px;
      border: 1px solid #2d3748;
      box-shadow: 0 0 40px rgba(72,187,120,0.15);
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
    .links a { color: #63b3ed; text-decoration: none; font-size: 0.9rem; }
    .links a:hover { text-decoration: underline; }
    .project-links {
      display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center;
    }
    .project-links a {
      display: flex; align-items: center; gap: 0.5rem;
      background: #1a1f2e; border: 1px solid #2d3748;
      border-radius: 8px; padding: 0.6rem 1.2rem;
      color: #e2e8f0; text-decoration: none; font-size: 0.9rem;
      transition: border-color 0.2s, color 0.2s;
    }
    .project-links a:hover { border-color: #48bb78; color: #48bb78; }
    footer { color: #4a5568; font-size: 0.75rem; }
  </style>
</head>
<body>

  <img src="${THUMBNAIL}" alt="Project Architecture" class="hero-img" />

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

  <div class="project-links">
    <a href="${GITHUB_URL}" target="_blank">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
      GitHub Repo
    </a>
    <a href="${LOOM_URL}" target="_blank">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
      Watch Demo
    </a>
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
            res.writeHead(200);
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