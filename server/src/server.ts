import dns from 'node:dns';
import http from 'node:http';
import mongoose from 'mongoose';
import { app } from './app.js';
import { config } from './config/index.js';

// Resolve MongoDB SRV records via public DNS if local router/ISP DNS rejects SRV lookups
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // Ignore in environments where setting custom DNS servers is restricted
}
import { logger } from './utils/logger.js';
import { initializeWebSockets } from './engine/websockets/index.js';
import { registerNotificationListeners } from './services/notification.service.js';

let server: http.Server;

async function startServer(): Promise<void> {
  try {
    logger.info('Connecting to MongoDB...');
    await mongoose.connect(config.MONGODB_URI);
    logger.info('Successfully connected to MongoDB');

    server = http.createServer(app);

    // Initialize WebSocket server on the same HTTP server
    initializeWebSockets(server);

    // Register domain event listeners for notifications
    registerNotificationListeners();

    server.listen(config.PORT, () => {
      logger.info(
        {
          port: config.PORT,
          env: config.NODE_ENV,
          basePath: config.API_BASE_PATH,
        },
        `PlayMatch API server listening on http://localhost:${config.PORT}`,
      );
    });

    // Start Module 4 lifecycle sweep background timer
    const sweepInterval = setInterval(async () => {
      try {
        const { runLifecycleSweep } = await import('./services/game-sweep.service.js');
        await runLifecycleSweep();
      } catch (sweepErr) {
        logger.error({ err: sweepErr }, 'Error during background lifecycle sweep');
      }
    }, config.LIFECYCLE_SWEEP_INTERVAL_MS);

    const shutdown = async (signal: string) => {
      logger.info({ signal }, 'Graceful shutdown signal received');
      clearInterval(sweepInterval);

      if (server) {
        server.close(async () => {
          logger.info('HTTP server closed');
          try {
            await mongoose.connection.close(false);
            logger.info('MongoDB connection closed cleanly');
            process.exit(0);
          } catch (dbErr) {
            logger.error({ err: dbErr }, 'Error closing MongoDB connection');
            process.exit(1);
          }
        });

        // Force shutdown after timeout if pending requests hang
        setTimeout(() => {
          logger.error('Forceful shutdown: server closing timed out');
          process.exit(1);
        }, 10000).unref();
      } else {
        process.exit(0);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.fatal({ err: error }, 'Failed to start PlayMatch server');
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export { startServer };
