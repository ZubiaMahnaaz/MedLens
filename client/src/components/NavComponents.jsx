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
  ChevronDown,
  Menu,
  X
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
  pendingReviewCount = 0,
  isMobileMenuOpen,
  setIsMobileMenuOpen
}) {
  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  return (
    <header className="top-navbar">
      {/* Left side: Hamburger Toggle & Search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
        {/* Mobile Hamburger Menu Button */}
        <button
          className="mobile-menu-btn"
          onClick={() => setIsMobileMenuOpen && setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle navigation menu"
          title="Open Menu"
        >
          <Menu size={20} />
        </button>

        {/* Mobile Brand (visible on small screens) */}
        <div className="navbar-mobile-brand">
          <div className="brand-icon" style={{ width: '28px', height: '28px' }}>
            <Activity size={16} strokeWidth={2.5} />
          </div>
          <span className="brand-title" style={{ fontSize: '1rem' }}>MedLens</span>
        </div>

        {/* Search Input Container */}
        <div className="nav-search-container" style={{ position: 'relative', width: '100%', maxWidth: '380px' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '34px', height: '36px', fontSize: '0.84rem' }}
            placeholder="Search patients, tests, MRN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Right side controls */}
      <div className="nav-controls-group" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        {/* Active Patient Quick Switcher */}
        <div className="nav-patient-switcher" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-input)', padding: '4px 8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', maxWidth: '200px' }}>
          <span className="nav-patient-label" style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Patient:</span>
          <select
            className="form-select"
            style={{ border: 'none', background: 'transparent', padding: '2px 4px', fontSize: '0.82rem', fontWeight: '600', color: 'var(--primary)', cursor: 'pointer', maxWidth: '140px', textOverflow: 'ellipsis' }}
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
          style={{ width: '34px', height: '34px', padding: '0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {theme === 'dark' ? <Sun size={16} color="#fbbf24" /> : <Moon size={16} color="#38bdf8" />}
        </button>

        {/* Clinician Profile Selector */}
        <div className="nav-clinician-badge" style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '8px', borderLeft: '1px solid var(--border-color)' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #00d2b4, #0284c7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '700',
            fontSize: '0.8rem',
            color: '#090e1a',
            flexShrink: 0
          }}>
            {activeUser?.avatar_initials || 'MD'}
          </div>
          <div className="clinician-info-text" style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
              {activeUser?.full_name || 'Dr. Sarah Chen, MD'}
            </span>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
              {activeUser?.role || 'Clinical Specialist'}
            </span>
          </div>
          {allUsers.length > 1 && (
            <select
              style={{
                marginLeft: '2px',
                padding: '2px',
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
  hasActiveReport = false,
  isMobileMenuOpen = false,
  setIsMobileMenuOpen
}) {
  const handleNavClick = (view) => {
    setActiveView(view);
    if (setIsMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      <div
        className={`sidebar-backdrop ${isMobileMenuOpen ? 'open' : ''}`}
        onClick={() => setIsMobileMenuOpen && setIsMobileMenuOpen(false)}
        aria-hidden="true"
      />

      <aside className={`sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        {/* Brand Header */}
        <div className="brand-box">
          <div className="brand-icon">
            <Activity size={22} strokeWidth={2.5} />
          </div>
          <div>
            <div className="brand-title">MedLens</div>
            <div className="brand-sub">Clinical Intelligence</div>
          </div>
          {/* Mobile Drawer Close Button */}
          <button
            className="sidebar-close-btn"
            onClick={() => setIsMobileMenuOpen && setIsMobileMenuOpen(false)}
            aria-label="Close sidebar navigation"
          >
            <X size={20} />
          </button>
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
            <div style={{ display: 'flex', gap: '8px', fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '4px', flexWrap: 'wrap' }}>
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
            onClick={() => handleNavClick('dashboard')}
          >
            <Activity size={18} />
            <span>Dashboard</span>
          </div>

          <div
            className={`nav-item ${activeView === 'patients' || activeView === 'patient-profile' ? 'active' : ''}`}
            onClick={() => handleNavClick('patients')}
          >
            <Users size={18} />
            <span>Patient Registry</span>
          </div>

          <div
            className={`nav-item ${activeView === 'upload' ? 'active' : ''}`}
            onClick={() => handleNavClick('upload')}
          >
            <FileText size={18} />
            <span>Upload Lab Report</span>
          </div>

          <div
            className={`nav-item ${activeView === 'review' ? 'active' : ''}`}
            onClick={() => handleNavClick('review')}
          >
            <ShieldCheck size={18} />
            <span>Structured Review</span>
            {pendingCount > 0 && <span className="nav-badge alert">{pendingCount}</span>}
          </div>

          <div
            className={`nav-item ${activeView === 'summary' ? 'active' : ''}`}
            onClick={() => handleNavClick('summary')}
          >
            <Sparkles size={18} />
            <span>AI Clinical Summary</span>
          </div>

          <div
            className={`nav-item ${activeView === 'compare' ? 'active' : ''}`}
            onClick={() => handleNavClick('compare')}
          >
            <GitCompare size={18} />
            <span>Report Comparison</span>
          </div>

          <div
            className={`nav-item ${activeView === 'timeline' ? 'active' : ''}`}
            onClick={() => handleNavClick('timeline')}
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
          background: 'var(--bg-sidebar)',
          marginTop: 'auto'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary)', fontWeight: '600', marginBottom: '4px' }}>
            <ShieldCheck size={14} />
            <span>Clinical Intelligence Engine</span>
          </div>
          <div>Reference bounds strictly from report. Deterministic evaluation active.</div>
        </div>
      </aside>
    </>
  );
}

