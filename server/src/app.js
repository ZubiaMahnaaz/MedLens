import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initDatabase } from './db.js';
import { seedInitialData } from './seed.js';

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

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const UPLOADS_DIR = isServerless ? '/tmp/medlens_uploads' : path.join(__dirname, '..', 'uploads');
const SAMPLE_DIR = path.join(__dirname, '..', 'sample_reports');

const app = express();

// Enable CORS and body parsers
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Ensure database and seed data are initialized before handling requests
let dbInitPromise = null;
let dbInitialized = false;

async function ensureDbInitialized() {
  if (dbInitialized) return;
  if (!dbInitPromise) {
    dbInitPromise = (async () => {
      await initDatabase();
      seedInitialData();
      dbInitialized = true;
    })();
  }
  await dbInitPromise;
}

app.use(async (req, res, next) => {
  try {
    await ensureDbInitialized();
    next();
  } catch (err) {
    console.error('Database initialization error:', err);
    res.status(500).json({ error: 'Database initialization error', details: err.message });
  }
});

// Serve static documents (for viewing source reports)
app.use('/uploads', express.static(UPLOADS_DIR));
app.use('/sample_reports', express.static(SAMPLE_DIR));

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
    environment: isServerless ? 'vercel-serverless' : 'node-server',
    timestamp: new Date().toISOString()
  });
});

// JSON 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'API endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Global JSON error handler
app.use((err, req, res, next) => {
  console.error('Unhandled API Error:', err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error',
    status
  });
});

export default app;
