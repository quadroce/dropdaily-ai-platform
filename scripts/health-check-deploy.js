#!/usr/bin/env node
/**
 * Production Health Check for Deployment
 * Quick verification that the server is responding to health checks
 */

import http from 'http';

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

async function checkHealth() {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const req = http.get({
      hostname: HOST === '0.0.0.0' ? 'localhost' : HOST,
      port: PORT,
      path: '/health',
      timeout: 3000, // 3 second timeout
    }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const responseTime = Date.now() - startTime;
        
        if (res.statusCode === 200) {
          console.log(`✅ Health check passed (${responseTime}ms)`);
          console.log(`📡 Response: ${data}`);
          resolve({ success: true, responseTime, data });
        } else {
          console.log(`❌ Health check failed with status: ${res.statusCode}`);
          reject(new Error(`Health check failed: ${res.statusCode}`));
        }
      });
    });
    
    req.on('error', (error) => {
      console.log(`❌ Health check failed: ${error.message}`);
      reject(error);
    });
    
    req.on('timeout', () => {
      req.destroy();
      console.log('❌ Health check timed out');
      reject(new Error('Health check timeout'));
    });
  });
}

async function main() {
  try {
    console.log(`🏥 Running health check on ${HOST}:${PORT}...`);
    await checkHealth();
    process.exit(0);
  } catch (error) {
    console.error('Health check failed:', error.message);
    process.exit(1);
  }
}

main();