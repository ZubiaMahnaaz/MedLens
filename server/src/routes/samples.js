import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SAMPLE_DIR = path.join(__dirname, '..', '..', 'sample_reports');

const router = express.Router();

router.get('/', (req, res) => {
  const samplePresets = [
    {
      id: 'metabolic',
      title: 'Comprehensive Metabolic Panel (Follow-up)',
      labName: 'Central Health Clinical Laboratories',
      reportDate: '2026-09-02',
      reportType: 'Comprehensive Metabolic Panel',
      testCount: 13,
      description: 'Follow-up panel containing Fasting Blood Glucose, HbA1c, Lipids (Cholesterol, HDL, LDL, Triglycerides), Renal and Hepatic markers.',
      recommendedPatient: 'Eleanor Vance (PT-2026-0819)',
      fileName: 'sample_metabolic_report.txt'
    },
    {
      id: 'thyroid',
      title: 'Comprehensive Thyroid Function Profile',
      labName: 'Apex Endocrine Pathology',
      reportDate: '2026-08-30',
      reportType: 'Thyroid Function Panel',
      testCount: 3,
      description: 'Endocrine panel containing TSH, Free T4, and Free T3 to monitor thyroid hormone replacement therapy.',
      recommendedPatient: 'Sophia Lin (PT-2026-3391)',
      fileName: 'sample_thyroid_report.txt'
    },
    {
      id: 'mismatch',
      title: 'Lipid Profile (Verification Check)',
      labName: 'Valley Health Diagnostics',
      reportDate: '2026-09-01',
      reportType: 'Lipid Profile',
      testCount: 4,
      description: 'Report with intentional patient identifier mismatch (Jonathan Vance vs Eleanor Vance) to demonstrate Conflict Detection engine.',
      recommendedPatient: 'Eleanor Vance (Demonstrates Conflict Alert)',
      fileName: 'sample_mismatch_report.txt'
    }
  ];

  res.json({ samples: samplePresets });
});

router.get('/:sampleId/content', (req, res) => {
  try {
    const fileMap = {
      metabolic: 'sample_metabolic_report.txt',
      thyroid: 'sample_thyroid_report.txt',
      mismatch: 'sample_mismatch_report.txt'
    };

    const fileName = fileMap[req.params.sampleId];
    if (!fileName) {
      return res.status(404).json({ error: 'Sample report not found' });
    }

    const filePath = path.join(SAMPLE_DIR, fileName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Sample file missing' });
    }

    const content = fs.readFileSync(filePath, 'utf8');
    res.json({ fileName, content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
