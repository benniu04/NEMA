import mongoose from 'mongoose';
import { ENV_VARS } from './envVars.js';
import logger from './logger.js';

export const connectDB = async (): Promise<typeof mongoose | void> => {
  try {
    const conn = await mongoose.connect(ENV_VARS.MONGO_URL, {
      authSource: 'admin',          // Authentication database
      retryWrites: true,            // Automatically retry failed writes
      w: 'majority',                // Write concern: wait for majority of nodes

      maxPoolSize: 10,              // Maximum 10 concurrent connections
      minPoolSize: 5,               // Keep 5 connections always ready

      socketTimeoutMS: 45000,       // Close sockets after 45s of inactivity
      serverSelectionTimeoutMS: 5000,  // Fail fast if can't select server in 5s
      heartbeatFrequencyMS: 10000,  // Check server health every 10s

      family: 4                     // Use IPv4, skip IPv6 (faster DNS resolution)
    });

    // Enable query logging in development only (helps with debugging)
    if (process.env.NODE_ENV === 'development') {
      mongoose.set('debug', true);
    }

    logger.info(`MongoDB connected successfully: ${conn.connection.host}`);
    
    /**
     * CONNECTED EVENT
     * Fired when initial connection is established
     */
    mongoose.connection.on('connected', () => {
      logger.info('MongoDB connection established');
    });

    /**
     * ERROR EVENT
     * Fired when an error occurs on the connection
     * Common causes: network issues, authentication failures, server crashes
     */
    mongoose.connection.on('error', (err: Error) => {
      logger.error('MongoDB connection error:', { 
        error: err.message,
        stack: err.stack 
      });
    });

    /**
     * DISCONNECTED EVENT
     * Fired when connection is lost
     * Mongoose will automatically attempt to reconnect
     */
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Mongoose will attempt to reconnect...');
    });

    /**
     * RECONNECTED EVENT
     * Fired when Mongoose successfully reconnects after being disconnected
     */
    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected successfully');
    });

    /**
     * RECONNECT FAILED EVENT
     * Fired when Mongoose gives up trying to reconnect
     * This is critical and requires manual intervention
     */
    mongoose.connection.on('reconnectFailed', () => {
      logger.error('MongoDB reconnection failed. Manual intervention required.');
    });

    return conn;
    
  } catch (error) {
    const err = error as Error & { code?: string };
    logger.error(`MongoDB initial connection error: ${err.message}`, {
      stack: err.stack,
      code: err.code
    });
    
    // Exit process with failure code
    // This ensures the application doesn't run without a database
    process.exit(1);
  }
};

/**
 * Gracefully close MongoDB connection
 * Should be called during application shutdown
 */
export const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed through app termination');
  } catch (error) {
    const err = error as Error;
    logger.error('Error closing MongoDB connection:', { error: err.message });
    throw error;
  }
};

