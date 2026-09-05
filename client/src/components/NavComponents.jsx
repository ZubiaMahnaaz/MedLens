import React from 'react';
import {
  Activity,
  Users,
  FileText,
  GitCompare,
  Clock,
  Sparkles,
  Sun,
  Moon,
  Search,
  ShieldCheck,
  UserCheck,
  ChevronDown
} from 'lucide-react';

export function Navbar({
  theme,
  setTheme,
  activeUser,
  allUsers = [],
  onSwitchUser,
  patients = [],
  selectedPatientId,
  onSelectPatient,
  searchQuery,
  setSearchQuery,
  pendingReviewCount = 0
}) {
  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  return (
    <header className="top-navbar">
      {/* Search Input */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, maxWidth: '400px' }}>
        <div style={{ position: 'relative', width: '100%' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '36px', height: '38px', fontSize: '0.85rem' }}
            placeholder="Search patients, tests, MRN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Center / Right controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Active Patient Quick Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-input)', padding: '4px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Active Patient:</span>
          <select
            className="form-select"
            style={{ border: 'none', background: 'transparent', padding: '2px 8px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--primary)', cursor: 'pointer', width: 'auto' }}
            value={selectedPatientId || ''}
            onChange={(e) => onSelectPatient(e.target.value)}
          >
            {patients.map(p => (
              <option key={p.id} value={p.id} style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                {p.name} ({p.identifier})
              </option>
            ))}
          </select>
        </div>

        {/* Theme Toggle Button */}
        <button
          className="btn btn-secondary btn-icon-only"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? <Sun size={17} color="#fbbf24" /> : <Moon size={17} color="#38bdf8" />}
        </button>

        {/* Clinician Profile Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingLeft: '12px', borderLeft: '1px solid var(--border-color)' }}>
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #00d2b4, #0284c7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '700',
            fontSize: '0.85rem',
            color: '#090e1a'
          }}>
            {activeUser?.avatar_initials || 'MD'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)' }}>
              {activeUser?.full_name || 'Dr. Sarah Chen, MD'}
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
              {activeUser?.role || 'Clinical Specialist'}
            </span>
          </div>
          {allUsers.length > 1 && (
            <select
              style={{
                marginLeft: '4px',
                padding: '4px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '0.75rem'
              }}
              value={activeUser?.id || ''}
              onChange={(e) => onSwitchUser(e.target.value)}
              title="Switch Clinician User"
            >
              {allUsers.map(u => (
                <option key={u.id} value={u.id} style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                  Switch to {u.full_name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
    </header>
  );
}

export function Sidebar({
  activeView,
  setActiveView,
  pendingCount = 0,
  selectedPatient,
  hasActiveReport = false
}) {
  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="brand-box">
        <div className="brand-icon">
          <Activity size={22} strokeWidth={2.5} />
        </div>
        <div>
          <div className="brand-title">MedLens</div>
          <div className="brand-sub">Clinical Intelligence</div>
        </div>
      </div>

      {/* Active Patient Card in Sidebar */}
      {selectedPatient && (
        <div style={{
          margin: '14px 12px 6px 12px',
          padding: '12px',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)'
        }}>
          <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.04em' }}>
            Current Dossier
          </div>
          <div style={{ fontSize: '0.92rem', fontWeight: '700', color: 'var(--text-primary)', marginTop: '2px' }}>
            {selectedPatient.name}
          </div>
          <div style={{ display: 'flex', gap: '8px', fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            <span>{selectedPatient.identifier}</span>
            <span>•</span>
            <span>{selectedPatient.age} yrs ({selectedPatient.sex})</span>
          </div>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="nav-menu">
        <div
          className={`nav-item ${activeView === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveView('dashboard')}
        >
          <Activity size={18} />
          <span>Dashboard</span>
        </div>

        <div
          className={`nav-item ${activeView === 'patients' || activeView === 'patient-profile' ? 'active' : ''}`}
          onClick={() => setActiveView('patients')}
        >
          <Users size={18} />
          <span>Patient Registry</span>
        </div>

        <div
          className={`nav-item ${activeView === 'upload' ? 'active' : ''}`}
          onClick={() => setActiveView('upload')}
        >
          <FileText size={18} />
          <span>Upload Lab Report</span>
        </div>

        <div
          className={`nav-item ${activeView === 'review' ? 'active' : ''}`}
          onClick={() => setActiveView('review')}
        >
          <ShieldCheck size={18} />
          <span>Structured Review</span>
          {pendingCount > 0 && <span className="nav-badge alert">{pendingCount}</span>}
        </div>

        <div
          className={`nav-item ${activeView === 'summary' ? 'active' : ''}`}
          onClick={() => setActiveView('summary')}
        >
          <Sparkles size={18} />
          <span>AI Clinical Summary</span>
        </div>

        <div
          className={`nav-item ${activeView === 'compare' ? 'active' : ''}`}
          onClick={() => setActiveView('compare')}
        >
          <GitCompare size={18} />
          <span>Report Comparison</span>
        </div>

        <div
          className={`nav-item ${activeView === 'timeline' ? 'active' : ''}`}
          onClick={() => setActiveView('timeline')}
        >
          <Clock size={18} />
          <span>Patient Timeline</span>
        </div>
      </nav>

      {/* Safety Compliance Footer */}
      <div style={{
        padding: '16px',
        borderTop: '1px solid var(--border-color)',
        fontSize: '0.7rem',
        color: 'var(--text-muted)',
        background: 'var(--bg-sidebar)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary)', fontWeight: '600', marginBottom: '4px' }}>
          <ShieldCheck size={14} />
          <span>Clinical Intelligence Engine</span>
        </div>
        <div>Reference bounds strictly from report. Deterministic evaluation active.</div>
      </div>
    </aside>
  );
}
