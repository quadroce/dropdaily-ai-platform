#!/usr/bin/env node

// Script completo per debug deployment DropDaily
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🔍 DropDaily Deployment Debug Script');
console.log('====================================\n');

// Test 1: Verifica build production
console.log('1. Verificando build production...');
if (!fs.existsSync('dist/index.js')) {
  console.log('❌ Build mancante - eseguendo build...');
  try {
    spawn('npm', ['run', 'build'], { stdio: 'inherit' });
  } catch (error) {
    console.error('💥 Build fallito:', error.message);
  }
} else {
  console.log('✅ Build trovato');
}

// Test 2: Avvia server in modalità production
console.log('\n2. Avviando server in modalità production...');
process.env.NODE_ENV = 'production';
process.env.PORT = '5000';

const server = spawn('node', ['dist/index.js'], {
  env: { ...process.env },
  stdio: 'pipe'
});

server.stdout.on('data', (data) => {
  console.log('📟 Server:', data.toString().trim());
});

server.stderr.on('data', (data) => {
  console.error('💥 Server Error:', data.toString().trim());
});

// Test 3: Health check dopo 3 secondi
setTimeout(async () => {
  console.log('\n3. Testing health checks...');
  
  const testEndpoints = [
    'http://localhost:5000/',
    'http://localhost:5000/health',
    'http://localhost:5000/healthz'
  ];
  
  for (const url of testEndpoints) {
    try {
      const response = await fetch(url);
      console.log(`✅ ${url}: ${response.status} ${response.statusText}`);
      
      if (url === 'http://localhost:5000/') {
        const text = await response.text();
        if (text.includes('<!DOCTYPE html>')) {
          console.log('   📄 HTML content detected - React app serving');
        } else if (text === 'OK') {
          console.log('   ⚠️  Plain text response - health check mode');
        } else {
          console.log('   ❓ Unexpected response:', text.substring(0, 100));
        }
      }
    } catch (error) {
      console.error(`❌ ${url}: ${error.message}`);
    }
  }
  
  console.log('\n4. Deployment simulation...');
  
  // Test con User-Agent di deployment
  try {
    const deploymentResponse = await fetch('http://localhost:5000/', {
      headers: {
        'User-Agent': 'replit-deployment-health-check',
        'Accept': 'text/plain'
      }
    });
    console.log(`🚀 Deployment check: ${deploymentResponse.status} - ${await deploymentResponse.text()}`);
  } catch (error) {
    console.error('💥 Deployment test failed:', error.message);
  }
  
  // Uccidi il server dopo i test
  setTimeout(() => {
    server.kill();
    console.log('\n✅ Test completati');
    process.exit(0);
  }, 2000);
  
}, 3000);

// Gestione errori server
server.on('error', (error) => {
  console.error('💥 Failed to start server:', error);
  process.exit(1);
});

server.on('exit', (code) => {
  if (code !== 0) {
    console.error(`💥 Server exited with code ${code}`);
  }
});