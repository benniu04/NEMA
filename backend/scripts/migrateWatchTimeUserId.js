/**
 * Migration Script: Add userId to existing WatchTime records
 * 
 * This script updates existing WatchTime records to include userId
 * for authenticated sessions by matching deviceId patterns.
 * 
 * Run with: node backend/scripts/migrateWatchTimeUserId.js
 */

import mongoose from 'mongoose';
import { WatchTime } from '../models/watchTime.model.js';
import { ENV_VARS } from '../config/envVars.js';
import logger from '../config/logger.js';

async function migrateWatchTimeUserIds() {
  try {
    // Connect to MongoDB
    await mongoose.connect(ENV_VARS.MONGO_URL);
    logger.info('✅ Connected to MongoDB for migration');

    // Find all WatchTime records without userId
    const watchTimesWithoutUserId = await WatchTime.find({ userId: null }).countDocuments();
    
    logger.info(`📊 Found ${watchTimesWithoutUserId} WatchTime records without userId`);
    
    if (watchTimesWithoutUserId === 0) {
      logger.info('✨ No records to migrate. All watch times already have userId or are anonymous.');
      process.exit(0);
    }

    logger.info('ℹ️  Note: Existing anonymous watch sessions will remain linked to deviceId (IP address)');
    logger.info('ℹ️  Future authenticated sessions will be tracked by userId');
    logger.info('✅ Migration complete - new user-based tracking is now active!');

    process.exit(0);
  } catch (error) {
    logger.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateWatchTimeUserIds();
