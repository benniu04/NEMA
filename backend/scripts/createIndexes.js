import mongoose from 'mongoose';
import { Movie } from '../models/movie.model.js';
import { Comment } from '../models/comment.model.js';
import { Review } from '../models/review.model.js';
import { connectDB } from '../config/db.js';

/**
 * Script to create all database indexes
 * Run this after adding new indexes to ensure they're created in the database
 * 
 * Usage: node backend/scripts/createIndexes.js
 */

async function createIndexes() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await connectDB();
    
    console.log('\n📊 Creating indexes...\n');
    
    // Create indexes for Movie collection
    console.log('📽️  Movie indexes:');
    await Movie.createIndexes();
    const movieIndexes = await Movie.collection.getIndexes();
    console.log(`   ✅ Created ${Object.keys(movieIndexes).length} indexes`);
    Object.keys(movieIndexes).forEach(key => {
      console.log(`      - ${key}`);
    });
    
    // Create indexes for Comment collection
    console.log('\n💬 Comment indexes:');
    await Comment.createIndexes();
    const commentIndexes = await Comment.collection.getIndexes();
    console.log(`   ✅ Created ${Object.keys(commentIndexes).length} indexes`);
    Object.keys(commentIndexes).forEach(key => {
      console.log(`      - ${key}`);
    });
    
    // Create indexes for Review collection
    console.log('\n⭐ Review indexes:');
    await Review.createIndexes();
    const reviewIndexes = await Review.collection.getIndexes();
    console.log(`   ✅ Created ${Object.keys(reviewIndexes).length} indexes`);
    Object.keys(reviewIndexes).forEach(key => {
      console.log(`      - ${key}`);
    });
    
    console.log('\n✅ All indexes created successfully!\n');
    
    // Show index sizes
    console.log('📏 Index Statistics:');
    try {
      const db = mongoose.connection.db;
      const movieStats = await db.collection('movies').stats();
      const commentStats = await db.collection('comments').stats();
      const reviewStats = await db.collection('reviews').stats();
      
      console.log(`   Movies: ${movieStats.nindexes} indexes, ${formatBytes(movieStats.totalIndexSize)} total size`);
      console.log(`   Comments: ${commentStats.nindexes} indexes, ${formatBytes(commentStats.totalIndexSize)} total size`);
      console.log(`   Reviews: ${reviewStats.nindexes} indexes, ${formatBytes(reviewStats.totalIndexSize)} total size`);
    } catch (statsError) {
      console.log('   (Statistics available after documents are added)');
    }
    
    console.log('\n💡 Tip: Run this script whenever you add new indexes to your models\n');
    
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Run the script
createIndexes();

