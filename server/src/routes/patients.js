import express from 'express';
import { db } from '../db.js';
import { logAuditEvent } from '../services/auditService.js';
import crypto from 'crypto';

const router = express.Router();

// Helper to calculate age from DOB
function calculateAge(dobString) {
  if (!dobString) return null;
  const birthDate = new Date(dobString);
  if (isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
}

// GET all patients with optional filtering & search
router.get('/', (req, res) => {
  try {
    const { search, condition, status } = req.query;
    let query = 'SELECT * FROM patients ORDER BY updated_at DESC';
    let patients = db.queryAll(query);

    // Parse JSON fields
    patients = patients.map(p => ({
      ...p,
      symptoms: p.symptoms ? JSON.parse(p.symptoms) : [],
      existing_conditions: p.existing_conditions ? JSON.parse(p.existing_conditions) : [],
      allergies: p.allergies ? JSON.parse(p.allergies) : [],
      current_medications: p.current_medications ? JSON.parse(p.current_medications) : [],
      provenance_meta: p.provenance_meta ? JSON.parse(p.provenance_meta) : {}
    }));

    // Augment with report counts and unverified flags
    for (const p of patients) {
      const reports = db.queryAll('SELECT id, status, report_date FROM reports WHERE patient_id = ?', [p.id]);
      p.reportCount = reports.length;
      p.latestReportDate = reports.length > 0 ? reports[0].report_date : null;
      p.hasUnverifiedReports = reports.some(r => r.status === 'EXTRACTED' || r.status === 'NEEDS_REVIEW');

      // Check abnormal lab counts
      const abnormalResults = db.queryAll(
        `SELECT COUNT(*) as count FROM report_results WHERE patient_id = ? AND (status = 'HIGH' OR status = 'LOW')`,
        [p.id]
      );
      p.abnormalResultsCount = abnormalResults[0]?.count || 0;
    }

    // Filter in-memory if query params present
    if (search) {
      const s = search.toLowerCase();
      patients = patients.filter(p =>
        p.name.toLowerCase().includes(s) ||
        p.identifier.toLowerCase().includes(s) ||
        (p.existing_conditions || []).some(c => c.toLowerCase().includes(s))
      );
    }

    if (condition && condition !== 'ALL') {
      patients = patients.filter(p =>
        (p.existing_conditions || []).some(c => c.toLowerCase().includes(condition.toLowerCase()))
      );
    }

    if (status === 'UNVERIFIED') {
      patients = patients.filter(p => p.hasUnverifiedReports);
    } else if (status === 'ABNORMAL') {
      patients = patients.filter(p => p.abnormalResultsCount > 0);
    }

    res.json({ patients });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single patient by ID
router.get('/:id', (req, res) => {
  try {
    const patient = db.queryOne('SELECT * FROM patients WHERE id = ?', [req.params.id]);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const reports = db.queryAll('SELECT * FROM reports WHERE patient_id = ? ORDER BY report_date DESC', [patient.id]);
    const summaries = db.queryAll('SELECT * FROM summaries WHERE patient_id = ? ORDER BY created_at DESC', [patient.id]);

    const formattedPatient = {
      ...patient,
      symptoms: patient.symptoms ? JSON.parse(patient.symptoms) : [],
      existing_conditions: patient.existing_conditions ? JSON.parse(patient.existing_conditions) : [],
      allergies: patient.allergies ? JSON.parse(patient.allergies) : [],
      current_medications: patient.current_medications ? JSON.parse(patient.current_medications) : [],
      provenance_meta: patient.provenance_meta ? JSON.parse(patient.provenance_meta) : {},
      reports: reports.map(r => ({
        ...r,
        conflicts: r.conflicts ? JSON.parse(r.conflicts) : []
      })),
      summaries: summaries.map(s => ({
        ...s,
        key_findings: s.key_findings ? JSON.parse(s.key_findings) : [],
        questions_for_doctor: s.questions_for_doctor ? JSON.parse(s.questions_for_doctor) : []
      }))
    };

    res.json({ patient: formattedPatient });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create new patient
router.post('/', (req, res) => {
  try {
    const {
      name,
      identifier,
      date_of_birth,
      sex,
      symptoms,
      existing_conditions,
      allergies,
      current_medications,
      notes,
      provenance_meta
    } = req.body;

    if (!name || !date_of_birth) {
      return res.status(400).json({ error: 'Patient Name and Date of Birth are required.' });
    }

    const id = `pat_${crypto.randomUUID()}`;
    const uniqueIdentifier = identifier || `PT-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const age = calculateAge(date_of_birth);
    const now = new Date().toISOString();

    const symptomsJson = JSON.stringify(Array.isArray(symptoms) ? symptoms : (symptoms ? [symptoms] : []));
    const conditionsJson = JSON.stringify(Array.isArray(existing_conditions) ? existing_conditions : (existing_conditions ? [existing_conditions] : []));
    const allergiesJson = JSON.stringify(Array.isArray(allergies) ? allergies : (allergies ? [allergies] : []));
    const medicationsJson = JSON.stringify(Array.isArray(current_medications) ? current_medications : []);
    const metaJson = JSON.stringify(provenance_meta || {
      name: 'USER_PROVIDED',
      date_of_birth: 'USER_PROVIDED',
      symptoms: 'USER_PROVIDED',
      existing_conditions: 'USER_PROVIDED',
      allergies: 'USER_PROVIDED',
      current_medications: 'USER_PROVIDED'
    });

    db.run(
      `INSERT INTO patients (id, identifier, name, date_of_birth, age, sex, symptoms, existing_conditions, allergies, current_medications, notes, provenance_meta, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, uniqueIdentifier, name.trim(), date_of_birth, age, sex || 'Unspecified', symptomsJson, conditionsJson, allergiesJson, medicationsJson, notes || '', metaJson, now, now]
    );

    logAuditEvent({
      patientId: id,
      eventType: 'PATIENT_CREATED',
      description: `Registered new patient record for ${name} (${uniqueIdentifier}).`,
      details: { name, identifier: uniqueIdentifier, date_of_birth, age, sex }
    });

    res.status(201).json({
      message: 'Patient registered successfully',
      patient: {
        id,
        identifier: uniqueIdentifier,
        name,
        date_of_birth,
        age,
        sex,
        symptoms: JSON.parse(symptomsJson),
        existing_conditions: JSON.parse(conditionsJson),
        allergies: JSON.parse(allergiesJson),
        current_medications: JSON.parse(medicationsJson),
        notes,
        provenance_meta: JSON.parse(metaJson),
        created_at: now,
        updated_at: now
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update patient
router.put('/:id', (req, res) => {
  try {
    const existing = db.queryOne('SELECT * FROM patients WHERE id = ?', [req.params.id]);
    if (!existing) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const {
      name,
      date_of_birth,
      sex,
      symptoms,
      existing_conditions,
      allergies,
      current_medications,
      notes,
      provenance_meta
    } = req.body;

    const age = date_of_birth ? calculateAge(date_of_birth) : existing.age;
    const now = new Date().toISOString();

    const symptomsJson = symptoms !== undefined ? JSON.stringify(Array.isArray(symptoms) ? symptoms : [symptoms]) : existing.symptoms;
    const conditionsJson = existing_conditions !== undefined ? JSON.stringify(Array.isArray(existing_conditions) ? existing_conditions : [existing_conditions]) : existing.existing_conditions;
    const allergiesJson = allergies !== undefined ? JSON.stringify(Array.isArray(allergies) ? allergies : [allergies]) : existing.allergies;
    const medicationsJson = current_medications !== undefined ? JSON.stringify(Array.isArray(current_medications) ? current_medications : []) : existing.current_medications;

    // Update provenance tag
    let updatedMeta = existing.provenance_meta ? JSON.parse(existing.provenance_meta) : {};
    if (provenance_meta) {
      updatedMeta = { ...updatedMeta, ...provenance_meta };
    } else {
      updatedMeta = { ...updatedMeta, last_edited: 'USER_EDITED' };
    }

    db.run(
      `UPDATE patients SET
        name = ?,
        date_of_birth = ?,
        age = ?,
        sex = ?,
        symptoms = ?,
        existing_conditions = ?,
        allergies = ?,
        current_medications = ?,
        notes = ?,
        provenance_meta = ?,
        updated_at = ?
       WHERE id = ?`,
      [
        name ? name.trim() : existing.name,
        date_of_birth || existing.date_of_birth,
        age,
        sex || existing.sex,
        symptomsJson,
        conditionsJson,
        allergiesJson,
        medicationsJson,
        notes !== undefined ? notes : existing.notes,
        JSON.stringify(updatedMeta),
        now,
        req.params.id
      ]
    );

    logAuditEvent({
      patientId: req.params.id,
      eventType: 'PATIENT_UPDATED',
      description: `Updated clinical profile details for patient ${name || existing.name}.`,
      details: { updatedFields: Object.keys(req.body) }
    });

    res.json({ message: 'Patient updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE patient
router.delete('/:id', (req, res) => {
  try {
    const patient = db.queryOne('SELECT name, identifier FROM patients WHERE id = ?', [req.params.id]);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    db.run('DELETE FROM report_results WHERE patient_id = ?', [req.params.id]);
    db.run('DELETE FROM summaries WHERE patient_id = ?', [req.params.id]);
    db.run('DELETE FROM reports WHERE patient_id = ?', [req.params.id]);
    db.run('DELETE FROM audit_events WHERE patient_id = ?', [req.params.id]);
    db.run('DELETE FROM patients WHERE id = ?', [req.params.id]);

    res.json({ message: `Patient ${patient.name} deleted successfully` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
