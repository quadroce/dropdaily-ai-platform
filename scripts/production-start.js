#!/usr/bin/env node
/**
 * Production startup script optimized for deployment health checks
 * Ensures the server starts quickly and health endpoints respond immediately
 */

import { spawn } from 'child_process';
import http from 'http';

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

// Production environment variables
process.env.NODE_ENV = 'production';

console.log('🚀 Starting DropDaily in production mode...');
console.log(`📡 Port: ${PORT}, Host: ${HOST}`);

// Start the main application
const server = spawn('node', ['dist/index.js'], {
  stdio: 'inherit',
  env: process.env
});

// Health check function
async function waitForHealthCheck(maxAttempts = 30, interval = 1000) {
  console.log('⏳ Waiting for server to respond to health checks...');
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get({
          hostname: HOST === '0.0.0.0' ? 'localhost' : HOST,
          port: PORT,
          path: '/health',
          timeout: 2000,
        }, (res) => {
          if (res.statusCode === 200) {
            console.log(`✅ Health check passed on attempt ${attempt}`);
            resolve(true);
          } else {
            reject(new Error(`Health check failed: ${res.statusCode}`));
          }
        });
        
        req.on('error', reject);
        req.on('timeout', () => {
          req.destroy();
          reject(new Error('Health check timeout'));
        });
      });
      
      console.log('🎉 Server is ready for deployment!');
      return true;
      
    } catch (error) {
      if (attempt === maxAttempts) {
        console.error(`❌ Health check failed after ${maxAttempts} attempts`);
        console.error('Last error:', error.message);
        process.exit(1);
      }
      
      console.log(`⏳ Health check attempt ${attempt}/${maxAttempts} failed, retrying in ${interval}ms...`);
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }
}

// Handle server exit
server.on('exit', (code, signal) => {
  console.log(`Server process exited with code ${code} and signal ${signal}`);
  process.exit(code || 0);
});

server.on('error', (error) => {
  console.error('Server process error:', error);
  process.exit(1);
});

// Wait for server to be ready
setTimeout(() => {
  waitForHealthCheck().catch((error) => {
    console.error('Health check failed:', error);
    server.kill();
    process.exit(1);
  });
}, 2000); // Give server 2 seconds to start before checking