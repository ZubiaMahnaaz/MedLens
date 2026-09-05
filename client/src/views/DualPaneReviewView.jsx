import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  Edit2,
  Trash2,
  Plus,
  AlertTriangle,
  Sparkles,
  FileText,
  FileCode,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Save,
  X,
  Info,
  ChevronRight,
  ArrowRight,
  Eye,
  Check,
  AlertCircle
} from 'lucide-react';
import { StatusBadge, ProvenanceBadge, RangeIndicatorBar } from '../components/BadgesAndMeters.jsx';
import { api } from '../api.js';

export function DualPaneReviewView({
  reportId,
  onNavigateToSummary,
  onResolveConflict
}) {
  const [report, setReport] = useState(null);
  const [patient, setPatient] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Left Pane viewer state
  const [viewMode, setViewMode] = useState('formatted'); // 'formatted' | 'raw_text'
  const [zoomLevel, setZoomLevel] = useState(100);

  // Edit row state
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    test_name: '',
    value_raw: '',
    unit: '',
    ref_range_raw: '',
    category: ''
  });

  // Add missed row state
  const [isAddingRow, setIsAddingRow] = useState(false);
  const [newRow, setNewRow] = useState({
    test_name: '',
    category: 'General Diagnostic',
    value_raw: '',
    unit: 'mg/dL',
    ref_range_raw: ''
  });

  // Action states
  const [verifyingAll, setVerifyingAll] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const loadReportData = async () => {
    try {
      setLoading(true);
      const data = await api.getReport(reportId);
      setReport(data.report);
      setPatient(data.patient);
      setResults(data.results || []);
    } catch (err) {
      setError(err.message || 'Failed to load report details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (reportId) {
      loadReportData();
    }
  }, [reportId]);

  // Start editing a result
  const handleStartEdit = (res) => {
    setEditingId(res.id);
    setEditForm({
      test_name: res.test_name,
      value_raw: res.value_raw,
      unit: res.unit,
      ref_range_raw: res.ref_range_raw,
      category: res.category
    });
  };

  // Save edited result
  const handleSaveEdit = async (id) => {
    try {
      const res = await api.updateResult(id, editForm);
      setResults(results.map(r => r.id === id ? res.result : r));
      setEditingId(null);
      setSuccessMsg(`Updated "${res.result.test_name}" and re-evaluated reference bounds.`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      alert(err.message || 'Failed to update result');
    }
  };

  // Delete result
  const handleDeleteResult = async (id, testName) => {
    if (!window.confirm(`Are you sure you want to remove "${testName}" from the structured record?`)) return;
    try {
      await api.deleteResult(id);
      setResults(results.filter(r => r.id !== id));
      setSuccessMsg(`Removed "${testName}" from structured record.`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      alert(err.message || 'Failed to delete result');
    }
  };

  // Add missed result
  const handleSaveNewResult = async () => {
    if (!newRow.test_name.trim() || !newRow.value_raw.trim()) {
      alert('Test Name and Measured Value are required.');
      return;
    }
    try {
      const res = await api.addResult(reportId, newRow);
      setResults([...results, res.result]);
      setIsAddingRow(false);
      setNewRow({ test_name: '', category: 'General Diagnostic', value_raw: '', unit: 'mg/dL', ref_range_raw: '' });
      setSuccessMsg(`Added parameter "${res.result.test_name}" to structured record.`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      alert(err.message || 'Failed to add result');
    }
  };

  // Batch verify all
  const handleVerifyAll = async () => {
    try {
      setVerifyingAll(true);
      const res = await api.verifyAllResults(reportId);
      setResults(res.results);
      setReport({ ...report, status: 'VERIFIED' });
      setSuccessMsg('All parameters verified and locked in clinical database!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      alert(err.message || 'Verification failed');
    } finally {
      setVerifyingAll(false);
    }
  };

  if (loading) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
        <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--primary)' }}>
          Loading Structured Clinical Review...
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '48px', color: 'var(--status-high)' }}>
        <h3>Error Loading Report</h3>
        <p>{error || 'Report not found'}</p>
      </div>
    );
  }

  const conflicts = report.conflicts || [];
  const unverifiedCount = results.filter(r => !r.is_verified).length;
  const abnormalCount = results.filter(r => r.status === 'HIGH' || r.status === 'LOW').length;
  const missingRangeCount = results.filter(r => r.ref_range_raw === 'Not available' || !r.ref_range_raw).length;
  const isSampleReport = results.some(r => r.provenance === 'SAMPLE_DATA');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: 'calc(100vh - 120px)' }}>
      {/* Top Action Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--bg-sidebar)',
        padding: '12px 20px',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-color)',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>{report.title}</h2>
              {isSampleReport && (
                <span className="prov-tag prov-sample">🧪 Sample / Demo Panel</span>
              )}
              {report.status === 'VERIFIED' ? (
                <span className="badge badge-normal">✓ Verified Record</span>
              ) : report.status === 'NEEDS_REVIEW' ? (
                <span className="badge badge-high">⚠️ Needs Review</span>
              ) : (
                <span className="badge badge-low">Pending Human Verification</span>
              )}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', gap: '12px', marginTop: '2px' }}>
              <span><strong>Patient:</strong> {patient?.name} ({patient?.identifier})</span>
              <span>•</span>
              <span><strong>Facility:</strong> {report.lab_name}</span>
              <span>•</span>
              <span><strong>Report Date:</strong> {report.report_date}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => setIsAddingRow(true)}
          >
            <Plus size={14} /> Add Missed Result
          </button>

          <button
            className="btn btn-success btn-sm"
            onClick={handleVerifyAll}
            disabled={verifyingAll || report.status === 'VERIFIED'}
          >
            <ShieldCheck size={16} />
            {report.status === 'VERIFIED' ? 'Record Verified' : `Verify All (${unverifiedCount})`}
          </button>

          <button
            className="btn btn-primary btn-sm"
            onClick={() => onNavigateToSummary(report.id)}
          >
            <Sparkles size={16} /> AI Summary <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {successMsg && (
        <div style={{ padding: '10px 16px', background: 'var(--status-normal-bg)', color: 'var(--status-normal)', border: '1px solid var(--status-normal-border)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <Check size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Extraction Completeness / Uncertainty Status Bar */}
      {results.length === 0 ? (
        <div style={{ padding: '10px 16px', background: 'var(--status-high-bg)', color: 'var(--status-high)', border: '1px solid var(--status-high-border)', borderRadius: 'var(--radius-md)', fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <AlertCircle size={16} />
          <span><strong>Extraction Incomplete:</strong> No detectable laboratory parameters found in document text. Inspect raw OCR text on the left or add parameters manually.</span>
        </div>
      ) : missingRangeCount > 0 ? (
        <div style={{ padding: '8px 16px', background: 'var(--status-low-bg)', color: 'var(--status-low)', border: '1px solid var(--status-low-border)', borderRadius: 'var(--radius-md)', fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Info size={15} />
            <span><strong>Partial Extraction Notice:</strong> {results.length} parameters extracted. {missingRangeCount} parameter(s) have unstated reference intervals in source document.</span>
          </div>
          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Never assumes reference intervals</span>
        </div>
      ) : (
        <div style={{ padding: '6px 14px', background: 'rgba(16, 185, 129, 0.08)', color: 'var(--status-normal)', border: '1px solid var(--status-normal-border)', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <CheckCircle2 size={14} />
          <span><strong>Complete Extraction:</strong> All {results.length} detectable clinical parameters extracted with printed report reference intervals.</span>
        </div>
      )}

      {/* Conflict Alert Banner (if any discrepancies detected) */}
      {conflicts.length > 0 && (
        <div style={{
          padding: '12px 18px',
          background: 'var(--status-high-bg)',
          border: '1px solid var(--status-high-border)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle size={20} color="var(--status-high)" />
            <div>
              <div style={{ fontWeight: '700', fontSize: '0.88rem', color: 'var(--status-high)' }}>
                {conflicts[0].title}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#ffe4e6' }}>
                {conflicts[0].description}
              </div>
            </div>
          </div>
          <button
            className="btn btn-danger btn-sm"
            onClick={() => onResolveConflict(report.id, conflicts[0])}
          >
            Resolve Conflict
          </button>
        </div>
      )}

      {/* Dual Pane Main Area */}
      <div style={{ display: 'grid', gridTemplateColumns: '42% 58%', gap: '16px', flex: 1, minHeight: 0 }}>
        {/* LEFT PANE: Original Source Report Document Viewer */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: '0', overflow: 'hidden' }}>
          {/* Document Header Controls */}
          <div style={{
            padding: '10px 16px',
            background: 'var(--bg-sidebar)',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className={`btn btn-sm ${viewMode === 'formatted' ? 'btn-secondary' : 'btn-outline'}`}
                style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                onClick={() => setViewMode('formatted')}
              >
                <FileText size={13} /> Source Document
              </button>
              <button
                className={`btn btn-sm ${viewMode === 'raw_text' ? 'btn-secondary' : 'btn-outline'}`}
                style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                onClick={() => setViewMode('raw_text')}
              >
                <FileCode size={13} /> Raw OCR Text
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                className="btn btn-outline btn-icon-only btn-sm"
                onClick={() => setZoomLevel(Math.max(60, zoomLevel - 15))}
                title="Zoom Out"
              >
                <ZoomOut size={13} />
              </button>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', minWidth: '38px', textAlign: 'center' }}>
                {zoomLevel}%
              </span>
              <button
                className="btn btn-outline btn-icon-only btn-sm"
                onClick={() => setZoomLevel(Math.min(150, zoomLevel + 15))}
                title="Zoom In"
              >
                <ZoomIn size={13} />
              </button>
            </div>
          </div>

          {/* Document Body Viewer */}
          <div style={{ flex: 1, overflow: 'auto', background: '#0b1120', padding: '16px', display: 'flex', justifyContent: 'center' }}>
            {viewMode === 'formatted' ? (
              <div style={{
                width: '100%',
                maxWidth: '650px',
                transform: `scale(${zoomLevel / 100})`,
                transformOrigin: 'top center',
                transition: 'transform 0.15s ease-out'
              }}>
                {report.file_path && report.file_path.endsWith('.html') ? (
                  <iframe
                    src={`/${report.file_path}`}
                    style={{ width: '100%', height: '620px', border: 'none', background: '#ffffff', borderRadius: 'var(--radius-md)', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
                    title="Source Lab Report Document"
                  />
                ) : (
                  <div style={{ background: '#ffffff', color: '#1e293b', padding: '24px', borderRadius: 'var(--radius-md)', fontFamily: 'monospace', fontSize: '12px', whiteSpace: 'pre-wrap', lineHeight: '1.6', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
                    <div style={{ borderBottom: '2px solid #0284c7', paddingBottom: '8px', marginBottom: '12px', fontWeight: 'bold', color: '#0369a1', fontSize: '14px' }}>
                      {report.lab_name || 'CLINICAL DIAGNOSTIC LABORATORY'}
                    </div>
                    {report.raw_text || 'No raw document text available.'}
                  </div>
                )}
              </div>
            ) : (
              <pre style={{ width: '100%', color: 'var(--primary)', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', whiteSpace: 'pre-wrap', lineHeight: '1.5', margin: 0 }}>
                {report.raw_text || 'No text extracted.'}
              </pre>
            )}
          </div>
        </div>

        {/* RIGHT PANE: Structured Editable Review Table */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
          {/* Table Stats Bar */}
          <div style={{
            padding: '10px 16px',
            background: 'var(--bg-sidebar)',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-primary)' }}>
              Extracted Parameters ({results.length})
            </div>
            <div style={{ display: 'flex', gap: '8px', fontSize: '0.74rem' }}>
              <span style={{ color: 'var(--status-normal)', fontWeight: '600' }}>
                {results.filter(r => r.status === 'NORMAL').length} Normal
              </span>
              <span>•</span>
              <span style={{ color: 'var(--status-high)', fontWeight: '600' }}>
                {abnormalCount} Outside Range
              </span>
            </div>
          </div>

          {/* Table Content */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <table className="table" style={{ fontSize: '0.82rem' }}>
              <thead>
                <tr>
                  <th style={{ width: '28%' }}>Parameter</th>
                  <th style={{ width: '14%' }}>Result</th>
                  <th style={{ width: '10%' }}>Units</th>
                  <th style={{ width: '16%' }}>Report Range</th>
                  <th style={{ width: '14%' }}>Evaluation</th>
                  <th style={{ width: '10%' }}>Provenance</th>
                  <th style={{ width: '8%' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {results.map((res) => {
                  const isEditing = editingId === res.id;

                  return (
                    <tr
                      key={res.id}
                      style={{
                        background: isEditing ? 'var(--bg-card-hover)' : undefined
                      }}
                    >
                      {/* Test Name & Category */}
                      <td>
                        {isEditing ? (
                          <input
                            type="text"
                            className="form-input"
                            style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                            value={editForm.test_name}
                            onChange={(e) => setEditForm({ ...editForm, test_name: e.target.value })}
                          />
                        ) : (
                          <div>
                            <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{res.test_name}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{res.category}</div>
                          </div>
                        )}
                      </td>

                      {/* Measured Value */}
                      <td>
                        {isEditing ? (
                          <input
                            type="text"
                            className="form-input"
                            style={{ padding: '4px 8px', fontSize: '0.8rem', fontWeight: 'bold' }}
                            value={editForm.value_raw}
                            onChange={(e) => setEditForm({ ...editForm, value_raw: e.target.value })}
                          />
                        ) : (
                          <div style={{ fontWeight: '700', fontSize: '0.9rem', color: res.status === 'HIGH' ? 'var(--status-high)' : res.status === 'LOW' ? 'var(--status-low)' : 'var(--text-primary)' }}>
                            {res.value_raw}
                          </div>
                        )}
                      </td>

                      {/* Unit */}
                      <td>
                        {isEditing ? (
                          <input
                            type="text"
                            className="form-input"
                            style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                            value={editForm.unit}
                            onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                          />
                        ) : (
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>{res.unit}</span>
                        )}
                      </td>

                      {/* Reference Range Printed on Report Only */}
                      <td>
                        {isEditing ? (
                          <input
                            type="text"
                            className="form-input"
                            style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                            value={editForm.ref_range_raw}
                            onChange={(e) => setEditForm({ ...editForm, ref_range_raw: e.target.value })}
                          />
                        ) : (
                          <div>
                            <div style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>{res.ref_range_raw}</div>
                            <RangeIndicatorBar
                              value={res.value_numeric}
                              min={res.ref_min}
                              max={res.ref_max}
                              status={res.status}
                            />
                          </div>
                        )}
                      </td>

                      {/* Deterministic Status Badge */}
                      <td>
                        <div title={res.evaluation_reason}>
                          <StatusBadge status={res.status} />
                        </div>
                      </td>

                      {/* Provenance Tag */}
                      <td>
                        <ProvenanceBadge provenance={res.provenance} isVerified={res.is_verified === 1} />
                      </td>

                      {/* Action Buttons */}
                      <td>
                        {isEditing ? (
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                              className="btn btn-primary btn-sm btn-icon-only"
                              onClick={() => handleSaveEdit(res.id)}
                              title="Save Changes"
                            >
                              <Check size={13} />
                            </button>
                            <button
                              className="btn btn-outline btn-sm btn-icon-only"
                              onClick={() => setEditingId(null)}
                              title="Cancel"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                              className="btn btn-outline btn-sm btn-icon-only"
                              onClick={() => handleStartEdit(res)}
                              title="Edit Result"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              className="btn btn-outline btn-sm btn-icon-only"
                              onClick={() => handleDeleteResult(res.id, res.test_name)}
                              title="Delete Result"
                            >
                              <Trash2 size={13} color="var(--status-high)" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {/* Add New Row Form inline if active */}
                {isAddingRow && (
                  <tr style={{ background: 'var(--primary-subtle)', borderTop: '2px solid var(--primary)' }}>
                    <td>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Test Name (e.g. Calcium)"
                        style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                        value={newRow.test_name}
                        onChange={(e) => setNewRow({ ...newRow, test_name: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Value (e.g. 9.4)"
                        style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                        value={newRow.value_raw}
                        onChange={(e) => setNewRow({ ...newRow, value_raw: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Unit (mg/dL)"
                        style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                        value={newRow.unit}
                        onChange={(e) => setNewRow({ ...newRow, unit: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Range (e.g. 8.5 - 10.2)"
                        style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                        value={newRow.ref_range_raw}
                        onChange={(e) => setNewRow({ ...newRow, ref_range_raw: e.target.value })}
                      />
                    </td>
                    <td>
                      <span className="badge badge-neutral">Pending Eval</span>
                    </td>
                    <td>
                      <span className="prov-tag prov-user">User Added</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button className="btn btn-primary btn-sm btn-icon-only" onClick={handleSaveNewResult}>
                          <Check size={13} />
                        </button>
                        <button className="btn btn-outline btn-sm btn-icon-only" onClick={() => setIsAddingRow(false)}>
                          <X size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
