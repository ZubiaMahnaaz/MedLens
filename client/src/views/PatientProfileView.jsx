import React, { useState, useEffect } from 'react';
import {
  User,
  Calendar,
  ShieldAlert,
  Pill,
  FileText,
  Clock,
  Sparkles,
  GitCompare,
  Upload,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  FileCheck
} from 'lucide-react';
import { StatusBadge, ProvenanceBadge } from '../components/BadgesAndMeters.jsx';
import { api } from '../api.js';

export function PatientProfileView({
  patient,
  reports = [],
  onOpenUpload,
  onOpenEdit,
  onOpenReportReview,
  onOpenSummary,
  onOpenCompare,
  onNavigate
}) {
  const [activeTab, setActiveTab] = useState('dossier');
  const [timeline, setTimeline] = useState([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  useEffect(() => {
    if (patient?.id && activeTab === 'timeline') {
      setLoadingTimeline(true);
      api.getTimeline(patient.id)
        .then(res => setTimeline(res.timeline || []))
        .catch(err => console.error(err))
        .finally(() => setLoadingTimeline(false));
    }
  }, [patient?.id, activeTab]);

  if (!patient) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
        <h3>No Patient Selected</h3>
        <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>Please select a patient from the registry to view their profile.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Patient Header Banner */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(0, 210, 180, 0.06) 100%)',
        border: '1px solid var(--border-color)',
        padding: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '18px', alignItems: 'center' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: 'var(--radius-lg)',
              background: 'linear-gradient(135deg, #00d2b4, #0284c7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '800',
              fontSize: '1.5rem',
              color: '#090e1a',
              boxShadow: '0 4px 15px var(--primary-glow)'
            }}>
              {patient.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ fontSize: '1.6rem', color: 'var(--text-primary)' }}>{patient.name}</h2>
                <span style={{ fontSize: '0.82rem', padding: '3px 8px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-mono)', color: 'var(--primary)' }}>
                  {patient.identifier}
                </span>
                <ProvenanceBadge provenance={patient.provenance_meta?.name || 'USER_PROVIDED'} isVerified={true} />
              </div>

              <div style={{ display: 'flex', gap: '16px', color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '6px', flexWrap: 'wrap' }}>
                <span><strong>Age:</strong> {patient.age} yrs</span>
                <span>•</span>
                <span><strong>Sex:</strong> {patient.sex}</span>
                <span>•</span>
                <span><strong>DOB:</strong> {patient.date_of_birth}</span>
                <span>•</span>
                <span><strong>Reports:</strong> {reports.length} on file</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button className="btn btn-secondary btn-sm" onClick={onOpenEdit}>
              <Edit2 size={14} /> Edit Dossier
            </button>
            <button className="btn btn-primary btn-sm" onClick={onOpenUpload}>
              <Upload size={14} /> Upload Report
            </button>
            {reports.length >= 2 && (
              <button className="btn btn-outline btn-sm" onClick={onOpenCompare}>
                <GitCompare size={14} /> Compare Reports
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '12px', borderTop: '1px solid var(--border-color)', marginTop: '20px', paddingTop: '16px' }}>
          <button
            className={`btn btn-sm ${activeTab === 'dossier' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('dossier')}
          >
            <FileText size={14} /> Clinical Dossier & Reports ({reports.length})
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'timeline' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('timeline')}
          >
            <Clock size={14} /> Traceability Timeline
          </button>
        </div>
      </div>

      {/* Tab Content 1: Dossier & Diagnostic Reports */}
      {activeTab === 'dossier' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '20px' }}>
          {/* Left Column: Patient Baseline Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Allergies Warning Card */}
            {(patient.allergies || []).length > 0 && (
              <div className="card" style={{ background: 'var(--status-high-bg)', borderColor: 'var(--status-high-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--status-high)', fontWeight: '700', fontSize: '0.9rem', marginBottom: '8px' }}>
                  <ShieldAlert size={18} /> Drug Allergies & Sensitivities
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {(patient.allergies || []).map((a, i) => (
                    <span key={i} style={{ background: 'rgba(244, 63, 94, 0.25)', color: '#ffe4e6', padding: '3px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '600' }}>
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Conditions & Symptoms */}
            <div className="card">
              <div className="card-title" style={{ fontSize: '0.95rem', marginBottom: '10px' }}>
                Existing Conditions & Diagnoses
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
                {(patient.existing_conditions || []).map((c, i) => (
                  <span key={i} style={{ background: 'var(--primary-subtle)', color: 'var(--primary)', border: '1px solid var(--border-highlight)', padding: '4px 10px', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem', fontWeight: '600' }}>
                    {c}
                  </span>
                ))}
                {(patient.existing_conditions || []).length === 0 && (
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>No existing conditions logged.</span>
                )}
              </div>

              <div className="card-title" style={{ fontSize: '0.95rem', marginBottom: '10px' }}>
                Reported Symptoms
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {(patient.symptoms || []).map((s, i) => (
                  <span key={i} style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', padding: '3px 8px', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem' }}>
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Active Medications */}
            <div className="card">
              <div className="card-title" style={{ fontSize: '0.95rem', marginBottom: '12px' }}>
                <Pill size={16} color="var(--primary)" /> Current Active Medications
              </div>
              {(patient.current_medications || []).length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(patient.current_medications || []).map((m, i) => (
                    <div key={i} style={{ padding: '8px 12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '0.85rem' }}>{m.name}</div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>{m.frequency}</div>
                      </div>
                      <span style={{ padding: '2px 8px', background: 'var(--bg-card)', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600', color: 'var(--primary)' }}>
                        {m.dosage}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>No active medications listed.</div>
              )}
            </div>

            {/* Clinical Observations Notes */}
            {patient.notes && (
              <div className="card">
                <div className="card-title" style={{ fontSize: '0.95rem', marginBottom: '8px' }}>
                  Clinical Provider Notes
                </div>
                <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: '1.5', background: 'var(--bg-input)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  {patient.notes}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Uploaded Medical Reports */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="card" style={{ padding: '20px' }}>
              <div className="card-header">
                <div>
                  <div className="card-title" style={{ fontSize: '1.1rem' }}>
                    <FileText size={20} color="var(--primary)" /> Linked Medical Reports & Diagnostic Panels
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Extracted diagnostic panels with traceable provenance and reference range validations.
                  </div>
                </div>

                <button className="btn btn-primary btn-sm" onClick={onOpenUpload}>
                  <Upload size={14} /> Upload Lab Report
                </button>
              </div>

              {reports.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {reports.map(r => (
                    <div
                      key={r.id}
                      style={{
                        padding: '16px',
                        background: 'var(--bg-input)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                            {r.title}
                          </div>
                          <div style={{ display: 'flex', gap: '12px', fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                            <span><strong>Lab:</strong> {r.lab_name || 'Clinical Diagnostics'}</span>
                            <span>•</span>
                            <span><strong>Date:</strong> {r.report_date}</span>
                            <span>•</span>
                            <span><strong>File:</strong> {r.file_name}</span>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div>
                          {r.status === 'VERIFIED' ? (
                            <span className="badge badge-normal">✓ Verified Record</span>
                          ) : r.status === 'NEEDS_REVIEW' ? (
                            <span className="badge badge-high">⚠️ Needs Review</span>
                          ) : (
                            <span className="badge badge-low">Pending Verification</span>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: 'flex', gap: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => onOpenReportReview(r.id)}
                        >
                          <ShieldCheck size={14} color="var(--primary)" /> Dual-Pane Review
                        </button>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => onOpenSummary(r.id)}
                        >
                          <Sparkles size={14} color="#a855f7" /> AI Summary
                        </button>
                        {reports.length >= 2 && (
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={onOpenCompare}
                          >
                            <GitCompare size={14} /> Compare
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '36px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-color)' }}>
                  <FileText size={32} color="var(--text-muted)" style={{ margin: '0 auto 8px auto' }} />
                  <div style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-primary)' }}>No medical reports uploaded yet</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px', marginBottom: '14px' }}>
                    Upload a PDF/PNG lab report or test with our pre-packaged clinical panels.
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={onOpenUpload}>
                    <Upload size={14} /> Upload First Report
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab Content 2: Traceability Timeline */}
      {activeTab === 'timeline' && (
        <div className="card" style={{ padding: '24px' }}>
          <div className="card-header">
            <div className="card-title">
              <Clock size={18} color="var(--primary)" /> Chronological Traceability Stream
            </div>
          </div>

          {loadingTimeline ? (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>Loading audit history...</div>
          ) : timeline.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', paddingLeft: '24px' }}>
              <div style={{ position: 'absolute', left: '7px', top: '8px', bottom: '8px', width: '2px', background: 'var(--border-color)' }} />
              {timeline.map((event, idx) => (
                <div key={event.id || idx} style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '-24px', top: '4px', width: '14px', height: '14px', borderRadius: '50%', background: 'var(--primary)', border: '3px solid var(--bg-card)' }} />
                  <div style={{ background: 'var(--bg-input)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--primary)' }}>
                        {event.event_type.replace(/_/g, ' ')}
                      </span>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        {new Date(event.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                      {event.description}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Logged by: {event.actor_name} ({event.actor_role})
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No audit events logged yet.</div>
          )}
        </div>
      )}
    </div>
  );
}
