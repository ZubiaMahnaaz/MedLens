import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { db } from '../db.js';
import { extractTextFromFile } from '../services/ocrService.js';
import { extractStructuredData } from '../services/extractionService.js';
import { detectReportConflicts } from '../services/conflictService.js';
import { generateSafeClinicalSummary } from '../services/summaryService.js';
import { logAuditEvent } from '../services/auditService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');
const SAMPLE_DIR = path.join(__dirname, '..', '..', 'sample_reports');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `medreport_${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB max
});

const router = express.Router();

// GET all reports for a patient or overall
router.get('/', (req, res) => {
  try {
    const { patientId } = req.query;
    let query = 'SELECT * FROM reports';
    let params = [];
    if (patientId) {
      query += ' WHERE patient_id = ? ORDER BY report_date DESC';
      params.push(patientId);
    } else {
      query += ' ORDER BY created_at DESC';
    }
    const reports = db.queryAll(query, params).map(r => ({
      ...r,
      conflicts: r.conflicts ? JSON.parse(r.conflicts) : []
    }));
    res.json({ reports });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single report by ID with all structured results, patient info, and summary
router.get('/:id', (req, res) => {
  try {
    const report = db.queryOne('SELECT * FROM reports WHERE id = ?', [req.params.id]);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const patient = db.queryOne('SELECT * FROM patients WHERE id = ?', [report.patient_id]);
    const results = db.queryAll('SELECT * FROM report_results WHERE report_id = ? ORDER BY category, test_name', [report.id]);
    const summary = db.queryOne('SELECT * FROM summaries WHERE report_id = ? ORDER BY created_at DESC LIMIT 1', [report.id]);

    const formattedSummary = summary ? {
      ...summary,
      key_findings: summary.key_findings ? JSON.parse(summary.key_findings) : [],
      questions_for_doctor: summary.questions_for_doctor ? JSON.parse(summary.questions_for_doctor) : []
    } : null;

    res.json({
      report: {
        ...report,
        conflicts: report.conflicts ? JSON.parse(report.conflicts) : []
      },
      patient: patient ? {
        ...patient,
        symptoms: patient.symptoms ? JSON.parse(patient.symptoms) : [],
        existing_conditions: patient.existing_conditions ? JSON.parse(patient.existing_conditions) : [],
        allergies: patient.allergies ? JSON.parse(patient.allergies) : [],
        current_medications: patient.current_medications ? JSON.parse(patient.current_medications) : []
      } : null,
      results,
      summary: formattedSummary
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST upload and process report (Option A and Option B)
router.post('/upload', upload.single('reportFile'), async (req, res) => {
  try {
    const { patientId, title, reportDate, labName, reportType, samplePreset, rawTextInput } = req.body;

    if (!patientId) {
      return res.status(400).json({ error: 'Patient ID is required.' });
    }

    const patient = db.queryOne('SELECT * FROM patients WHERE id = ?', [patientId]);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    let fileName = '';
    let filePath = '';
    let fileType = 'text/plain';
    let fileSize = 0;
    let rawText = rawTextInput || '';
    let isSample = Boolean(samplePreset);

    // Handle Option A: Uploaded file
    if (req.file) {
      isSample = false;
      fileName = req.file.originalname;
      filePath = `uploads/${req.file.filename}`;
      fileType = req.file.mimetype;
      fileSize = req.file.size;

      const fullDiskPath = path.join(UPLOADS_DIR, req.file.filename);
      if (fileType === 'application/pdf' || req.file.originalname.toLowerCase().endsWith('.pdf')) {
        const ocrResult = await extractTextFromFile(fullDiskPath, fileType);
        rawText = ocrResult.text || '';
        if (!rawText.trim()) {
          return res.status(422).json({
            error: 'Unable to extract text content from the uploaded PDF document. Please verify the document is a readable text or OCR-compatible PDF.'
          });
        }
      } else if (fileType.startsWith('text/') || req.file.originalname.endsWith('.txt')) {
        rawText = fs.readFileSync(fullDiskPath, 'utf8');
      } else {
        // For images or others
        try {
          rawText = fs.readFileSync(fullDiskPath, 'utf8');
        } catch {
          rawText = '';
        }
      }
    } else if (samplePreset) {
      // Handle Option B: Pre-packaged sample preset
      isSample = true;
      const presetFiles = {
        metabolic: { file: 'sample_metabolic_report.txt', title: 'Comprehensive Metabolic Panel (Follow-up)', type: 'Comprehensive Metabolic Panel', lab: 'Central Health Clinical Laboratories' },
        thyroid: { file: 'sample_thyroid_report.txt', title: 'Comprehensive Thyroid Function Profile', type: 'Thyroid Function Panel', lab: 'Apex Endocrine Pathology' },
        mismatch: { file: 'sample_mismatch_report.txt', title: 'Lipid Profile (Verification Check)', type: 'Lipid Profile', lab: 'Valley Health Diagnostics' }
      };

      const preset = presetFiles[samplePreset] || presetFiles.metabolic;
      const samplePath = path.join(SAMPLE_DIR, preset.file);
      rawText = fs.readFileSync(samplePath, 'utf8');
      fileName = preset.file;
      filePath = `sample_reports/${preset.file}`;
      fileType = 'text/plain';
      fileSize = Buffer.byteLength(rawText);
    }

    if (!rawText || !rawText.trim()) {
      return res.status(400).json({ error: 'Please provide an uploaded report file with readable text or select a sample panel.' });
    }

    // Run extraction service with sample flag
    const extractedData = extractStructuredData(rawText, patient, isSample);

    // Run conflict detector
    const existingReports = db.queryAll('SELECT * FROM reports WHERE patient_id = ?', [patientId]);
    const detectedConflicts = detectReportConflicts(extractedData.metadata, patient, existingReports, extractedData.results);

    const reportId = `rep_${crypto.randomUUID()}`;
    const repTitle = title || extractedData.metadata.panelType || 'Clinical Laboratory Panel';
    const repDate = reportDate || (extractedData.metadata.reportDate !== 'Not available' ? extractedData.metadata.reportDate : new Date().toISOString().split('T')[0]);
    const repLab = labName || (extractedData.metadata.labFacility !== 'Not available' ? extractedData.metadata.labFacility : 'Diagnostic Laboratory');
    const repStatus = detectedConflicts.length > 0 ? 'NEEDS_REVIEW' : 'EXTRACTED';
    const now = new Date().toISOString();

    // Insert report record
    db.run(
      `INSERT INTO reports (id, patient_id, title, report_type, report_date, lab_name, file_name, file_path, file_type, file_size, status, raw_text, conflicts, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        reportId,
        patientId,
        repTitle,
        reportType || extractedData.metadata.panelType,
        repDate,
        repLab,
        fileName,
        filePath,
        fileType,
        fileSize,
        repStatus,
        rawText,
        JSON.stringify(detectedConflicts),
        now,
        now
      ]
    );

    // Insert extracted test results
    for (const r of extractedData.results) {
      db.run(
        `INSERT INTO report_results (id, report_id, patient_id, test_name, category, value_raw, value_numeric, unit, ref_range_raw, ref_min, ref_max, status, evaluation_reason, provenance, is_verified, confidence, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          r.id,
          reportId,
          patientId,
          r.test_name,
          r.category,
          r.value_raw,
          r.value_numeric,
          r.unit,
          r.ref_range_raw,
          r.ref_min,
          r.ref_max,
          r.status,
          r.evaluation_reason,
          r.provenance,
          r.is_verified,
          r.confidence,
          r.notes || '',
          now,
          now
        ]
      );
    }

    // Generate initial safe AI summary
    const aiSummary = generateSafeClinicalSummary(extractedData.results, patient, repTitle);
    const summaryId = `sum_${crypto.randomUUID()}`;

    db.run(
      `INSERT INTO summaries (id, report_id, patient_id, summary_text, key_findings, questions_for_doctor, total_tests, normal_count, abnormal_count, is_verified, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        summaryId,
        reportId,
        patientId,
        aiSummary.summaryText,
        JSON.stringify(aiSummary.keyFindings),
        JSON.stringify(aiSummary.questionsForDoctor),
        aiSummary.totalTests,
        aiSummary.normalCount,
        aiSummary.abnormalCount,
        0,
        isSample ? 'MedLens Demo Sample Engine' : 'MedLens AI Extraction Engine',
        now,
        now
      ]
    );

    // Audit logs
    logAuditEvent({
      patientId,
      reportId,
      eventType: 'REPORT_UPLOADED',
      description: isSample
        ? `Loaded pre-packaged sample panel "${repTitle}" (${extractedData.results.length} parameters).`
        : `Uploaded report "${repTitle}" with ${extractedData.results.length} extracted parameters.`,
      details: { fileName, fileSize, parametersExtracted: extractedData.results.length, conflictsDetected: detectedConflicts.length, isSample }
    });

    logAuditEvent({
      patientId,
      reportId,
      eventType: 'DATA_EXTRACTED',
      description: `AI extraction processed ${extractedData.results.length} lab parameters from report. (Quality: ${extractedData.quality?.status || 'COMPLETE'})`,
      details: { totalExtracted: extractedData.results.length, quality: extractedData.quality }
    });

    res.status(201).json({
      message: 'Report processed successfully',
      reportId,
      report: {
        id: reportId,
        patient_id: patientId,
        title: repTitle,
        report_type: reportType || extractedData.metadata.panelType,
        report_date: repDate,
        lab_name: repLab,
        file_name: fileName,
        file_path: filePath,
        file_type: fileType,
        file_size: fileSize,
        status: repStatus,
        conflicts: detectedConflicts,
        raw_text: rawText,
        created_at: now
      },
      results: extractedData.results,
      quality: extractedData.quality,
      summary: {
        id: summaryId,
        report_id: reportId,
        patient_id: patientId,
        summary_text: aiSummary.summaryText,
        key_findings: aiSummary.keyFindings,
        questions_for_doctor: aiSummary.questionsForDoctor,
        total_tests: aiSummary.totalTests,
        normal_count: aiSummary.normalCount,
        abnormal_count: aiSummary.abnormalCount,
        disclaimer: aiSummary.disclaimer
      },
      conflicts: detectedConflicts
    });
  } catch (err) {
    console.error('Report upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE report
router.delete('/:id', (req, res) => {
  try {
    const report = db.queryOne('SELECT * FROM reports WHERE id = ?', [req.params.id]);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    db.run('DELETE FROM report_results WHERE report_id = ?', [report.id]);
    db.run('DELETE FROM summaries WHERE report_id = ?', [report.id]);
    db.run('DELETE FROM reports WHERE id = ?', [report.id]);

    logAuditEvent({
      patientId: report.patient_id,
      reportId: report.id,
      eventType: 'REPORT_DELETED',
      description: `Report "${report.title}" was deleted.`,
      details: { title: report.title }
    });

    res.json({ message: 'Report deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
