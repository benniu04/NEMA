# Database Scripts

Utility scripts for database management and optimization.

## Available Scripts

### 1. Create Indexes

Creates all database indexes defined in your Mongoose models.

```bash
node backend/scripts/createIndexes.js
```

**When to run:**
- After adding new indexes to models
- When setting up a new database
- After database migrations
- If indexes were accidentally dropped

**What it does:**
- Connects to MongoDB
- Creates all indexes from model definitions
- Shows which indexes were created
- Displays index statistics

### 2. Analyze Index Usage

Analyzes how your indexes are being used in production.

```bash
node backend/scripts/analyzeIndexUsage.js
```

**When to run:**
- After running in production for a while
- When optimizing database performance
- Monthly for production monitoring
- Before removing indexes

**What it shows:**
- Which indexes are used frequently
- Which indexes are never used
- Collection statistics
- Recommendations for optimization

## Index Best Practices

### ✅ DO:
1. **Index your query fields** - If you query by it, index it
2. **Use compound indexes** - For queries with multiple fields
3. **Monitor index usage** - Remove unused indexes
4. **Create indexes before scale** - Don't wait for performance issues
5. **Index sort fields** - Especially with limits

### ❌ DON'T:
1. **Over-index** - Too many indexes slow down writes
2. **Index everything** - Only index what you query
3. **Ignore index size** - Large indexes use RAM
4. **Forget to maintain** - Review indexes quarterly

## Understanding Index Output

### Index Types

- **Single Field**: `{ field: 1 }` - Simple index on one field
- **Compound**: `{ field1: 1, field2: -1 }` - Multiple fields
- **Text**: `{ field: "text" }` - Full-text search
- **_id**: Automatically created by MongoDB

### Sort Order

- `1` = Ascending order
- `-1` = Descending order

**Example:**
```javascript
{ createdAt: -1 } // Newest first
{ createdAt: 1 }  // Oldest first
```

### Compound Index Rules

A compound index `{ a: 1, b: 1, c: 1 }` can be used for:
- `{ a: 1 }`
- `{ a: 1, b: 1 }`
- `{ a: 1, b: 1, c: 1 }`

But NOT for:
- `{ b: 1 }` alone
- `{ c: 1 }` alone
- `{ b: 1, c: 1 }` without `a`

This is called **index prefix optimization**.

## Current Indexes

### Movies Collection

1. **Genre queries**: `{ genre: 1 }`
2. **Featured movies**: `{ isFeatured: 1, createdAt: -1 }`
3. **Text search**: `{ title: "text", description: "text" }`
4. **Top rated**: `{ rating: -1 }`
5. **Recent movies**: `{ releaseDate: -1 }`
6. **Director lookup**: `{ director: 1 }`

### Comments Collection

1. **Movie comments** (CRITICAL): `{ movieId: 1, createdAt: -1 }`
2. **Device lookup**: `{ deviceId: 1 }`
3. **Old comments cleanup**: `{ createdAt: 1 }`

### Reviews Collection

1. **Movie reviews** (CRITICAL): `{ movieId: 1 }`
2. **Sorted reviews**: `{ movieId: 1, rating: -1 }`
3. **Device lookup**: `{ deviceId: 1 }`
4. **Recent reviews**: `{ createdAt: -1 }`
5. **High-rated reviews**: `{ rating: -1, createdAt: -1 }`

## Performance Impact

### Without Indexes
```
Query 10,000 comments: ~500ms (full collection scan)
Query 100,000 comments: ~5000ms (database locks)
```

### With Indexes
```
Query 10,000 comments: ~5ms (index lookup)
Query 100,000 comments: ~10ms (still fast!)
```

**Improvement: 100-500x faster queries!**

## Monitoring in Production

### MongoDB Atlas (Recommended)
1. Go to Atlas Dashboard
2. Click "Performance" → "Index Metrics"
3. View index usage statistics
4. Identify slow queries

### Manual Monitoring
```javascript
// In MongoDB shell
db.movies.getIndexes()          // List all indexes
db.movies.stats()                // Collection statistics
db.movies.aggregate([{ $indexStats: {} }])  // Usage stats
```

## Troubleshooting

### Indexes not being used?

1. **Check query shape** - Must match index definition exactly
2. **Check data size** - Small collections may skip indexes
3. **Check selectivity** - Low selectivity fields might skip indexes
4. **Run explain()** - See query execution plan

```javascript
// Example: Check if index is used
db.comments.find({ movieId: "123" }).sort({ createdAt: -1 }).explain("executionStats")
```

Look for `"stage": "IXSCAN"` (good) vs `"stage": "COLLSCAN"` (bad)

### Slow queries despite indexes?

1. **Check index size** - May not fit in RAM
2. **Check compound index order** - Field order matters
3. **Check data distribution** - Uneven data can cause issues
4. **Consider sharding** - For very large collections

## Next Steps

After implementing indexes:

1. ✅ Run `createIndexes.js` to create them
2. ✅ Test query performance (should be fast)
3. ✅ Deploy to production
4. ✅ Monitor with `analyzeIndexUsage.js`
5. ✅ Review quarterly and optimize

---

**Need Help?**
- MongoDB Index Docs: https://docs.mongodb.com/manual/indexes/
- MongoDB Performance: https://docs.mongodb.com/manual/administration/analyzing-mongodb-performance/

