/**
 * PM2 Configuration - BALANCED MODE (2 Instances)
 * 
 * Perfect for Render 512MB plan - strikes balance between:
 * ✅ Performance (load balancing)
 * ✅ Reliability (fault tolerance)
 * ✅ Memory efficiency (fits in 512MB)
 * 
 * Memory usage: ~400-450MB (safe for 512MB limit)
 */

module.exports = {
  apps: [
    {
      name: 'nema-backend',
      script: './backend/server.js',

      // ============================================
      // BALANCED MODE (2 Instances)
      // ============================================
      instances: 2,              // Two workers for load balancing
      exec_mode: 'cluster',       // Enable cluster mode
      
      // ============================================
      // MEMORY OPTIMIZATION (Per Instance)
      // ============================================
      max_memory_restart: '220M', // Restart if instance exceeds 220MB
                                   // (2 × 220MB = 440MB + ~30MB PM2 = 470MB total)

      // Node.js memory limits (per instance)
      node_args: [
        '--max-old-space-size=200',  // 200MB heap per instance
        '--optimize-for-size',        // Optimize for memory, not speed
      ],

      // ============================================
      // LOAD BALANCING & FAULT TOLERANCE
      // ============================================
      // With 2 instances:
      // - Requests automatically distributed between workers
      // - If one crashes, the other handles traffic
      // - Zero-downtime reloads (one restarts while other serves)

      // ============================================
      // AUTO-RESTART CONFIGURATION
      // ============================================
      autorestart: true,
      watch: false,
      
      // Restart strategy
      min_uptime: '10s',           // Must run 10s to be considered stable
      max_restarts: 10,            // Max 10 restarts within...
      exp_backoff_restart_delay: 100, // Exponential backoff starting at 100ms

      // ============================================
      // GRACEFUL SHUTDOWN
      // ============================================
      kill_timeout: 8000,          // 8s to gracefully shutdown
      wait_ready: true,            // Wait for app to signal ready
      listen_timeout: 10000,       // 10s timeout for ready signal
      
      // ============================================
      // ZERO-DOWNTIME RELOAD
      // ============================================
      // When you run `pm2 reload`:
      // 1. PM2 starts new instance
      // 2. New instance becomes ready
      // 3. PM2 sends SIGINT to old instance
      // 4. Old instance gracefully shuts down
      // 5. No downtime!

      // ============================================
      // ENVIRONMENT VARIABLES
      // ============================================
      env_production: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 5000,
      },

      // ============================================
      // LOGGING (Minimal for memory efficiency)
      // ============================================
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,            // Combine logs from all instances
      
      // Log rotation
      max_log_size: '5M',
      log_rotation: true,
      retain_logs: 2,
    }
  ]
};

