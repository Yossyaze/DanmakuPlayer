/* eslint-env node */
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  base: '/DanmakuPlayer/',
  server: {
    proxy: {
      '/eddibb': {
        target: 'https://bbs.eddibb.cc',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/eddibb/, ''),
      },
    },
  },
  plugins: [
    react(),
    {
      name: 'error-logger-middleware',
      configureServer(server) {
        server.middlewares.use('/__error_log', (req, res, next) => {
          if (req.method === 'POST') {
            let body = '';
            req.on('data', (chunk) => {
              body += chunk.toString();
            });
            req.on('end', () => {
              try {
                const data = JSON.parse(body);
                // Simple formating
                const logEntry = `[${data.timestamp}] [${data.type}] ${data.message || ''}\n${data.stack ? data.stack + '\n' : ''}----------------------------------------\n`;

                // Append to file
                const logPath = path.resolve(process.cwd(), 'browser-error.log');

                fs.appendFile(logPath, logEntry, (err) => {
                  if (err) console.error('Failed to write to log file:', err);
                });

                res.statusCode = 200;
                res.end('Logged');
              } catch (e) {
                console.error('Error processing log request:', e);
                res.statusCode = 500;
                res.end('Internal Server Error');
              }
            });
          } else {
            next();
          }
        });
      },
    },
    {
      name: 'debug-logger-middleware',
      configureServer(server) {
        server.middlewares.use('/__debug_log', (req, res, next) => {
          if (req.method === 'POST') {
            let body = '';
            req.on('data', (chunk) => {
              body += chunk.toString();
            });
            req.on('end', () => {
              try {
                const data = JSON.parse(body);
                const logEntry = `[${data.timestamp}] ${data.message}\n`;

                const logPath = path.resolve(process.cwd(), 'debug.log');

                fs.appendFile(logPath, logEntry, (err) => {
                  if (err) console.error('Failed to write to debug log:', err);
                });

                res.statusCode = 200;
                res.end('Logged');
              } catch {
                res.statusCode = 500;
                res.end('Error');
              }
            });
          } else {
            next();
          }
        });
      },
    },
    {
      name: 'reset-logs-middleware',
      configureServer(server) {
        server.middlewares.use('/__reset_logs', (req, res, next) => {
          if (req.method === 'POST') {
            const timestamp = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });

            const errorLogPath = path.resolve(process.cwd(), 'browser-error.log');
            const debugLogPath = path.resolve(process.cwd(), 'debug.log');

            const header = `# Log Reset at ${timestamp}\n`;

            fs.writeFile(errorLogPath, header, (err) => {
              if (err) console.error('Failed to reset error log:', err);
            });

            fs.writeFile(debugLogPath, header, (err) => {
              if (err) console.error('Failed to reset debug log:', err);
            });

            res.statusCode = 200;
            res.end('Logs reset');
          } else {
            next();
          }
        });
      },
    },
  ],
});
