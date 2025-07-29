import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// CRITICAL: Immediate health check endpoints for deployment
// These MUST respond instantly with no database dependencies
app.get("/", (req, res) => {
  res.status(200).json({ status: "healthy" });
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy" });
});

app.get("/healthz", (req, res) => {
  res.status(200).send("OK");
});

app.get("/ready", (req, res) => {
  res.status(200).json({ ready: true });
});

// Simplified startup - no async operations that could block health checks
const server = createServer(app);



// Start server immediately for health checks
const port = parseInt(process.env.PORT || '5000', 10);

server.listen(port, "0.0.0.0", () => {
  log(`✅ Server is running on port ${port}`);
  log(`🌐 Health endpoints: /, /health, /healthz, /ready`);
  
  // Setup everything else in background after server is responding
  setupAppInBackground();
});

// Handle server errors
server.on('error', (error: any) => {
  console.error('Server error:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use`);
    process.exit(1);
  }
});

// Background setup function - runs after server is responding to health checks
async function setupAppInBackground(): Promise<void> {
  try {
    log('🚀 Starting background app setup...');
    
    // Basic middleware setup
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));

    // Request logging middleware
    app.use((req, res, next) => {
      const start = Date.now();
      const path = req.path;
      let capturedJsonResponse: Record<string, any> | undefined = undefined;

      const originalResJson = res.json;
      res.json = function (bodyJson, ...args) {
        capturedJsonResponse = bodyJson;
        return originalResJson.apply(res, [bodyJson, ...args]);
      };

      res.on("finish", () => {
        const duration = Date.now() - start;
        if (path.startsWith("/api")) {
          let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
          if (capturedJsonResponse) {
            logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
          }

          if (logLine.length > 80) {
            logLine = logLine.slice(0, 79) + "…";
          }

          log(logLine);
        }
      });

      next();
    });

    // Setup routes
    log('🔗 Setting up routes...');
    await registerRoutes(app);
    log('✅ Routes setup completed');

    // Error handling middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      
      console.error('Express error:', err);
      res.status(status).json({ message });
    });

    // Setup Vite or static serving
    if (app.get("env") === "development") {
      log('⚡ Setting up Vite development server...');
      await setupVite(app, server);
      log('✅ Vite setup completed');
    } else {
      log('📁 Setting up static file serving...');
      serveStatic(app);
      log('✅ Static file serving setup completed');
    }

    // Initialize database in background (fire-and-forget)
    initializeDatabaseInBackground();
    
    // Setup cleanup cron independently (fire-and-forget)
    if (process.env.NODE_ENV === 'production') {
      import('./scripts/setup-cleanup-cron')
        .then(({ setupCleanupCron }) => {
          log('🧹 Setting up cleanup cron...');
          setupCleanupCron();
          log('✅ Cleanup cron setup completed');
        })
        .catch((cronError: any) => {
          console.error('⚠️ Cleanup cron setup failed, but continuing:', cronError);
        });
    }
    
    log('🎉 Background app setup completed');
    
  } catch (error) {
    console.error('⚠️ Background setup failed, but health checks remain operational:', error);
  }
}

// Fire-and-forget database initialization
function initializeDatabaseInBackground(): void {
  import('./scripts/db-init')
    .then(({ initializeDatabase }) => {
      log('🗄️ Starting database initialization...');
      
      return initializeDatabase()
        .then(() => {
          log('✅ Database initialization completed');
          
          // Only start topics initialization after database is ready
          return import('./services/contentIngestion')
            .then(({ initializeTopics }) => {
              log('📚 Initializing topics...');
              
              return initializeTopics()
                .then(() => {
                  log('✅ Topic initialization completed');
                })
                .catch((topicError: any) => {
                  console.error('⚠️ Topic initialization failed, but continuing:', topicError);
                });
            })
            .catch((importError: any) => {
              console.error('⚠️ Failed to import content ingestion module:', importError);
            });
        });
    })
    .catch((dbError: any) => {
      console.error('💥 Database initialization failed:', dbError);
      console.error('⚠️ Server remains operational for health checks');
    });
}
