import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ShieldCheck,
  FileText,
  HelpCircle,
  AlertTriangle,
  CheckCircle2,
  Edit2,
  Save,
  Check,
  Printer,
  ChevronRight,
  BookOpen
} from 'lucide-react';
import { StatusBadge } from '../components/BadgesAndMeters.jsx';
import { api } from '../api.js';

export function AISummaryView({
  reportId,
  onNavigateToReview,
  onOpenCompare
}) {
  const [report, setReport] = useState(null);
  const [patient, setPatient] = useState(null);
  const [summary, setSummary] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [customText, setCustomText] = useState('');
  const [error, setError] = useState('');
  const [savedMsg, setSavedMsg] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const repData = await api.getReport(reportId);
      setReport(repData.report);
      setPatient(repData.patient);
      setResults(repData.results || []);
      setSummary(repData.summary);
      if (repData.summary) {
        setCustomText(repData.summary.summary_text);
      }
    } catch (err) {
      setError(err.message || 'Failed to load summary');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (reportId) {
      loadData();
    }
  }, [reportId]);

  const handleRegenerate = async () => {
    try {
      setRegenerating(true);
      const res = await api.generateSummary(reportId);
      setSummary(res.summary);
      setCustomText(res.summary.summary_text);
      setSavedMsg('Summary regenerated from latest verified test values.');
      setTimeout(() => setSavedMsg(''), 4000);
    } catch (err) {
      alert(err.message || 'Failed to generate summary');
    } finally {
      setRegenerating(false);
    }
  };

  const handleSaveCustomSummary = async () => {
    if (!summary?.id) return;
    try {
      await api.updateSummary(summary.id, customText);
      setSummary({ ...summary, summary_text: customText });
      setIsEditing(false);
      setSavedMsg('Clinical summary saved to permanent patient record.');
      setTimeout(() => setSavedMsg(''), 4000);
    } catch (err) {
      alert(err.message || 'Failed to save edits');
    }
  };

  if (loading) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
        <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--primary)' }}>
          Generating Clinical Intelligence Summary...
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '48px', color: 'var(--status-high)' }}>
        <h3>Summary Unavailable</h3>
        <p>{error || 'Report data not found'}</p>
      </div>
    );
  }

  const outOfRangeResults = results.filter(r => r.status === 'HIGH' || r.status === 'LOW');
  const normalResults = results.filter(r => r.status === 'NORMAL');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Top Banner */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.12) 0%, rgba(2, 132, 199, 0.12) 100%)',
        border: '1px solid rgba(168, 85, 247, 0.3)',
        padding: '24px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', padding: '3px 9px', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: '700', marginBottom: '8px' }}>
              <Sparkles size={14} /> PATIENT-FRIENDLY CLINICAL SUMMARY
            </div>
            <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)' }}>{report.title}</h2>
            <div style={{ display: 'flex', gap: '12px', fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              <span><strong>Patient:</strong> {patient?.name}</span>
              <span>•</span>
              <span><strong>MRN:</strong> {patient?.identifier}</span>
              <span>•</span>
              <span><strong>Specimen Date:</strong> {report.report_date}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigateToReview(report.id)}>
              <FileText size={14} /> View Source Review
            </button>
            <button className="btn btn-primary btn-sm" onClick={handleRegenerate} disabled={regenerating}>
              <Sparkles size={14} /> {regenerating ? 'Regenerating...' : 'Regenerate Summary'}
            </button>
            <button className="btn btn-outline btn-sm" onClick={() => window.print()}>
              <Printer size={14} /> Print Summary
            </button>
          </div>
        </div>
      </div>

      {savedMsg && (
        <div style={{ padding: '10px 16px', background: 'var(--status-normal-bg)', color: 'var(--status-normal)', border: '1px solid var(--status-normal-border)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Check size={16} />
          <span>{savedMsg}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        <div className="card" style={{ textAlign: 'center', padding: '16px' }}>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600' }}>Total Evaluated Tests</div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-primary)', marginTop: '4px' }}>
            {results.length}
          </div>
        </div>

        <div className="card" style={{ textAlign: 'center', padding: '16px' }}>
          <div style={{ fontSize: '0.76rem', color: 'var(--status-normal)', textTransform: 'uppercase', fontWeight: '600' }}>Within Report Limits</div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--status-normal)', marginTop: '4px' }}>
            {normalResults.length}
          </div>
        </div>

        <div className="card" style={{ textAlign: 'center', padding: '16px' }}>
          <div style={{ fontSize: '0.76rem', color: outOfRangeResults.length > 0 ? 'var(--status-high)' : 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>Outside Report Limits</div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: outOfRangeResults.length > 0 ? 'var(--status-high)' : 'var(--text-primary)', marginTop: '4px' }}>
            {outOfRangeResults.length}
          </div>
        </div>
      </div>

      {/* Narrative Clinical Summary Card */}
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div className="card-title" style={{ fontSize: '1.1rem' }}>
            <Sparkles size={18} color="var(--primary)" /> Clinical Summary Narrative
          </div>
          {!isEditing ? (
            <button className="btn btn-outline btn-sm" onClick={() => setIsEditing(true)}>
              <Edit2 size={13} /> Edit Narrative
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-primary btn-sm" onClick={handleSaveCustomSummary}>
                <Save size={13} /> Save Narrative
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => setIsEditing(false)}>
                Cancel
              </button>
            </div>
          )}
        </div>

        {isEditing ? (
          <textarea
            className="form-textarea"
            rows={5}
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            style={{ fontSize: '0.92rem', lineHeight: '1.6' }}
          />
        ) : (
          <div style={{ fontSize: '0.94rem', lineHeight: '1.65', color: 'var(--text-primary)', background: 'var(--bg-input)', padding: '18px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            {summary?.summary_text || customText || 'No summary text generated.'}
          </div>
        )}
      </div>

      {/* Out of Range vs Normal Parameters Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Out of Range Parameters */}
        <div className="card">
          <div className="card-title" style={{ fontSize: '1rem', color: outOfRangeResults.length > 0 ? 'var(--status-high)' : 'var(--status-normal)', marginBottom: '12px' }}>
            <AlertTriangle size={18} /> Parameters Outside Lab Reference Bounds ({outOfRangeResults.length})
          </div>

          {outOfRangeResults.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {outOfRangeResults.map((r, i) => (
                <div key={i} style={{ padding: '12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--status-high-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '700', fontSize: '0.88rem' }}>{r.test_name}</span>
                    <StatusBadge status={r.status} />
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Measured: <strong>{r.value_raw} {r.unit}</strong> (Report Reference Range: {r.ref_range_raw})
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--status-normal)', fontSize: '0.85rem' }}>
              ✓ All tested parameters are within printed lab reference limits.
            </div>
          )}
        </div>

        {/* Suggested Questions for Healthcare Provider */}
        <div className="card">
          <div className="card-title" style={{ fontSize: '1rem', color: 'var(--accent-cyan)', marginBottom: '12px' }}>
            <HelpCircle size={18} /> Suggested Questions for Your Doctor
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {(summary?.questions_for_doctor || [
              'How do these results compare with my previous baselines?',
              'Are any repeat or confirmatory lab panels indicated?',
              'Could medication timing or fasting duration have influenced these numbers?'
            ]).map((q, i) => (
              <div key={i} style={{ padding: '10px 12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontSize: '0.84rem', color: 'var(--text-primary)', display: 'flex', gap: '8px' }}>
                <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Q{i+1}:</span>
                <span>{q}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mandatory Safety Guardrail Box */}
      <div style={{
        padding: '16px 20px',
        background: 'var(--bg-sidebar)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-color)',
        fontSize: '0.78rem',
        color: 'var(--text-muted)',
        lineHeight: '1.5'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary)', fontWeight: '700', marginBottom: '4px' }}>
          <ShieldCheck size={16} /> MedLens Clinical Intelligence Safety Notice
        </div>
        <div>
          This summary organizes and explains diagnostic lab values based strictly on reference ranges printed in the source document. MedLens does not diagnose diseases, recommend medical treatments, or alter medication regimens. Always consult your licensed physician for medical advice and clinical interpretation.
        </div>
      </div>
    </div>
  );
}

export function ReportCompareView({
  patient,
  reports = [],
  onNavigateToReview
}) {
  const [report1Id, setReport1Id] = useState(reports[0]?.id || '');
  const [report2Id, setReport2Id] = useState(reports[1]?.id || (reports[0]?.id || ''));
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadComparison = async () => {
    if (!patient?.id || !report1Id || !report2Id) return;
    try {
      setLoading(true);
      setError('');
      const data = await api.compareReports(patient.id, report1Id, report2Id);
      setComparisonData(data);
    } catch (err) {
      setError(err.message || 'Failed to compute report comparison');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (patient?.id && reports.length >= 2) {
      if (!report1Id && reports[0]) setReport1Id(reports[0].id);
      if (!report2Id && reports[1]) setReport2Id(reports[1].id);
      loadComparison();
    }
  }, [patient?.id, reports]);

  if (reports.length < 2) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
        <h3>Insufficient Reports for Comparison</h3>
        <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>
          Longitudinal comparison requires at least 2 diagnostic reports for the selected patient. Upload an additional report to compare progress.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.45rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={24} color="var(--primary)" /> Longitudinal Report Comparison Tool
        </h2>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Track diagnostic lab value trajectories across previous and current panels for {patient?.name}.
        </div>
      </div>

      {/* Selectors Bar */}
      <div className="card" style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '16px', alignItems: 'flex-end' }}>
        <div>
          <label className="form-label">Report A (Previous Baseline)</label>
          <select className="form-select" value={report1Id} onChange={(e) => setReport1Id(e.target.value)}>
            {reports.map(r => (
              <option key={r.id} value={r.id}>
                {r.title} ({r.report_date})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="form-label">Report B (Current / Follow-up)</label>
          <select className="form-select" value={report2Id} onChange={(e) => setReport2Id(e.target.value)}>
            {reports.map(r => (
              <option key={r.id} value={r.id}>
                {r.title} ({r.report_date})
              </option>
            ))}
          </select>
        </div>

        <button className="btn btn-primary" onClick={loadComparison} disabled={loading}>
          Compare Now
        </button>
      </div>

      {loading && (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ color: 'var(--primary)', fontWeight: '700' }}>Evaluating Longitudinal Deltas...</div>
        </div>
      )}

      {error && (
        <div style={{ padding: '12px 16px', background: 'var(--status-high-bg)', color: 'var(--status-high)', borderRadius: 'var(--radius-md)' }}>
          {error}
        </div>
      )}

      {/* Comparison Results */}
      {comparisonData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Summary Metric Chips */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
            <div className="card" style={{ textAlign: 'center', padding: '14px' }}>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>TOTAL COMPARED</div>
              <div style={{ fontSize: '1.6rem', fontWeight: '800' }}>{comparisonData.summary?.totalCompared || 0}</div>
            </div>
            <div className="card" style={{ textAlign: 'center', padding: '14px' }}>
              <div style={{ fontSize: '0.74rem', color: 'var(--status-high)' }}>INCREASED VALUES</div>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--status-high)' }}>{comparisonData.summary?.increasedCount || 0}</div>
            </div>
            <div className="card" style={{ textAlign: 'center', padding: '14px' }}>
              <div style={{ fontSize: '0.74rem', color: 'var(--status-normal)' }}>DECREASED VALUES</div>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--status-normal)' }}>{comparisonData.summary?.decreasedCount || 0}</div>
            </div>
            <div className="card" style={{ textAlign: 'center', padding: '14px' }}>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>UNCHANGED</div>
              <div style={{ fontSize: '1.6rem', fontWeight: '800' }}>{comparisonData.summary?.unchangedCount || 0}</div>
            </div>
          </div>

          {/* Side-by-Side Comparison Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-container" style={{ border: 'none' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: '25%' }}>Test Parameter</th>
                    <th style={{ width: '22%' }}>Previous: {comparisonData.previousReport?.report_date}</th>
                    <th style={{ width: '22%' }}>Current: {comparisonData.currentReport?.report_date}</th>
                    <th style={{ width: '16%' }}>Trajectory</th>
                    <th style={{ width: '15%' }}>Delta Value</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonData.comparisons.map((c, i) => (
                    <tr key={i}>
                      {/* Test Name */}
                      <td>
                        <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{c.test_name}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{c.category}</div>
                      </td>

                      {/* Previous Value & Status */}
                      <td>
                        {c.previous ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>{c.previous.value_raw} {c.unit}</span>
                            <StatusBadge status={c.previous.status} />
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Not in report</span>
                        )}
                      </td>

                      {/* Current Value & Status */}
                      <td>
                        {c.current ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>{c.current.value_raw} {c.unit}</span>
                            <StatusBadge status={c.current.status} />
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Not in report</span>
                        )}
                      </td>

                      {/* Trajectory Trend */}
                      <td>
                        {c.change.trend === 'Increased' ? (
                          <span className="badge badge-high" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            ▲ Increased
                          </span>
                        ) : c.change.trend === 'Decreased' ? (
                          <span className="badge badge-normal" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            ▼ Decreased
                          </span>
                        ) : c.change.trend === 'New Test Parameter' ? (
                          <span className="badge badge-neutral">✦ New Test</span>
                        ) : (
                          <span className="badge badge-neutral">▬ Unchanged</span>
                        )}
                      </td>

                      {/* Delta Numeric */}
                      <td>
                        {c.change.deltaNumeric !== null ? (
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', fontWeight: '600' }}>
                            {c.change.deltaNumeric > 0 ? `+${c.change.deltaNumeric}` : c.change.deltaNumeric} {c.unit}
                            {c.change.percentChange !== null && (
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '4px' }}>
                                ({c.change.percentChange > 0 ? `+${c.change.percentChange}` : c.change.percentChange}%)
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
