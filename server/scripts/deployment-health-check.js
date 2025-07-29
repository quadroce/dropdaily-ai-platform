#!/usr/bin/env node
/**
 * Deployment Health Check Script
 * Verifies server health before deployment considers the app ready
 */

import http from 'http';

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';
const MAX_RETRIES = 30;
const RETRY_DELAY = 1000;

async function checkHealth(retryCount = 0) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: HOST === '0.0.0.0' ? 'localhost' : HOST,
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
            if (response.status === 'healthy') {
              console.log('✅ Health check passed');
              console.log('Response:', response);
              resolve(response);
            } else {
              reject(new Error(`Unhealthy status: ${response.status}`));
            }
          } catch (parseError) {
            reject(new Error(`Invalid JSON response: ${data}`));
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      if (retryCount < MAX_RETRIES) {
        console.log(`⏳ Health check failed (attempt ${retryCount + 1}/${MAX_RETRIES}): ${error.message}`);
        setTimeout(() => {
          checkHealth(retryCount + 1).then(resolve).catch(reject);
        }, RETRY_DELAY);
      } else {
        reject(new Error(`Health check failed after ${MAX_RETRIES} attempts: ${error.message}`));
      }
    });

    req.on('timeout', () => {
      req.destroy();
      if (retryCount < MAX_RETRIES) {
        console.log(`⏳ Health check timeout (attempt ${retryCount + 1}/${MAX_RETRIES})`);
        setTimeout(() => {
          checkHealth(retryCount + 1).then(resolve).catch(reject);
        }, RETRY_DELAY);
      } else {
        reject(new Error(`Health check timed out after ${MAX_RETRIES} attempts`));
      }
    });

    req.end();
  });
}

async function main() {
  console.log(`🔍 Checking health at http://${HOST}:${PORT}/health`);
  
  try {
    const response = await checkHealth();
    console.log('🎉 Deployment health check successful');
    process.exit(0);
  } catch (error) {
    console.error('💥 Deployment health check failed:', error.message);
    process.exit(1);
  }
}

// Run directly if called as script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { checkHealth };