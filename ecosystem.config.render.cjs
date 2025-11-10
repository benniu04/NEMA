/**
 * PM2 Configuration for Render (512MB Starter Plan)
 * 
 * OPTIMIZED FOR LOW MEMORY USAGE
 * 
 * This config runs a SINGLE instance instead of cluster mode
 * to stay within Render's 512MB memory limit.
 * 
 * Memory breakdown (approx):
 * - PM2 overhead: ~40MB
 * - Node.js instance: ~150-250MB
 * - Operating system: ~100MB
 * - Buffer: ~100MB for spikes
 * Total: ~400-500MB (safe!)
 * 
 * Usage:
 *   pm2 start ecosystem.config.render.cjs --env production
 */

module.exports = {
  apps: [
    {
      name: 'nema-backend',
      script: './backend/server.js',
      
      // ============================================
      // SINGLE INSTANCE MODE (For 512MB RAM)
      // ============================================
      instances: 1,  // Single instance only!
      exec_mode: 'fork',  // Fork mode (not cluster) uses less memory
      
      // ============================================
      // MEMORY OPTIMIZATION
      // ============================================
      max_memory_restart: '400M',  // Restart at 400MB (safe for 512MB total)
      
      // Node.js memory optimization flags
      node_args: [
        '--max-old-space-size=384',  // Limit heap to 384MB
        '--optimize-for-size',       // Optimize for size not speed
      ],
      
      // ============================================
      // AUTO-RESTART CONFIGURATION
      // ============================================
      autorestart: true,
      watch: false,
      
      // Restart strategy
      min_uptime: '10s',
      max_restarts: 10,
      exp_backoff_restart_delay: 100,
      
      // ============================================
      // GRACEFUL SHUTDOWN
      // ============================================
      kill_timeout: 10000,  // 10s timeout (shorter for quick restarts)
      wait_ready: false,     // Don't wait for ready event
      listen_timeout: 8000,
      
      // ============================================
      // ENVIRONMENT VARIABLES
      // ============================================
      env_production: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 5000,
        // Render provides PORT automatically
      },
      
      // ============================================
      // LOGGING (Keep minimal for memory)
      // ============================================
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      
      // Rotate logs to prevent disk fill
      max_log_size: '5M',
      log_rotation: true,
      retain_logs: 2,  // Keep only 2 old logs
    }
  ]
};

