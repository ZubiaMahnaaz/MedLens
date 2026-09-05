import express from 'express';
import { db } from '../db.js';
import { logAuditEvent } from '../services/auditService.js';

const router = express.Router();

router.get('/', (req, res) => {
  try {
    const { patientId, report1Id, report2Id } = req.query;

    if (!patientId || !report1Id || !report2Id) {
      return res.status(400).json({ error: 'patientId, report1Id, and report2Id are required parameters.' });
    }

    const patient = db.queryOne('SELECT id, name, identifier FROM patients WHERE id = ?', [patientId]);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const report1 = db.queryOne('SELECT id, title, report_date, lab_name, status FROM reports WHERE id = ?', [report1Id]);
    const report2 = db.queryOne('SELECT id, title, report_date, lab_name, status FROM reports WHERE id = ?', [report2Id]);

    if (!report1 || !report2) {
      return res.status(404).json({ error: 'One or both reports not found.' });
    }

    // Determine chronological order (earlier is previous, later is current)
    let previousReport = report1;
    let currentReport = report2;
    if (new Date(report1.report_date) > new Date(report2.report_date)) {
      previousReport = report2;
      currentReport = report1;
    }

    const prevResults = db.queryAll('SELECT * FROM report_results WHERE report_id = ?', [previousReport.id]);
    const currResults = db.queryAll('SELECT * FROM report_results WHERE report_id = ?', [currentReport.id]);

    const prevMap = new Map();
    prevResults.forEach(r => prevMap.set(r.test_name.toLowerCase(), r));

    const currMap = new Map();
    currResults.forEach(r => currMap.set(r.test_name.toLowerCase(), r));

    // Combine all unique test names
    const allTestNames = Array.from(new Set([...prevMap.keys(), ...currMap.keys()]));
    const comparisons = [];

    let increasedCount = 0;
    let decreasedCount = 0;
    let unchangedCount = 0;

    for (const key of allTestNames) {
      const prev = prevMap.get(key);
      const curr = currMap.get(key);

      const testName = curr ? curr.test_name : prev.test_name;
      const category = curr ? curr.category : prev.category;
      const unit = curr ? curr.unit : prev.unit;

      let trend = 'Unchanged';
      let deltaNumeric = null;
      let percentChange = null;

      if (prev && curr) {
        if (prev.value_numeric !== null && curr.value_numeric !== null) {
          deltaNumeric = Math.round((curr.value_numeric - prev.value_numeric) * 100) / 100;
          if (prev.value_numeric !== 0) {
            percentChange = Math.round(((curr.value_numeric - prev.value_numeric) / prev.value_numeric) * 1000) / 10;
          }

          if (deltaNumeric > 0.001) {
            trend = 'Increased';
            increasedCount++;
          } else if (deltaNumeric < -0.001) {
            trend = 'Decreased';
            decreasedCount++;
          } else {
            trend = 'Unchanged';
            unchangedCount++;
          }
        } else {
          trend = prev.value_raw === curr.value_raw ? 'Unchanged' : 'Changed';
          if (trend === 'Unchanged') unchangedCount++;
        }
      } else if (curr && !prev) {
        trend = 'New Test Parameter';
      } else if (prev && !curr) {
        trend = 'Not In Current Panel';
      }

      comparisons.push({
        test_name: testName,
        category,
        unit,
        previous: prev ? {
          value_raw: prev.value_raw,
          value_numeric: prev.value_numeric,
          status: prev.status,
          ref_range_raw: prev.ref_range_raw,
          provenance: prev.provenance
        } : null,
        current: curr ? {
          value_raw: curr.value_raw,
          value_numeric: curr.value_numeric,
          status: curr.status,
          ref_range_raw: curr.ref_range_raw,
          provenance: curr.provenance
        } : null,
        change: {
          trend,
          deltaNumeric,
          percentChange,
          isStatusChanged: prev && curr ? prev.status !== curr.status : false
        }
      });
    }

    // Sort by category then name
    comparisons.sort((a, b) => (a.category || '').localeCompare(b.category || '') || a.test_name.localeCompare(b.test_name));

    logAuditEvent({
      patientId,
      eventType: 'REPORT_COMPARED',
      description: `Compared longitudinal reports: "${previousReport.title}" (${previousReport.report_date}) vs "${currentReport.title}" (${currentReport.report_date}).`,
      details: {
        previousReportId: previousReport.id,
        currentReportId: currentReport.id,
        parametersCompared: comparisons.length
      }
    });

    res.json({
      patient,
      previousReport,
      currentReport,
      summary: {
        totalCompared: comparisons.length,
        increasedCount,
        decreasedCount,
        unchangedCount
      },
      comparisons
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
