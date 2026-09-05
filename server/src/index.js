import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import app from './app.js';
import { initDatabase } from './db.js';
import { seedInitialData } from './seed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 5000;
const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

// In standalone production (e.g. Docker / local production), serve frontend SPA from client/dist
if (!isVercel) {
  const CLIENT_DIST = path.join(__dirname, '..', '..', 'client', 'dist');
  if (fs.existsSync(CLIENT_DIST)) {
    app.use(express.static(CLIENT_DIST));
    app.get('*', (req, res, next) => {
      if (
        req.path.startsWith('/api') ||
        req.path.startsWith('/uploads') ||
        req.path.startsWith('/sample_reports')
      ) {
        return next();
      }
      res.sendFile(path.join(CLIENT_DIST, 'index.html'));
    });
  }
}

// Start standalone HTTP listener only when not running in a serverless environment
if (!isVercel) {
  async function startServer() {
    try {
      await initDatabase();
      seedInitialData();

      app.listen(PORT, () => {
        console.log(` MedLens Clinical Intelligence API running on http://localhost:${PORT}`);
      });
    } catch (err) {
      console.error('Failed to start MedLens server:', err);
      process.exit(1);
    }
  }

  startServer();
}

export default app;
