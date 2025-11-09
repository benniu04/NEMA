/**
 * PM2 Process Manager Configuration
 * 
 * PM2 provides:
 * - Process clustering (use all CPU cores) = 4-8x performance
 * - Auto-restart on crashes
 * - Zero-downtime reloads
 * - Built-in monitoring
 * - Log management
 * 
 * Usage:
 *   pm2 start ecosystem.config.cjs --env production
 *   pm2 restart nema-backend
 *   pm2 reload nema-backend (zero-downtime)
 *   pm2 logs nema-backend
 *   pm2 monit (live monitoring dashboard)
 *   pm2 stop nema-backend
 *   pm2 delete nema-backend
 */

module.exports = {
  apps: [
    {
      // ============================================
      // MAIN APPLICATION
      // ============================================
      name: 'nema-backend',
      script: './backend/server.js',
      
      // ============================================
      // CLUSTERING CONFIGURATION (THE MAGIC!)
      // ============================================
      // This runs multiple instances of your app
      // One instance per CPU core = use full power of your machine
      instances: 'max',  // 'max' = use all available CPU cores
      exec_mode: 'cluster',  // Enable cluster mode (vs 'fork' for single instance)
      
      // Why cluster mode?
      // Without: 200 requests/sec on 1 core
      // With 8 cores: 1,600 requests/sec (8x more capacity!)
      
      // ============================================
      // AUTO-RESTART CONFIGURATION
      // ============================================
      autorestart: true,  // Auto-restart if app crashes
      watch: false,  // Don't watch files in production (use git pull + pm2 reload)
      max_memory_restart: '1G',  // Restart if memory exceeds 1GB (prevents memory leaks)
      
      // Restart strategy
      min_uptime: '10s',  // App must run 10s to be considered "online"
      max_restarts: 10,  // Max restart attempts before giving up
      exp_backoff_restart_delay: 100,  // Exponential backoff: 100ms, 200ms, 400ms, etc.
      
      // ============================================
      // GRACEFUL SHUTDOWN/RELOAD
      // ============================================
      kill_timeout: 30000,  // Wait 30s for graceful shutdown before force kill
      wait_ready: true,  // Wait for app to emit 'ready' event
      listen_timeout: 10000,  // Max time to wait for app to start
      
      // ============================================
      // ENVIRONMENT VARIABLES
      // ============================================
      // Production environment
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      
      // Development environment
      env_development: {
        NODE_ENV: 'development',
        PORT: 5000
      },
      
      // Staging environment (optional)
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 5000
      },
      
      // ============================================
      // LOGGING CONFIGURATION
      // ============================================
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,  // Merge logs from all instances into one file
      
      // ============================================
      // FILE WATCHING IGNORE LIST
      // ============================================
      ignore_watch: [
        'node_modules',
        'logs',
        '.git',
        '*.log',
        'backups',
        'frontend'
      ]
    }
    
    // ============================================
    // OPTIONAL: DATABASE BACKUP JOB
    // ============================================
    // Uncomment this when you create the backup script
    // This will run daily at 2:00 AM
    /*
    ,{
      name: 'nema-backup',
      script: './backend/scripts/backup.js',
      instances: 1,
      exec_mode: 'fork',
      cron_restart: '0 2 * * *',  // Run at 2:00 AM every day
      autorestart: false,  // Don't auto-restart backup jobs
      watch: false,
      
      env_production: {
        NODE_ENV: 'production'
      }
    }
    */
  ],
  
  // ============================================
  // DEPLOYMENT CONFIGURATION (Optional)
  // ============================================
  // This allows you to deploy with: pm2 deploy production
//   deploy: {
//     production: {
//       user: 'node',
//       host: 'your-server.com',
//       ref: 'origin/main',
//       repo: 'git@github.com:yourusername/NEMA-1.git',
//       path: '/var/www/nema',
//       'post-deploy': 'npm install && pm2 reload ecosystem.config.cjs --env production',
//       env: {
//         NODE_ENV: 'production'
//       }
//     }
//   }
};

