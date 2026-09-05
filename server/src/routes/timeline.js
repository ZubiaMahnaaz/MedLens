import express from 'express';
import { getAuditTimeline } from '../services/auditService.js';

const router = express.Router();

router.get('/:patientId', (req, res) => {
  try {
    const timeline = getAuditTimeline(req.params.patientId);
    res.json({ timeline });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/patient/:patientId', (req, res) => {
  try {
    const timeline = getAuditTimeline(req.params.patientId);
    res.json({ timeline });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
