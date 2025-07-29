#!/usr/bin/env node
/**
 * Health check script for deployment verification
 * Tests that the server is responding properly to health check requests
 */

import http from 'http';

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || 'localhost';

function checkHealth() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: HOST,
      port: PORT,
      path: '/health',
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const response = JSON.parse(data);
            resolve({
              success: true,
              status: res.statusCode,
              response
            });
          } catch (e) {
            resolve({
              success: true,
              status: res.statusCode,
              response: data
            });
          }
        } else {
          reject(new Error(`Health check failed with status ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Health check request failed: ${error.message}`));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Health check request timed out'));
    });

    req.end();
  });
}

async function main() {
  console.log(`🔍 Checking health at http://${HOST}:${PORT}/health`);
  
  try {
    const result = await checkHealth();
    console.log('✅ Health check passed:');
    console.log(`   Status: ${result.status}`);
    console.log(`   Response:`, result.response);
    process.exit(0);
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    process.exit(1);
  }
}

// Only run if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { checkHealth };