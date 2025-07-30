// Emergency health check test for deployment debugging
const http = require('http');

// Create minimal server that only responds to health checks
const server = http.createServer((req, res) => {
  console.log(`Health check request: ${req.method} ${req.url}`);
  console.log(`User-Agent: ${req.headers['user-agent']}`);
  console.log(`Accept: ${req.headers['accept']}`);
  
  // Respond to ANY request with OK for debugging
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('HEALTH_OK');
});

const port = process.env.PORT || 5000;
server.listen(port, '0.0.0.0', () => {
  console.log(`🔍 Health check test server running on port ${port}`);
});

// Keep alive
setInterval(() => {
  console.log('🔍 Server still alive');
}, 30000);