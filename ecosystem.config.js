module.exports = {
  apps: [
    {
      name: "ari-bot",
      script: "index.js",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      restart_delay: 5000,
      env: {
        NODE_ENV: "production"
      },
      out_file: "./logs/out.log",
      error_file: "./logs/error.log", 
      log_date_format: "YYYY-MM-DD HH:mm:ss"
    }
  ]
}
