import React, { useState } from 'react';
import {
  Users,
  Search,
  Filter,
  UserPlus,
  Trash2,
  Edit2,
  FileText,
  Clock,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  ChevronRight
} from 'lucide-react';
import { StatusBadge, ProvenanceBadge } from '../components/BadgesAndMeters.jsx';

export function PatientsView({
  patients = [],
  selectedPatient,
  onSelectPatient,
  onOpenAddPatient,
  onEditPatient,
  onDeletePatient,
  onNavigate
}) {
  const [search, setSearch] = useState('');
  const [filterCondition, setFilterCondition] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Collect all unique conditions across patients for filter buttons
  const allConditions = Array.from(new Set(patients.flatMap(p => p.existing_conditions || [])));

  // Filtered patients list
  const filtered = patients.filter(p => {
    const matchesSearch = !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.identifier.toLowerCase().includes(search.toLowerCase()) ||
      (p.existing_conditions || []).some(c => c.toLowerCase().includes(search.toLowerCase()));

    const matchesCondition = filterCondition === 'ALL' ||
      (p.existing_conditions || []).includes(filterCondition);

    const matchesStatus = filterStatus === 'ALL' ||
      (filterStatus === 'UNVERIFIED' && p.hasUnverifiedReports) ||
      (filterStatus === 'ABNORMAL' && p.abnormalResultsCount > 0) ||
      (filterStatus === 'NORMAL' && !p.hasUnverifiedReports && p.abnormalResultsCount === 0);

    return matchesSearch && matchesCondition && matchesStatus;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header */}
      <div className="view-header-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.45rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={24} color="var(--primary)" /> Patient Dossier Registry
          </h2>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Comprehensive directory of patient profiles, clinical provenances, and linked diagnostic records.
          </div>
        </div>

        <button className="btn btn-primary" onClick={onOpenAddPatient}>
          <UserPlus size={16} /> Register New Patient
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="card filter-bar-card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div className="filter-input-row" style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>

          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '36px' }}
              placeholder="Filter by name, MRN identifier, chronic condition..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="form-select"
            style={{ width: '220px' }}
            value={filterCondition}
            onChange={(e) => setFilterCondition(e.target.value)}
          >
            <option value="ALL">All Clinical Conditions</option>
            {allConditions.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Status Filter Chips */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginRight: '4px' }}>
            Filter:
          </span>
          <button
            className={`btn btn-sm ${filterStatus === 'ALL' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilterStatus('ALL')}
          >
            All Patients ({patients.length})
          </button>
          <button
            className={`btn btn-sm ${filterStatus === 'UNVERIFIED' ? 'btn-danger' : 'btn-outline'}`}
            onClick={() => setFilterStatus('UNVERIFIED')}
          >
            Pending Verification ({patients.filter(p => p.hasUnverifiedReports).length})
          </button>
          <button
            className={`btn btn-sm ${filterStatus === 'ABNORMAL' ? 'btn-secondary' : 'btn-outline'}`}
            onClick={() => setFilterStatus('ABNORMAL')}
          >
            Out-of-Range Parameters ({patients.filter(p => p.abnormalResultsCount > 0).length})
          </button>
          <button
            className={`btn btn-sm ${filterStatus === 'NORMAL' ? 'btn-success' : 'btn-outline'}`}
            onClick={() => setFilterStatus('NORMAL')}
          >
            All Normal
          </button>
        </div>
      </div>

      {/* Patients Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container" style={{ border: 'none' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Patient Details</th>
                <th>Demographics</th>
                <th>Conditions & Allergies</th>
                <th>Active Medications</th>
                <th>Diagnostic Reports</th>
                <th>Provenance</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
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
                  {/* Name & ID */}
                  <td>
                    <div style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '0.95rem' }}>{p.name}</div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>{p.identifier}</div>
                  </td>

                  {/* Demographics */}
                  <td>
                    <div style={{ fontSize: '0.85rem' }}>{p.age} years old</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{p.sex} • DOB: {p.date_of_birth}</div>
                  </td>

                  {/* Conditions & Allergies */}
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '240px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {(p.existing_conditions || []).map((c, i) => (
                          <span key={i} style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'var(--bg-input)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                            {c}
                          </span>
                        ))}
                      </div>
                      {(p.allergies || []).length > 0 && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--status-high)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <span>⚠️</span> Allergies: {(p.allergies || []).join(', ')}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Medications */}
                  <td>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {(p.current_medications || []).length > 0 ? (
                        <ul style={{ paddingLeft: '14px', margin: 0, fontSize: '0.75rem' }}>
                          {(p.current_medications || []).slice(0, 2).map((m, i) => (
                            <li key={i}>{m.name} {m.dosage ? `(${m.dosage})` : ''}</li>
                          ))}
                          {(p.current_medications || []).length > 2 && (
                            <span style={{ color: 'var(--text-muted)' }}>+{(p.current_medications || []).length - 2} more</span>
                          )}
                        </ul>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>None logged</span>
                      )}
                    </div>
                  </td>

                  {/* Reports */}
                  <td>
                    <div style={{ fontSize: '0.85rem', fontWeight: '600' }}>
                      {p.reportCount || 0} Reports
                    </div>
                    {p.hasUnverifiedReports ? (
                      <span className="badge badge-high" style={{ marginTop: '2px' }}>Needs Review</span>
                    ) : p.abnormalResultsCount > 0 ? (
                      <span className="badge badge-low" style={{ marginTop: '2px' }}>{p.abnormalResultsCount} Out of Range</span>
                    ) : (
                      <span className="badge badge-normal" style={{ marginTop: '2px' }}>All Normal</span>
                    )}
                  </td>

                  {/* Provenance */}
                  <td>
                    <ProvenanceBadge provenance={p.provenance_meta?.name || 'USER_PROVIDED'} isVerified={true} />
                  </td>

                  {/* Actions */}
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          onSelectPatient(p.id);
                          onNavigate('patient-profile');
                        }}
                        title="Open Patient Profile"
                      >
                        Profile
                      </button>
                      <button
                        className="btn btn-outline btn-sm btn-icon-only"
                        onClick={() => onEditPatient(p)}
                        title="Edit Patient Details"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        className="btn btn-danger btn-sm btn-icon-only"
                        onClick={() => onDeletePatient(p.id)}
                        title="Delete Patient Record"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    No patient records matched the active filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
