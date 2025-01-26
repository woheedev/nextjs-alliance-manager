module.exports = {
  apps: [
    {
      name: "alliance-manager",
      script: "bun",
      args: "node_modules/next/dist/bin/next start",
      env: {
        PORT: 3456,
        NODE_ENV: "production",
        HOSTNAME: "0.0.0.0",
      },
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      error_file: "logs/err.log",
      out_file: "logs/out.log",
      log_file: "logs/combined.log",
      time: true,
    },
  ],
};
