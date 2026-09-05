import express from 'express';
import { db } from '../db.js';
import { logAuditEvent } from '../services/auditService.js';

const router = express.Router();

// GET conflicts for a report
router.get('/report/:reportId', (req, res) => {
  try {
    const report = db.queryOne('SELECT id, patient_id, title, status, conflicts FROM reports WHERE id = ?', [req.params.reportId]);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    const conflicts = report.conflicts ? JSON.parse(report.conflicts) : [];
    res.json({ reportId: report.id, status: report.status, conflicts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST resolve conflict
router.post('/resolve', (req, res) => {
  try {
    const { reportId, conflictId, resolutionNote, resolutionAction } = req.body;
    if (!reportId || !conflictId) {
      return res.status(400).json({ error: 'reportId and conflictId are required.' });
    }

    const report = db.queryOne('SELECT * FROM reports WHERE id = ?', [reportId]);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const conflicts = report.conflicts ? JSON.parse(report.conflicts) : [];
    const remainingConflicts = conflicts.filter(c => c.id !== conflictId);

    const now = new Date().toISOString();
    const newStatus = remainingConflicts.length === 0 ? 'EXTRACTED' : 'NEEDS_REVIEW';

    db.run(
      'UPDATE reports SET conflicts = ?, status = ?, updated_at = ? WHERE id = ?',
      [JSON.stringify(remainingConflicts), newStatus, now, reportId]
    );

    logAuditEvent({
      patientId: report.patient_id,
      reportId: report.id,
      eventType: 'CONFLICT_RESOLVED',
      description: `Conflict (${conflictId}) resolved: ${resolutionAction || 'Verified by clinical reviewer'}. Note: ${resolutionNote || 'No additional note provided'}.`,
      details: { conflictId, resolutionAction, resolutionNote }
    });

    res.json({
      message: 'Conflict resolved successfully',
      remainingConflicts,
      reportStatus: newStatus
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
