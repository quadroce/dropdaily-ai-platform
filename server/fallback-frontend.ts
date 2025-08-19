// Fallback frontend serving per deployment
import { type Express } from 'express';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { DeploymentLogger } from './logger.js';

// Track application state
let appState = {
  viteReady: false,
  databaseReady: false,
  lastUpdate: Date.now()
};

export function updateAppState(component: 'vite' | 'database', ready: boolean) {
  appState[component === 'vite' ? 'viteReady' : 'databaseReady'] = ready;
  appState.lastUpdate = Date.now();
  DeploymentLogger.info(`App state updated: ${component} = ${ready}`, appState);
}

function generateFallbackHTML() {
  const { viteReady, databaseReady } = appState;
  const isFullyReady = viteReady && databaseReady;
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DropDaily - ${isFullyReady ? 'Ready' : 'Starting'}</title>
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
            display: ${isFullyReady ? 'none' : 'block'};
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        h1 { color: #1e293b; margin-bottom: 10px; }
        p { color: #64748b; line-height: 1.6; }
        .status { background: #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .ready { color: #059669; }
        .pending { color: #d97706; }
        .error { color: #dc2626; }
        .button { 
            background: #3b82f6; color: white; padding: 10px 20px; 
            border: none; border-radius: 6px; cursor: pointer; margin: 10px;
            text-decoration: none; display: inline-block;
        }
    </style>
</head>
<body>
    <div class="container">
        ${!isFullyReady ? '<div class="spinner"></div>' : ''}
        <h1>DropDaily</h1>
        <p>AI-Powered Content Discovery Platform</p>
        
        <div class="status">
            <div class="${viteReady ? 'ready' : 'pending'}">
                Frontend: ${viteReady ? '✅ Ready' : '⏳ Loading...'}
            </div>
            <div class="${databaseReady ? 'ready' : 'error'}">
                Database: ${databaseReady ? '✅ Connected' : '❌ Connection Failed'}
            </div>
        </div>
        
        ${viteReady ? 
          `<a href="/" class="button">Enter Application ${!databaseReady ? '(Demo Mode)' : ''}</a>` : 
          '<p>Please wait while the application starts...</p>'
        }
        
        ${!databaseReady ? 
          '<p class="error">Running in demo mode - database features limited</p>' : 
          ''
        }
        
        <script>
            ${isFullyReady ? 
              'setTimeout(() => location.reload(), 500);' : 
              'setTimeout(() => location.reload(), 3000);'
            }
        </script>
    </div>
</body>
</html>
`;
}

const FALLBACK_HTML = generateFallbackHTML();

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
    
    // Fallback: serve dynamic loading page
    DeploymentLogger.info('Serving dynamic fallback page', appState);
    res.send(generateFallbackHTML());
  });
  
  DeploymentLogger.startup('Fallback frontend setup', true);
}