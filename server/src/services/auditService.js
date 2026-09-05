import { db } from '../db.js';
import crypto from 'crypto';

/**
 * Audit Logging Service
 * Records chronological traceability for every clinical data modification.
 */
export function logAuditEvent({ patientId, reportId = null, eventType, description, details = {}, actorName = 'Clinical Specialist', actorRole = 'Healthcare Staff' }) {
  try {
    const id = `aud_${crypto.randomUUID()}`;
    const createdAt = new Date().toISOString();
    const detailsJson = JSON.stringify(details);

    db.run(
      `INSERT INTO audit_events (id, patient_id, report_id, event_type, description, details_json, actor_name, actor_role, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, patientId, reportId, eventType, description, detailsJson, actorName, actorRole, createdAt]
    );

    return { id, eventType, description, createdAt };
  } catch (err) {
    console.error('Failed to log audit event:', err);
    return null;
  }
}

export function getAuditTimeline(patientId) {
  return db.queryAll(
    `SELECT * FROM audit_events WHERE patient_id = ? ORDER BY created_at DESC`,
    [patientId]
  ).map(event => ({
    ...event,
    details: event.details_json ? JSON.parse(event.details_json) : {}
  }));
}
