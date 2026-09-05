import React, { useState, useEffect } from 'react';
import {
  Clock,
  Filter,
  ShieldCheck,
  Edit3,
  Upload,
  FileCheck,
  AlertTriangle,
  X,
  Check,
  UserCheck
} from 'lucide-react';
import { api } from '../api.js';

export function PatientTimelineView({
  patient,
  patients = [],
  onSelectPatient
}) {
  const [timeline, setTimeline] = useState([]);
  const [filterType, setFilterType] = useState('ALL');
  const [loading, setLoading] = useState(false);

  const loadTimeline = async (patientId) => {
    if (!patientId) return;
    try {
      setLoading(true);
      const res = await api.getTimeline(patientId);
      setTimeline(res.timeline || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (patient?.id) {
      loadTimeline(patient.id);
    }
  }, [patient?.id]);

  const filtered = timeline.filter(event => {
    if (filterType === 'ALL') return true;
    return event.event_type === filterType;
  });

  const getEventIcon = (type) => {
    switch (type) {
      case 'RECORD_VERIFIED':
        return <ShieldCheck size={16} color="var(--status-normal)" />;
      case 'RESULT_EDITED':
      case 'PATIENT_UPDATED':
        return <Edit3 size={16} color="var(--accent-cyan)" />;
      case 'REPORT_UPLOADED':
      case 'DATA_EXTRACTED':
        return <Upload size={16} color="var(--primary)" />;
      case 'SUMMARY_GENERATED':
        return <FileCheck size={16} color="#a855f7" />;
      case 'CONFLICT_RESOLVED':
        return <AlertTriangle size={16} color="var(--status-high)" />;
      default:
        return <Clock size={16} color="var(--text-muted)" />;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '900px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.45rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={24} color="var(--primary)" /> Patient Traceability & Clinical Audit Stream
          </h2>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Complete chronological audit trail for <strong>{patient?.name}</strong> ({patient?.identifier}).
          </div>
        </div>

        {/* Patient Switcher */}
        <select
          className="form-select"
          style={{ width: '220px' }}
          value={patient?.id || ''}
          onChange={(e) => onSelectPatient(e.target.value)}
        >
          {patients.map(p => (
            <option key={p.id} value={p.id}>{p.name} ({p.identifier})</option>
          ))}
        </select>
      </div>

      {/* Filter Tabs */}
      <div className="card" style={{ padding: '12px 18px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button
          className={`btn btn-sm ${filterType === 'ALL' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setFilterType('ALL')}
        >
          All Activity ({timeline.length})
        </button>
        <button
          className={`btn btn-sm ${filterType === 'RECORD_VERIFIED' ? 'btn-success' : 'btn-outline'}`}
          onClick={() => setFilterType('RECORD_VERIFIED')}
        >
          Verifications
        </button>
        <button
          className={`btn btn-sm ${filterType === 'RESULT_EDITED' ? 'btn-secondary' : 'btn-outline'}`}
          onClick={() => setFilterType('RESULT_EDITED')}
        >
          User Edits
        </button>
        <button
          className={`btn btn-sm ${filterType === 'REPORT_UPLOADED' ? 'btn-secondary' : 'btn-outline'}`}
          onClick={() => setFilterType('REPORT_UPLOADED')}
        >
          Uploads & OCR
        </button>
        <button
          className={`btn btn-sm ${filterType === 'SUMMARY_GENERATED' ? 'btn-secondary' : 'btn-outline'}`}
          onClick={() => setFilterType('SUMMARY_GENERATED')}
        >
          AI Summaries
        </button>
      </div>

      {/* Timeline Stream */}
      <div className="card" style={{ padding: '24px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>Loading audit timeline...</div>
        ) : filtered.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative', paddingLeft: '32px' }}>
            <div style={{ position: 'absolute', left: '11px', top: '10px', bottom: '10px', width: '2px', background: 'var(--border-color)' }} />
            {filtered.map((event, idx) => (
              <div key={event.id || idx} style={{ position: 'relative' }}>
                <div style={{
                  position: 'absolute',
                  left: '-32px',
                  top: '2px',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'var(--bg-card)',
                  border: '2px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {getEventIcon(event.event_type)}
                </div>

                <div style={{
                  background: 'var(--bg-input)',
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontWeight: '700', fontSize: '0.88rem', color: 'var(--primary)' }}>
                      {event.event_type.replace(/_/g, ' ')}
                    </span>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      {new Date(event.created_at).toLocaleString()}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: '1.5' }}>
                    {event.description}
                  </div>

                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '8px', display: 'flex', gap: '8px' }}>
                    <span>Logged by: <strong>{event.actor_name}</strong></span>
                    <span>•</span>
                    <span>Role: {event.actor_role}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
            No audit history matching this filter.
          </div>
        )}
      </div>
    </div>
  );
}

export function ConflictResolveModal({
  isOpen,
  onClose,
  reportId,
  conflict,
  onResolved
}) {
  if (!isOpen || !conflict) return null;

  const [resolutionAction, setResolutionAction] = useState('Override & Confirm Patient Match');
  const [resolutionNote, setResolutionNote] = useState('');
  const [resolving, setResolving] = useState(false);

  const handleResolve = async (e) => {
    e.preventDefault();
    setResolving(true);
    try {
      await api.resolveConflict(reportId, conflict.id, resolutionNote, resolutionAction);
      onResolved();
      onClose();
    } catch (err) {
      alert(err.message || 'Failed to resolve conflict');
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '550px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--status-high)' }}>
            <AlertTriangle size={20} />
            <h3 style={{ fontSize: '1.15rem' }}>Conflict Review & Resolution</h3>
          </div>
          <button className="btn btn-outline btn-icon-only" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleResolve}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ padding: '12px', background: 'var(--status-high-bg)', border: '1px solid var(--status-high-border)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--status-high)' }}>
                {conflict.title}
              </div>
              <div style={{ fontSize: '0.82rem', color: '#ffe4e6', marginTop: '4px' }}>
                {conflict.description}
              </div>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Select Resolution Action</label>
              <select
                className="form-select"
                value={resolutionAction}
                onChange={(e) => setResolutionAction(e.target.value)}
              >
                <option value="Override & Confirm Patient Match">Override & Confirm Patient Match (Verified Clinically)</option>
                <option value="Keep Profile Data & Proceed">Keep Patient Profile Data & Accept Lab Discrepancy</option>
                <option value="Report Verified As Correct Specimen">Verified As Correct Specimen & Patient</option>
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Reviewer Note / Justification</label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="Enter justification for resolving this conflict..."
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={resolving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={resolving}>
              {resolving ? 'Resolving...' : 'Confirm Resolution'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
