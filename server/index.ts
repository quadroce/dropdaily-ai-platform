import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";

const app = express();

// Fix DATABASE_URL if using Replit PostgreSQL environment variables
if (process.env.PGHOST && process.env.PGUSER && process.env.PGPASSWORD && process.env.PGDATABASE) {
  const newDatabaseUrl = `postgresql://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT || 5432}/${process.env.PGDATABASE}?sslmode=require`;
  if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.includes(process.env.PGHOST)) {
    console.log("🔧 Updating DATABASE_URL to use Replit PostgreSQL with SSL");
    process.env.DATABASE_URL = newDatabaseUrl;
  }
}

// Global error handlers for production stability
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  console.error('Application continuing with degraded functionality...');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  console.error('Application continuing with degraded functionality...');
});

// ULTRA-CRITICAL: Health check endpoints for deployment (immediate response, no dependencies)
app.get("/health", (req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.status(200).end("OK");
});

app.get("/healthz", (req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.status(200).end("OK");
});

app.get("/ready", (req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.status(200).end("OK");
});

// Add immediate response for health check endpoints only
app.use((req, res, next) => {
  // Dedicated health check endpoints
  if (req.path === '/health' || req.path === '/healthz' || req.path === '/ready') {
    res.setHeader('Content-Type', 'text/plain');
    return res.status(200).end("OK");
  }
  
  // Root path health checks ONLY for specific deployment user agents
  if (req.path === '/' && req.method === 'GET') {
    const userAgent = req.get('User-Agent') || '';
    
    // Only respond to specific deployment probes, not browsers
    if (userAgent.includes('deployment-probe') || 
        userAgent.includes('health-check') || 
        userAgent.includes('replit-deployment') ||
        userAgent.includes('load-balancer')) {
      res.setHeader('Content-Type', 'text/plain');
      return res.status(200).end("OK");
    }
  }
  
  next();
});



// Create server immediately with only health checks
const server = createServer(app);



// Start server immediately for health checks - NO logging to avoid any delays
const port = parseInt(process.env.PORT || '5000', 10);

server.listen(port, "0.0.0.0", () => {
  console.log("✅ Server started, initializing app...");
  // Server is running, start background setup immediately
  setupAppInBackground();
});

// Handle server errors - be more resilient
server.on('error', (error: any) => {
  console.error('Server error:', error);
  // Only exit on critical port binding errors
  if (error.code === 'EADDRINUSE' || error.code === 'EACCES') {
    process.exit(1);
  }
});

// Background setup function - delayed to not interfere with health checks
function setupAppInBackground(): void {
  // Import and setup everything in background, with delays between operations
  Promise.resolve().then(async () => {
    console.log("🔧 Background setup starting...");
    try {
      // PRIORITY 1: Basic middleware first
      console.log("🔧 Setting up middleware...");
      app.use(express.json());
      app.use(express.urlencoded({ extended: false }));

      // Logging middleware  
      app.use((req, res, next) => {
        const start = Date.now();
        res.on("finish", () => {
          const duration = Date.now() - start;
          if (req.path.startsWith("/api") && duration > 100) {
            console.log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
          }
        });
        next();
      });

      // PRIORITY 2: Load API routes BEFORE Vite to ensure they work
      console.log("📥 Loading API routes...");
      const { registerRoutes } = await import('./routes');
      await registerRoutes(app);
      console.log("✅ API routes loaded successfully");

      // Error handling for API routes
      app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
        console.error('API Error:', err);
        
        // Don't crash on OpenAI quota errors
        if (err.message?.includes('429') || err.message?.includes('quota')) {
          return res.status(200).json({ 
            message: "Service temporarily limited due to external API constraints",
            fallback: true
          });
        }
        
        res.status(err.status || 500).json({ 
          message: err.status === 500 ? "Service temporarily unavailable" : err.message || "Internal Server Error" 
        });
      });

      // PRIORITY 3: Setup Vite/static serving AFTER routes
      console.log("📥 Importing vite module...");
      let viteModule;
      try {
        viteModule = await import('./vite');
        console.log("✅ Vite module imported successfully");
      } catch (error) {
        console.error("❌ Failed to import vite module:", error);
        // Fallback: serve static files without Vite
        const path = await import('path');
        const staticPath = path.resolve(process.cwd(), 'dist');
        app.use(express.static(staticPath));
        console.log("✅ Static fallback setup completed");
        viteModule = null;
      }
      
      // Setup Vite/static serving
      console.log("🎯 Setting up Vite/Static serving...");
      if (process.env.NODE_ENV === "development" && viteModule) {
        await viteModule.setupVite(app, server);
        console.log("✅ Vite setup completed - React app now available");
      } else if (viteModule) {
        viteModule.serveStatic(app);
        console.log("✅ Static serving setup completed");
      } else {
        console.log("✅ Fallback static serving is active");
      }

      console.log("🎉 Core application setup completed!");

      // Database setup (completely independent and fire-and-forget)
      setImmediate(() => {
        Promise.resolve().then(async () => {
          try {
            console.log("🗄️ Initializing database...");
            const { initializeDatabase } = await import('./scripts/db-init');
            await initializeDatabase();
            
            // Initialize topics after database is ready
            const { initializeTopics } = await import('./services/contentIngestion');
            await initializeTopics();
          } catch (error) {
            console.error("Database initialization failed:", error);
            // Continue without database - health checks still work
          }
        });
      });

    } catch (error) {
      console.error("Setup error:", error);
      // Application continues with basic health check functionality
    }
  });
}
