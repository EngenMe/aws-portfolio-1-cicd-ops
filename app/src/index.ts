import AWSXRay from 'aws-xray-sdk-core';
import http from 'http';

const PORT = 3000;
const VERSION = process.env.APP_VERSION ?? '1.0.0';
const DEPLOYED_AT = new Date().toISOString();

AWSXRay.setDaemonAddress('localhost:2000');
AWSXRay.config([AWSXRay.plugins.ECSPlugin]);

const server = http.createServer((req, res) => {
    const segment = new AWSXRay.Segment('portfolio-1-app');
    segment.addAnnotation('version', VERSION);
    segment.addAnnotation('path', req.url ?? '/');

    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'GET' && req.url === '/health') {
        res.writeHead(200);
        res.end(JSON.stringify({ status: 'ok' }));
        segment.close();
        return;
    }

    if (req.method === 'GET' && req.url === '/version') {
        res.writeHead(200);
        res.end(JSON.stringify({ version: VERSION, deployedAt: DEPLOYED_AT }));
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

    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
    segment.close();
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

export default server;