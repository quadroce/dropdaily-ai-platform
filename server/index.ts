import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeDatabase, handleDatabaseError } from "./scripts/db-init";

const app = express();

// Add immediate health check endpoints BEFORE any middleware
// These must respond immediately without dependencies
app.get("/", (req, res) => {
  res.status(200).json({ 
    status: "healthy", 
    timestamp: new Date().toISOString(),
    service: "DropDaily API",
    version: "1.0.0",
    uptime: process.uptime()
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "healthy", 
    timestamp: new Date().toISOString(),
    service: "DropDaily API",
    version: "1.0.0",
    uptime: process.uptime()
  });
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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

(async () => {
  try {
    log('🔗 Setting up routes...');
    const server = await registerRoutes(app);
    log('✅ Routes setup completed');

    // Error handling middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      
      console.error('Express error:', err);
      res.status(status).json({ message });
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      log('⚡ Setting up Vite development server...');
      await setupVite(app, server);
      log('✅ Vite setup completed');
    } else {
      log('📁 Setting up static file serving...');
      serveStatic(app);
      log('✅ Static file serving setup completed');
    }

    // ALWAYS serve the app on the port specified in the environment variable PORT
    // Other ports are firewalled. Default to 5000 if not specified.
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = parseInt(process.env.PORT || '5000', 10);
    
    log(`🚀 Starting server on port ${port}...`);
    server.listen(port, "0.0.0.0", () => {
      log(`✅ Server is running on port ${port}`);
      log(`🌐 Health check: http://localhost:${port}/health`);
      
      // Initialize database after server is running to avoid blocking health checks
      initializeAppData();
    });

    // Handle server errors
    server.on('error', (error: any) => {
      console.error('Server error:', error);
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use`);
        process.exit(1);
      }
    });

  } catch (error) {
    console.error('💥 Application startup failed:', error);
    
    // Don't call handleDatabaseError here as it may cause double exit
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Stack trace:', error.stack);
    }
    
    process.exit(1);
  }
})();

// Initialize database and app data after server is running
async function initializeAppData(): Promise<void> {
  try {
    log('🗄️ Initializing database...');
    
    // Add timeout for database initialization to prevent hanging
    const dbInitPromise = initializeDatabase();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database initialization timeout after 30 seconds')), 30000);
    });
    
    await Promise.race([dbInitPromise, timeoutPromise]);
    log('✅ Database initialization completed');
    
    // Initialize topics with error handling and timeout
    try {
      log('📚 Initializing topics...');
      const { initializeTopics } = await import('./services/contentIngestion');
      
      const topicsInitPromise = initializeTopics();
      const topicsTimeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Topics initialization timeout after 20 seconds')), 20000);
      });
      
      await Promise.race([topicsInitPromise, topicsTimeoutPromise]);
      log('✅ Topic initialization completed');
    } catch (topicError) {
      console.error('⚠️ Topic initialization failed, but continuing:', topicError);
      // Don't throw - continue with other initialization steps
    }
    
    // Setup automated content cleanup (only in production)
    if (process.env.NODE_ENV === 'production') {
      try {
        log('🧹 Setting up cleanup cron...');
        const { setupCleanupCron } = await import('./scripts/setup-cleanup-cron');
        setupCleanupCron();
        log('✅ Cleanup cron setup completed');
      } catch (cronError) {
        console.error('⚠️ Cleanup cron setup failed, but continuing:', cronError);
      }
    }

  } catch (error) {
    console.error('💥 Post-startup initialization failed:', error);
    // Don't exit the process here - let the server continue running
    // This allows the health check to pass even if some initialization fails
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Stack trace:', error.stack);
    }
  }
}
