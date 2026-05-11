import AWSXRay from 'aws-xray-sdk-core';
import http from 'http';

const PORT = 3000;
const VERSION = process.env.APP_VERSION ?? '1.0.0';
const DEPLOYED_AT = new Date().toISOString();

// X-Ray captures all HTTP calls made by the app
AWSXRay.captureHTTPsGlobal(http, true);
AWSXRay.setDaemonAddress('localhost:2000');

const server = http.createServer((req, res) => {
    // X-Ray middleware — opens a segment for every incoming request
    const segment = AWSXRay.getSegment();
    if (segment) {
        segment.addAnnotation('version', VERSION);
    }

    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'GET' && req.url === '/health') {
        res.writeHead(200);
        res.end(JSON.stringify({ status: 'ok' }));
        return;
    }

    if (req.method === 'GET' && req.url === '/version') {
        res.writeHead(200);
        res.end(JSON.stringify({ version: VERSION, deployedAt: DEPLOYED_AT }));
        return;
    }

    if (req.method === 'GET' && req.url === '/dashboard') {
        res.writeHead(302, {
            Location: 'https://cloudwatch.amazonaws.com/dashboard.html?dashboard=portfolio-1-ops&context=eyJSIjoidXMtZWFzdC0xIiwiRCI6ImN3LWRiLTcyNTkyNzMxMDYxNSIsIlUiOiJ1cy1lYXN0LTFfS0E5dXJ1R3hKIiwiQyI6Ijc2NGFxZzBoZWhzb3AydG5rcmFmNDBpbTJmIiwiSSI6InVzLWVhc3QtMTphMzdiYjE1OS1jY2I5LTQxZjYtYWZkMy0yY2JkOTQ4ZjhmM2YiLCJNIjoiUHVibGljIn0=',
        });
        res.end();
        return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

export default server;