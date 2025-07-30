// Fallback frontend serving per deployment
import { type Express } from 'express';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { DeploymentLogger } from './logger.js';

const FALLBACK_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DropDaily - Loading...</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0; padding: 40px; background: #f8fafc; color: #334155;
            display: flex; align-items: center; justify-content: center; min-height: 100vh;
        }
        .container { text-align: center; max-width: 500px; }
        .spinner { 
            width: 40px; height: 40px; border: 3px solid #e2e8f0;
            border-top: 3px solid #3b82f6; border-radius: 50%;
            animation: spin 1s linear infinite; margin: 0 auto 20px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        h1 { color: #1e293b; margin-bottom: 10px; }
        p { color: #64748b; line-height: 1.6; }
    </style>
</head>
<body>
    <div class="container">
        <div class="spinner"></div>
        <h1>DropDaily</h1>
        <p>AI-Powered Content Discovery Platform</p>
        <p>Application is starting up...</p>
        <script>
            // Auto-refresh every 2 seconds until the full app loads
            setTimeout(() => location.reload(), 2000);
        </script>
    </div>
</body>
</html>
`;

export function setupFallbackFrontend(app: Express) {
  DeploymentLogger.info('Setting up fallback frontend');
  
  // Serve fallback HTML for root requests when Vite isn't ready
  app.get('/', (req, res, next) => {
    const userAgent = req.get('User-Agent') || '';
    
    // Skip fallback for deployment health checks
    if (userAgent.toLowerCase().includes('deployment') || 
        userAgent.toLowerCase().includes('health') ||
        userAgent.toLowerCase().includes('monitor')) {
      return next();
    }
    
    // Check if dist/index.html exists (production build)
    const distIndexPath = join(process.cwd(), 'dist', 'index.html');
    if (existsSync(distIndexPath)) {
      try {
        const html = readFileSync(distIndexPath, 'utf8');
        DeploymentLogger.info('Serving production build HTML');
        return res.send(html);
      } catch (error) {
        DeploymentLogger.warn('Failed to read production HTML', error);
      }
    }
    
    // Fallback: serve loading page
    DeploymentLogger.info('Serving fallback loading page');
    res.send(FALLBACK_HTML);
  });
  
  DeploymentLogger.startup('Fallback frontend setup', true);
}