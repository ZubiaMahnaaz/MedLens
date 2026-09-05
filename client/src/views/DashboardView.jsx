import React from 'react';
import {
  Users,
  FileText,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Upload,
  UserPlus,
  GitCompare,
  ArrowRight,
  ShieldCheck,
  Search,
  Sparkles,
  Calendar,
  Clock,
  ChevronRight
} from 'lucide-react';
import { StatusBadge, ProvenanceBadge } from '../components/BadgesAndMeters.jsx';

export function DashboardView({
  patients = [],
  reports = [],
  selectedPatient,
  onSelectPatient,
  onOpenAddPatient,
  onOpenUpload,
  onNavigate,
  timeline = []
}) {
  // Aggregate stats
  const totalPatients = patients.length;
  const totalReports = reports.length;
  const pendingReports = reports.filter(r => r.status === 'EXTRACTED' || r.status === 'NEEDS_REVIEW').length;
  const abnormalPatients = patients.filter(p => p.abnormalResultsCount > 0).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner & Quick Hero */}
      <div className="dashboard-hero-banner" style={{
        background: 'linear-gradient(135deg, rgba(0, 210, 180, 0.12) 0%, rgba(2, 132, 199, 0.12) 100%)',
        border: '1px solid var(--border-highlight)',
        borderRadius: 'var(--radius-xl)',
        padding: '24px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ maxWidth: '640px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--primary-subtle)', color: 'var(--primary)', padding: '4px 10px', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: '700', marginBottom: '10px' }}>
            <Sparkles size={14} /> AI-POWERED CLINICAL INFORMATION INTELLIGENCE
          </div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '8px', color: 'var(--text-primary)' }}>
            Welcome to MedLens Intelligence
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: '1.5' }}>
            Organize fragmented patient records, parse unstructured laboratory panels into deterministic metrics, verify AI extractions side-by-side, and produce safe clinical summaries.
          </p>
        </div>

        <div className="hero-button-group" style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-primary" onClick={onOpenUpload}>
            <Upload size={16} /> Upload Lab Report
          </button>
          <button className="btn btn-secondary" onClick={onOpenAddPatient}>
            <UserPlus size={16} /> New Patient
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="dashboard-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '16px' }}>
        {/* Stat 1: Total Patients */}
        <div className="card" style={{ cursor: 'pointer' }} onClick={() => onNavigate('patients')}>
          <div className="card-header">
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600' }}>TOTAL PATIENT DOSSIERS</span>
            <div style={{ padding: '8px', borderRadius: 'var(--radius-md)', background: 'var(--primary-subtle)', color: 'var(--primary)' }}>
              <Users size={18} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--text-primary)' }}>
            {totalPatients}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Permanent records in SQLite DB
          </div>
        </div>

        {/* Stat 2: Reports Processed */}
        <div className="card">
          <div className="card-header">
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600' }}>REPORTS PROCESSED</span>
            <div style={{ padding: '8px', borderRadius: 'var(--radius-md)', background: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8' }}>
              <FileText size={18} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--text-primary)' }}>
            {totalReports}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Structured diagnostic panels
          </div>
        </div>

        {/* Stat 3: Pending Review */}
        <div className="card" style={{ cursor: 'pointer' }} onClick={() => onNavigate('review')}>
          <div className="card-header">
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600' }}>PENDING VERIFICATION</span>
            <div style={{ padding: '8px', borderRadius: 'var(--radius-md)', background: 'var(--status-high-bg)', color: 'var(--status-high)' }}>
              <AlertTriangle size={18} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '800', color: pendingReports > 0 ? 'var(--status-high)' : 'var(--status-normal)' }}>
            {pendingReports}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            {pendingReports > 0 ? 'Requires human clinician check' : 'All reports verified'}
          </div>
        </div>

        {/* Stat 4: Out of Range Flags */}
        <div className="card">
          <div className="card-header">
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600' }}>OUT-OF-RANGE PATIENTS</span>
            <div style={{ padding: '8px', borderRadius: 'var(--radius-md)', background: 'var(--status-low-bg)', color: 'var(--status-low)' }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--status-low)' }}>
            {abnormalPatients}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Strictly relative to report limits
          </div>
        </div>
      </div>

      {/* Main Content Grid: Patients Table & Recent Audit Trail */}
      <div className="dashboard-main-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>

        {/* Left Column: Quick Patient Directory */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-header">
            <div>
              <div className="card-title">
                <Users size={18} color="var(--primary)" /> Active Patient Registry
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Select a patient to view full dossier, uploaded lab reports, and longitudinal trends
              </div>
            </div>
            <button className="btn btn-outline btn-sm" onClick={() => onNavigate('patients')}>
              View All <ChevronRight size={14} />
            </button>
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Patient Identifier</th>
                  <th>Demographics</th>
                  <th>Primary Conditions</th>
                  <th>Reports</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {patients.map(p => (
                  <tr
                    key={p.id}
                    style={{
                      backgroundColor: p.id === selectedPatient?.id ? 'var(--primary-subtle)' : undefined,
                      cursor: 'pointer'
                    }}
                    onClick={() => {
                      onSelectPatient(p.id);
                      onNavigate('patient-profile');
                    }}
                  >
                    <td>
                      <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{p.name}</div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{p.identifier}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.82rem' }}>{p.age} yrs • {p.sex}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>DOB: {p.date_of_birth}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '220px' }}>
                        {(p.existing_conditions || []).slice(0, 2).map((c, i) => (
                          <span key={i} style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'var(--bg-input)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                            {c}
                          </span>
                        ))}
                        {(p.existing_conditions || []).length > 2 && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>+{(p.existing_conditions || []).length - 2}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.82rem', fontWeight: '600' }}>
                        {p.reportCount || 0} {p.reportCount === 1 ? 'Report' : 'Reports'}
                      </div>
                      {p.latestReportDate && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Latest: {p.latestReportDate}</div>
                      )}
                    </td>
                    <td>
                      {p.hasUnverifiedReports ? (
                        <span className="badge badge-high">Needs Review</span>
                      ) : p.abnormalResultsCount > 0 ? (
                        <span className="badge badge-low">{p.abnormalResultsCount} Out of Range</span>
                      ) : (
                        <span className="badge badge-normal">Normal</span>
                      )}
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectPatient(p.id);
                          onNavigate('patient-profile');
                        }}
                      >
                        Open Dossier
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Traceability & Timeline Feed */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Quick Demo Workflow helper */}
          <div className="card" style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-highlight)' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <ShieldCheck size={16} /> END-TO-END VERIFICATION FLOW
            </div>
            <ol style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li><strong>Select Patient:</strong> Choose Eleanor Vance or create new.</li>
              <li><strong>Upload Report:</strong> Drag & drop PDF or use 1-click sample.</li>
              <li><strong>Review Side-by-Side:</strong> Verify AI extractions against source.</li>
              <li><strong>Deterministic Classification:</strong> Compare with report limits only.</li>
              <li><strong>AI Summary:</strong> Generate compliant patient-friendly summary.</li>
              <li><strong>Longitudinal Compare:</strong> Track trends over time.</li>
            </ol>
          </div>

          {/* Audit History Snapshot */}
          <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div className="card-header">
              <div className="card-title" style={{ fontSize: '0.92rem' }}>
                <Clock size={16} color="var(--primary)" /> Traceability Audit Stream
              </div>
              <button className="btn btn-outline btn-sm" style={{ fontSize: '0.72rem', padding: '3px 8px' }} onClick={() => onNavigate('timeline')}>
                View All
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, overflowY: 'auto', maxHeight: '380px' }}>
              {timeline.slice(0, 5).map((event, idx) => (
                <div key={event.id || idx} style={{ padding: '10px', borderRadius: 'var(--radius-md)', background: 'var(--bg-input)', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--primary)' }}>
                      {event.event_type.replace(/_/g, ' ')}
                    </span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                      {new Date(event.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-primary)' }}>
                    {event.description}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                    By: {event.actor_name} ({event.actor_role})
                  </div>
                </div>
              ))}
              {timeline.length === 0 && (
                <div style={{ textAlign: 'center', padding: '24px 10px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  No audit activity recorded yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
