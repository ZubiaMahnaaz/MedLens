import express from 'express';
import { db } from '../db.js';
import { generateSafeClinicalSummary } from '../services/summaryService.js';
import { logAuditEvent } from '../services/auditService.js';
import crypto from 'crypto';

const router = express.Router();

router.get('/report/:reportId', (req, res) => {
  try {
    const summary = db.queryOne('SELECT * FROM summaries WHERE report_id = ? ORDER BY created_at DESC LIMIT 1', [req.params.reportId]);
    if (!summary) {
      return res.status(404).json({ error: 'Summary not found' });
    }
    res.json({
      summary: {
        ...summary,
        key_findings: summary.key_findings ? JSON.parse(summary.key_findings) : [],
        questions_for_doctor: summary.questions_for_doctor ? JSON.parse(summary.questions_for_doctor) : []
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/generate', (req, res) => {
  try {
    const { reportId } = req.body;
    if (!reportId) {
      return res.status(400).json({ error: 'Report ID is required.' });
    }

    const report = db.queryOne('SELECT * FROM reports WHERE id = ?', [reportId]);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const patient = db.queryOne('SELECT * FROM patients WHERE id = ?', [report.patient_id]);
    const results = db.queryAll('SELECT * FROM report_results WHERE report_id = ?', [report.id]);

    const safeSummary = generateSafeClinicalSummary(results, patient, report.title);
    const now = new Date().toISOString();

    const existing = db.queryOne('SELECT id FROM summaries WHERE report_id = ?', [report.id]);
    let summaryId = existing ? existing.id : `sum_${crypto.randomUUID()}`;

    if (existing) {
      db.run(
        `UPDATE summaries SET
          summary_text = ?,
          key_findings = ?,
          questions_for_doctor = ?,
          total_tests = ?,
          normal_count = ?,
          abnormal_count = ?,
          updated_at = ?
         WHERE id = ?`,
        [
          safeSummary.summaryText,
          JSON.stringify(safeSummary.keyFindings),
          JSON.stringify(safeSummary.questionsForDoctor),
          safeSummary.totalTests,
          safeSummary.normalCount,
          safeSummary.abnormalCount,
          now,
          summaryId
        ]
      );
    } else {
      db.run(
        `INSERT INTO summaries (id, report_id, patient_id, summary_text, key_findings, questions_for_doctor, total_tests, normal_count, abnormal_count, is_verified, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          summaryId,
          report.id,
          report.patient_id,
          safeSummary.summaryText,
          JSON.stringify(safeSummary.keyFindings),
          JSON.stringify(safeSummary.questionsForDoctor),
          safeSummary.totalTests,
          safeSummary.normalCount,
          safeSummary.abnormalCount,
          0,
          'MedLens Clinical Summarizer',
          now,
          now
        ]
      );
    }

    logAuditEvent({
      patientId: report.patient_id,
      reportId: report.id,
      eventType: 'SUMMARY_GENERATED',
      description: `Generated patient-friendly clinical summary (${safeSummary.totalTests} tests summarized).`,
      details: { totalTests: safeSummary.totalTests, abnormalCount: safeSummary.abnormalCount }
    });

    res.json({
      message: 'Summary generated successfully',
      summary: {
        id: summaryId,
        report_id: report.id,
        patient_id: report.patient_id,
        summary_text: safeSummary.summaryText,
        key_findings: safeSummary.keyFindings,
        questions_for_doctor: safeSummary.questionsForDoctor,
        total_tests: safeSummary.totalTests,
        normal_count: safeSummary.normalCount,
        abnormal_count: safeSummary.abnormalCount,
        disclaimer: safeSummary.disclaimer,
        updated_at: now
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update custom summary text
router.put('/:id', (req, res) => {
  try {
    const { summary_text } = req.body;
    const existing = db.queryOne('SELECT * FROM summaries WHERE id = ?', [req.params.id]);
    if (!existing) {
      return res.status(404).json({ error: 'Summary not found' });
    }

    const now = new Date().toISOString();
    db.run('UPDATE summaries SET summary_text = ?, updated_at = ? WHERE id = ?', [summary_text, now, req.params.id]);

    logAuditEvent({
      patientId: existing.patient_id,
      reportId: existing.report_id,
      eventType: 'SUMMARY_EDITED',
      description: 'Clinician edited the patient-friendly summary text.',
      details: {}
    });

    res.json({ message: 'Summary updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
