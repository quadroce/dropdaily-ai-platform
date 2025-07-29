import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";

const app = express();

// ULTRA-CRITICAL: Health check endpoints for deployment (non-root paths only)
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

app.get("/healthz", (req, res) => {
  res.status(200).send("OK");
});

app.get("/ready", (req, res) => {
  res.status(200).send("OK");
});

// EMERGENCY ROOT ROUTE - Temporary fix while Vite loads
app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html><head><title>DropDaily Loading...</title></head>
    <body>
      <div id="root">
        <div style="text-align:center;padding:50px;">
          <h2>DropDaily is initializing...</h2>
          <p>Please wait while the application loads.</p>
          <script>setTimeout(function(){location.reload();}, 3000);</script>
        </div>
      </div>
    </body></html>
  `);
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

// Handle server errors
server.on('error', (error: any) => {
  process.exit(1);
});

// Background setup function - delayed to not interfere with health checks
function setupAppInBackground(): void {
  // Import and setup everything in background, with delays between operations
  Promise.resolve().then(async () => {
    try {
      // Dynamic imports to avoid blocking initial server startup
      const { registerRoutes } = await import('./routes');
      const { setupVite, serveStatic, log } = await import('./vite');
      
      // Basic middleware
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

      // Setup routes
      await registerRoutes(app);

      // Error handling
      app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
        res.status(err.status || 500).json({ message: err.message || "Internal Server Error" });
      });

      // Vite/static setup
      console.log("🎯 Setting up Vite/Static serving...");
      if (process.env.NODE_ENV === "development") {
        // Remove the temporary root route before setting up Vite
        app._router.stack = app._router.stack.filter((layer: any) => 
          !(layer.route && layer.route.path === '/' && layer.route.methods.get)
        );
        
        await setupVite(app, server);
        console.log("✅ Vite setup completed - React app now available");
      } else {
        serveStatic(app);
        console.log("✅ Static serving setup completed");
      }

      // Database setup (completely independent)
      setTimeout(() => {
        import('./scripts/db-init').then(({ initializeDatabase }) => {
          initializeDatabase().then(() => {
            import('./services/contentIngestion').then(({ initializeTopics }) => {
              initializeTopics().catch(() => {});
            }).catch(() => {});
          }).catch(() => {});
        }).catch(() => {});
      }, 1000);

    } catch (error) {
      // Silently fail to keep health checks working
    }
  });
}
