// Comprehensive logging system for deployment debugging
import { writeFileSync, appendFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const LOG_DIR = join(process.cwd(), 'logs');
const LOG_FILE = join(LOG_DIR, 'deployment.log');
const ERROR_FILE = join(LOG_DIR, 'errors.log');

// Ensure logs directory exists
if (!existsSync(LOG_DIR)) {
  try {
    mkdirSync(LOG_DIR, { recursive: true });
  } catch (e) {
    console.error('Failed to create logs directory:', e);
  }
}

export class DeploymentLogger {
  static logToFile(level: string, message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level}] ${message}${data ? ' ' + JSON.stringify(data) : ''}\n`;
    
    try {
      appendFileSync(LOG_FILE, logEntry);
      if (level === 'ERROR' || level === 'CRITICAL') {
        appendFileSync(ERROR_FILE, logEntry);
      }
    } catch (e) {
      // Fallback to console if file writing fails
      console.error('Log write failed:', e);
    }
  }

  static info(message: string, data?: any) {
    console.log(`ℹ️ ${message}`, data || '');
    this.logToFile('INFO', message, data);
  }

  static warn(message: string, data?: any) {
    console.warn(`⚠️ ${message}`, data || '');
    this.logToFile('WARN', message, data);
  }

  static error(message: string, error?: any) {
    console.error(`💥 ${message}`, error || '');
    this.logToFile('ERROR', message, error ? {
      message: error.message,
      stack: error.stack,
      code: error.code,
      name: error.name
    } : undefined);
  }

  static critical(message: string, error?: any) {
    console.error(`🚨 CRITICAL: ${message}`, error || '');
    this.logToFile('CRITICAL', message, error ? {
      message: error.message,
      stack: error.stack,
      code: error.code,
      name: error.name
    } : undefined);
  }

  static deployment(message: string, data?: any) {
    console.log(`🚀 DEPLOYMENT: ${message}`, data || '');
    this.logToFile('DEPLOYMENT', message, data);
  }

  static health(message: string, responseTime?: number) {
    const logMessage = responseTime ? `${message} (${responseTime}ms)` : message;
    console.log(`🔍 HEALTH: ${logMessage}`);
    this.logToFile('HEALTH', logMessage);
  }

  static request(method: string, url: string, statusCode: number, responseTime: number, userAgent?: string) {
    const message = `${method} ${url} ${statusCode} ${responseTime}ms`;
    const data = userAgent ? { userAgent } : undefined;
    console.log(`📡 ${message}`, userAgent ? `[${userAgent}]` : '');
    this.logToFile('REQUEST', message, data);
  }

  static startup(phase: string, success: boolean, duration?: number, error?: any) {
    const message = `${phase}: ${success ? 'SUCCESS' : 'FAILED'}${duration ? ` (${duration}ms)` : ''}`;
    if (success) {
      console.log(`✅ ${message}`);
      this.logToFile('STARTUP', message);
    } else {
      console.error(`💥 ${message}`);
      this.logToFile('STARTUP_ERROR', message, error);
    }
  }

  static dumpState() {
    const state = {
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      nodeEnv: process.env.NODE_ENV,
      port: process.env.PORT,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
      pid: process.pid
    };
    
    this.logToFile('STATE_DUMP', 'Application state', state);
    return state;
  }
}

// Enhanced global error handlers with logging
process.on('uncaughtException', (error) => {
  DeploymentLogger.critical('Uncaught Exception', error);
  DeploymentLogger.dumpState();
  // Don't exit immediately, try to keep health checks working
  setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', (reason, promise) => {
  DeploymentLogger.critical('Unhandled Rejection', { reason, promise: promise.toString() });
});

// Log startup environment
DeploymentLogger.deployment('Logger initialized', {
  nodeEnv: process.env.NODE_ENV,
  port: process.env.PORT,
  nodeVersion: process.version
});