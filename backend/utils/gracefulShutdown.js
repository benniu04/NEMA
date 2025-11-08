import logger from '../config/logger.js';
import { disconnectDB } from '../config/db.js';

/**
 * Graceful Shutdown Handler
 * 
 * This utility ensures your application shuts down cleanly when receiving
 * termination signals (SIGTERM, SIGINT, etc.). It:
 * 
 * 1. Stops accepting new HTTP requests
 * 2. Finishes processing ongoing requests
 * 3. Closes database connections properly
 * 4. Exits with appropriate status code
 * 
 * WHY IS THIS IMPORTANT?
 * - Prevents data corruption by finishing database operations
 * - Ensures no requests are dropped mid-processing
 * - Allows proper cleanup of resources (connections, file handles)
 * - Critical for zero-downtime deployments
 * 
 * WHEN IS IT TRIGGERED?
 * - SIGTERM: Graceful shutdown request (from PM2, Docker, Kubernetes)
 * - SIGINT: User pressed Ctrl+C
 * - SIGUSR2: Nodemon restart (development)
 */

export const setupGracefulShutdown = (server) => {
    // List of signals to handle
    const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];
    
    signals.forEach(signal => {
        process.on(signal, async () => {
            logger.info(`Received ${signal} signal, starting graceful shutdown...`);
            
            // Step 1: Stop accepting new connections
            server.close(async (err) => {
                if (err) {
                    logger.error('Error closing HTTP server:', { error: err.message });
                    process.exit(1);
                }
                
                logger.info('HTTP server closed - no longer accepting requests');
                
                try {
                    // Step 2: Close database connections
                    await disconnectDB();
                    logger.info('All database connections closed');
                    
                    // Step 3: Exit successfully
                    logger.info('Graceful shutdown completed successfully');
                    process.exit(0);
                    
                } catch (error) {
                    logger.error('Error during graceful shutdown:', { 
                        error: error.message,
                        stack: error.stack 
                    });
                    process.exit(1);
                }
            });
            
            // Force shutdown after 30 seconds if graceful shutdown hangs
            // This prevents the application from hanging indefinitely
            setTimeout(() => {
                logger.error('Forced shutdown after 30s timeout - some connections may not have closed properly');
                process.exit(1);
            }, 30000);
        });
    });
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
        logger.error('Uncaught Exception:', {
            error: error.message,
            stack: error.stack
        });
        
        // Exit the process - uncaught exceptions leave the app in an undefined state
        process.exit(1);
    });
    
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
        logger.error('Unhandled Promise Rejection:', {
            reason: reason,
            promise: promise
        });
        
        // In production, you might want to exit here too
        // For now, we'll just log it
        if (process.env.NODE_ENV === 'production') {
            process.exit(1);
        }
    });
};

