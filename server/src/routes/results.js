import express from 'express';
import { db } from '../db.js';
import { classifyValueAgainstRange } from '../services/rangeClassifier.js';
import { generateSafeClinicalSummary } from '../services/summaryService.js';
import { logAuditEvent } from '../services/auditService.js';
import crypto from 'crypto';

const router = express.Router();

// GET all results for a report
router.get('/report/:reportId', (req, res) => {
  try {
    const results = db.queryAll('SELECT * FROM report_results WHERE report_id = ? ORDER BY category, test_name', [req.params.reportId]);
    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update single test result (User Edit)
router.put('/:id', (req, res) => {
  try {
    const existing = db.queryOne('SELECT * FROM report_results WHERE id = ?', [req.params.id]);
    if (!existing) {
      return res.status(404).json({ error: 'Test result record not found' });
    }

    const {
      test_name,
      category,
      value_raw,
      unit,
      ref_range_raw,
      notes,
      is_verified
    } = req.body;

    const newTestName = test_name || existing.test_name;
    const newCategory = category || existing.category;
    const newValueRaw = value_raw !== undefined ? value_raw : existing.value_raw;
    const newUnit = unit !== undefined ? unit : existing.unit;
    const newRangeRaw = ref_range_raw !== undefined ? ref_range_raw : existing.ref_range_raw;
    const newNotes = notes !== undefined ? notes : existing.notes;

    // Run deterministic range evaluation on updated values
    const classification = classifyValueAgainstRange(newValueRaw, newRangeRaw);
    const now = new Date().toISOString();

    const newProvenance = is_verified ? 'VERIFIED' : 'USER_EDITED';
    const verifiedFlag = is_verified !== undefined ? (is_verified ? 1 : 0) : existing.is_verified;

    db.run(
      `UPDATE report_results SET
        test_name = ?,
        category = ?,
        value_raw = ?,
        value_numeric = ?,
        unit = ?,
        ref_range_raw = ?,
        ref_min = ?,
        ref_max = ?,
        status = ?,
        evaluation_reason = ?,
        provenance = ?,
        is_verified = ?,
        notes = ?,
        updated_at = ?
       WHERE id = ?`,
      [
        newTestName,
        newCategory,
        newValueRaw,
        classification.numericValue,
        newUnit,
        newRangeRaw,
        classification.refMin,
        classification.refMax,
        classification.status,
        classification.reason,
        newProvenance,
        verifiedFlag,
        newNotes,
        now,
        req.params.id
      ]
    );

    // Audit log edit
    logAuditEvent({
      patientId: existing.patient_id,
      reportId: existing.report_id,
      eventType: 'RESULT_EDITED',
      description: `Edited parameter "${newTestName}": Value changed from "${existing.value_raw}" to "${newValueRaw}" (Status: ${classification.status}).`,
      details: {
        testName: newTestName,
        previousValue: existing.value_raw,
        newValue: newValueRaw,
        previousRange: existing.ref_range_raw,
        newRange: newRangeRaw,
        newStatus: classification.status
      }
    });

    const updated = db.queryOne('SELECT * FROM report_results WHERE id = ?', [req.params.id]);
    res.json({ message: 'Result updated successfully', result: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST add manual / missed test result
router.post('/report/:reportId/add', (req, res) => {
  try {
    const report = db.queryOne('SELECT * FROM reports WHERE id = ?', [req.params.reportId]);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const {
      test_name,
      category,
      value_raw,
      unit,
      ref_range_raw,
      notes
    } = req.body;

    if (!test_name || value_raw === undefined) {
      return res.status(400).json({ error: 'Test name and value are required.' });
    }

    const classification = classifyValueAgainstRange(value_raw, ref_range_raw || 'Not available');
    const id = `res_${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    db.run(
      `INSERT INTO report_results (id, report_id, patient_id, test_name, category, value_raw, value_numeric, unit, ref_range_raw, ref_min, ref_max, status, evaluation_reason, provenance, is_verified, confidence, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        report.id,
        report.patient_id,
        test_name,
        category || 'General Diagnostic',
        value_raw,
        classification.numericValue,
        unit || 'Not available',
        ref_range_raw || 'Not available',
        classification.refMin,
        classification.refMax,
        classification.status,
        classification.reason,
        'USER_PROVIDED',
        1,
        1.0,
        notes || '',
        now,
        now
      ]
    );

    logAuditEvent({
      patientId: report.patient_id,
      reportId: report.id,
      eventType: 'RESULT_ADDED',
      description: `Manually added test parameter "${test_name}" = ${value_raw} ${unit || ''}.`,
      details: { testName: test_name, value: value_raw, unit, status: classification.status }
    });

    const newResult = db.queryOne('SELECT * FROM report_results WHERE id = ?', [id]);
    res.status(201).json({ message: 'Result added successfully', result: newResult });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE single test result
router.delete('/:id', (req, res) => {
  try {
    const existing = db.queryOne('SELECT * FROM report_results WHERE id = ?', [req.params.id]);
    if (!existing) {
      return res.status(404).json({ error: 'Result not found' });
    }

    db.run('DELETE FROM report_results WHERE id = ?', [req.params.id]);

    logAuditEvent({
      patientId: existing.patient_id,
      reportId: existing.report_id,
      eventType: 'RESULT_DELETED',
      description: `Removed test parameter "${existing.test_name}" from record.`,
      details: { testName: existing.test_name }
    });

    res.json({ message: 'Result deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST batch verify all results for a report
router.post('/report/:reportId/verify-all', (req, res) => {
  try {
    const report = db.queryOne('SELECT * FROM reports WHERE id = ?', [req.params.reportId]);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const now = new Date().toISOString();

    // Mark all results verified
    db.run(
      `UPDATE report_results SET is_verified = 1, provenance = CASE WHEN provenance = 'USER_PROVIDED' THEN 'VERIFIED' WHEN provenance = 'USER_EDITED' THEN 'VERIFIED' ELSE 'VERIFIED' END, updated_at = ? WHERE report_id = ?`,
      [now, report.id]
    );

    // Update report status
    db.run(
      `UPDATE reports SET status = 'VERIFIED', updated_at = ? WHERE id = ?`,
      [now, report.id]
    );

    // Re-generate and update clinical summary
    const allResults = db.queryAll('SELECT * FROM report_results WHERE report_id = ?', [report.id]);
    const safeSummary = generateSafeClinicalSummary(allResults, null, report.title);

    const existingSummary = db.queryOne('SELECT id FROM summaries WHERE report_id = ?', [report.id]);
    if (existingSummary) {
      db.run(
        `UPDATE summaries SET
          summary_text = ?,
          key_findings = ?,
          questions_for_doctor = ?,
          total_tests = ?,
          normal_count = ?,
          abnormal_count = ?,
          is_verified = 1,
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
          existingSummary.id
        ]
      );
    }

    logAuditEvent({
      patientId: report.patient_id,
      reportId: report.id,
      eventType: 'RECORD_VERIFIED',
      description: `Clinical verification completed for all ${allResults.length} parameters in "${report.title}".`,
      details: { totalVerified: allResults.length, abnormalCount: safeSummary.abnormalCount }
    });

    const updatedResults = db.queryAll('SELECT * FROM report_results WHERE report_id = ? ORDER BY category, test_name', [report.id]);
    res.json({
      message: 'All results successfully verified and locked',
      results: updatedResults,
      summary: safeSummary
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
