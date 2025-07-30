#!/usr/bin/env node

// Production startup script with maximum deployment compatibility and logging
import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

console.log('🚀 DropDaily Production Startup with Enhanced Logging');
console.log('Environment:', {
  NODE_ENV: process.env.NODE_ENV || 'not set',
  PORT: process.env.PORT || '5000',
  timestamp: new Date().toISOString()
});

// Check if compiled version exists
const compiledPath = join(process.cwd(), 'dist', 'index.js');
const sourcePath = join(process.cwd(), 'server', 'index.ts');

let command, args;

if (existsSync(compiledPath)) {
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

console.log('📡 Starting server with command:', command, args.join(' '));

// Start the server
const server = spawn(command, args, {
  stdio: 'inherit',
  env: { ...process.env }
});

server.on('error', (error) => {
  console.error('💥 Server startup failed:', error);
  console.error('Error details:', {
    message: error.message,
    code: error.code,
    path: error.path
  });
  process.exit(1);
});

server.on('exit', (code) => {
  console.log(`Server exited with code ${code} at ${new Date().toISOString()}`);
  if (code !== 0) {
    console.error('💥 Non-zero exit code detected');
    process.exit(code);
  }
});

// Enhanced shutdown handling
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  server.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully');
  server.kill('SIGINT');
});

// Deployment readiness check
setTimeout(() => {
  console.log('✅ Production startup script is running normally');
}, 5000);