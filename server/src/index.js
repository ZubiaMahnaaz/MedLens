import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from './db.js';
import { seedInitialData } from './seed.js';

import fs from 'fs';
import authRoutes from './routes/auth.js';
import patientRoutes from './routes/patients.js';
import reportRoutes from './routes/reports.js';
import resultRoutes from './routes/results.js';
import summaryRoutes from './routes/summaries.js';
import compareRoutes from './routes/compare.js';
import conflictRoutes from './routes/conflicts.js';
import timelineRoutes from './routes/timeline.js';
import sampleRoutes from './routes/samples.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static documents (for viewing source reports)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
app.use('/sample_reports', express.static(path.join(__dirname, '..', 'sample_reports')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/summaries', summaryRoutes);
app.use('/api/compare', compareRoutes);
app.use('/api/conflicts', conflictRoutes);
app.use('/api/timeline', timelineRoutes);
app.use('/api/samples', sampleRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'MedLens Clinical Information Intelligence Backend',
    timestamp: new Date().toISOString()
  });
});

// Serve frontend SPA in production
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

// Initialize DB and start server
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

