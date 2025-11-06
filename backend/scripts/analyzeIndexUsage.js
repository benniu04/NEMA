import mongoose from 'mongoose';
import { Movie } from '../models/movie.model.js';
import { Comment } from '../models/comment.model.js';
import { Review } from '../models/review.model.js';
import { connectDB } from '../config/db.js';

/**
 * Script to analyze index usage and performance
 * This helps identify unused indexes or missing indexes
 * 
 * Usage: node backend/scripts/analyzeIndexUsage.js
 */

async function analyzeIndexUsage() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await connectDB();
    
    console.log('\n📊 Analyzing Index Usage...\n');
    
    // Analyze Movie indexes
    console.log('📽️  MOVIE COLLECTION');
    console.log('━'.repeat(60));
    await analyzeCollection(Movie);
    
    // Analyze Comment indexes
    console.log('\n💬 COMMENT COLLECTION');
    console.log('━'.repeat(60));
    await analyzeCollection(Comment);
    
    // Analyze Review indexes
    console.log('\n⭐ REVIEW COLLECTION');
    console.log('━'.repeat(60));
    await analyzeCollection(Review);
    
    console.log('\n' + '═'.repeat(60));
    console.log('💡 RECOMMENDATIONS');
    console.log('═'.repeat(60));
    console.log('1. Indexes with 0 operations may be unused (consider removing)');
    console.log('2. High ops/accesses ratio = index is being used efficiently');
    console.log('3. Run this periodically in production to optimize indexes');
    console.log('4. Use MongoDB Atlas for detailed index metrics\n');
    
  } catch (error) {
    console.error('❌ Error analyzing indexes:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

async function analyzeCollection(Model) {
  const collectionName = Model.collection.name;
  
  // Get index statistics
  const indexStats = await Model.collection.aggregate([
    { $indexStats: {} }
  ]).toArray();
  
  if (indexStats.length === 0) {
    console.log('   ⚠️  No index statistics available (no queries run yet)');
    return;
  }
  
  console.log(`   Collection: ${collectionName}`);
  console.log(`   Total Indexes: ${indexStats.length}\n`);
  
  // Sort by usage (accesses)
  indexStats.sort((a, b) => b.accesses.ops - a.accesses.ops);
  
  indexStats.forEach((index, i) => {
    const name = index.name;
    const ops = index.accesses.ops || 0;
    const since = index.accesses.since ? new Date(index.accesses.since).toISOString() : 'N/A';
    
    console.log(`   ${i + 1}. ${name}`);
    console.log(`      Operations: ${ops}`);
    console.log(`      Since: ${since}`);
    
    if (ops === 0) {
      console.log('      ⚠️  UNUSED - Consider removing if not needed');
    } else if (ops > 1000) {
      console.log('      ✅ HEAVILY USED - Keep this index!');
    } else if (ops > 100) {
      console.log('      ✓  Actively used');
    }
    console.log('');
  });
  
  // Get collection stats
  try {
    const db = mongoose.connection.db;
    const stats = await db.collection(collectionName).stats();
    console.log(`   Documents: ${stats.count}`);
    console.log(`   Avg Document Size: ${formatBytes(stats.avgObjSize || 0)}`);
    console.log(`   Total Index Size: ${formatBytes(stats.totalIndexSize || 0)}`);
    console.log(`   Storage Size: ${formatBytes(stats.storageSize || 0)}`);
  } catch (statsError) {
    console.log('   (Statistics available after documents are added)');
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
analyzeIndexUsage();

