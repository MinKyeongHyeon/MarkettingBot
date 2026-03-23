/**
 * PM2 ecosystem file for running Next.js and the Express API on macOS
 * Usage:
 *  cd /path/to/repo
 *  pm2 start deploy/pm2/ecosystem.config.js
 */
module.exports = {
  apps: [
    {
      name: "marketting-web",
      cwd: "./apps/web",
      script: "npm",
      args: "start",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        NEXT_PUBLIC_API_BASE: "https://example.com",
      },
    },
    {
      name: "marketting-api",
      cwd: "./apps/server",
      script: "npm",
      args: "start",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
        PUBLIC_API_KEY: process.env.PUBLIC_API_KEY || "",
      },
    },
    // Optionally add Ollama as a managed process if you can run it via CLI
    // {
    //   name: 'ollama',
    //   cwd: '/',
    //   script: '/usr/local/bin/ollama',
    //   args: 'serve',
    //   env: { OLLAMA_BASE: 'http://localhost:11434' }
    // }
  ],
};
