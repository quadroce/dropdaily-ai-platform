#!/usr/bin/env node

// Production startup script with maximum deployment compatibility
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 DropDaily Production Startup');
console.log('NODE_ENV:', process.env.NODE_ENV || 'not set');
console.log('PORT:', process.env.PORT || '5000');

// Check if compiled version exists
const compiledPath = path.join(__dirname, 'dist', 'index.js');
const sourcePath = path.join(__dirname, 'server', 'index.ts');

let command, args;

if (fs.existsSync(compiledPath)) {
  console.log('✅ Using compiled server from dist/index.js');
  command = 'node';
  args = [compiledPath];
} else {
  console.log('⚠️ Compiled server not found, using source with tsx');
  command = 'npx';
  args = ['tsx', sourcePath];
}

// Set production environment
process.env.NODE_ENV = 'production';

// Start the server
const server = spawn(command, args, {
  stdio: 'inherit',
  env: { ...process.env }
});

server.on('error', (error) => {
  console.error('💥 Server startup failed:', error);
  process.exit(1);
});

server.on('exit', (code) => {
  console.log(`Server exited with code ${code}`);
  if (code !== 0) {
    process.exit(code);
  }
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  server.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully');
  server.kill('SIGINT');
});