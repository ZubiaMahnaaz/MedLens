import React, { useState, useEffect } from 'react';
import {
  Upload,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
  ArrowRight,
  ShieldCheck,
  Zap,
  Info,
  Check,
  FileCode
} from 'lucide-react';
import { api } from '../api.js';

export function UploadReportView({
  patients = [],
  selectedPatientId,
  onSelectPatient,
  onUploadSuccess
}) {
  const [selectedPatient, setSelectedPatient] = useState(selectedPatientId || (patients[0]?.id || ''));
  const [file, setFile] = useState(null);
  const [selectedSample, setSelectedSample] = useState(null);
  const [samples, setSamples] = useState([]);
  const [title, setTitle] = useState('');
  const [labName, setLabName] = useState('');
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportType, setReportType] = useState('Comprehensive Metabolic Panel');
  const [rawTextPreview, setRawTextPreview] = useState('');

  const [uploading, setUploading] = useState(false);
  const [extractingStep, setExtractingStep] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    if (selectedPatientId) {
      setSelectedPatient(selectedPatientId);
    }
  }, [selectedPatientId]);

  useEffect(() => {
    api.getSamples().then(res => setSamples(res.samples || [])).catch(console.error);
  }, []);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setSelectedSample(null);
      setRawTextPreview('');
      if (!title || title === selectedSample?.title) {
        setTitle(selected.name.replace(/\.[^/.]+$/, "").replace(/_/g, " "));
      }
    }
  };

  const handleSelectSamplePreset = async (sample) => {
    setSelectedSample(sample);
    setFile(null);
    setTitle(sample.title);
    setLabName(sample.labName);
    setReportDate(sample.reportDate);
    setReportType(sample.reportType);

    try {
      const res = await api.getSampleContent(sample.id);
      setRawTextPreview(res.content);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPatient) {
      setError('Please select a target patient before uploading.');
      return;
    }
    if (!file && !selectedSample && !rawTextPreview) {
      setError('Please select a document file to upload (Option A) or choose a sample panel (Option B).');
      return;
    }

    setError('');
    setUploading(true);

    try {
      // Live Extraction pipeline progression
      setExtractingStep(1); // Ingestion & OCR parsing
      await new Promise(r => setTimeout(r, 300));
      setExtractingStep(2); // Multi-pattern parameter normalization
      await new Promise(r => setTimeout(r, 300));
      setExtractingStep(3); // Deterministic range bounds classification
      await new Promise(r => setTimeout(r, 300));
      setExtractingStep(4); // Conflict analysis & safe clinical summary

      let uploadResult;

      if (file) {
        // Option A: Uploaded File
        const formData = new FormData();
        formData.append('reportFile', file);
        formData.append('patientId', selectedPatient);
        formData.append('title', title || file.name.replace(/\.[^/.]+$/, "").replace(/_/g, " "));
        formData.append('labName', labName || 'Diagnostic Laboratory');
        formData.append('reportDate', reportDate);
        formData.append('reportType', reportType);

        uploadResult = await api.uploadReport(formData);
      } else {
        // Option B: Pre-Packaged Sample Preset
        uploadResult = await api.uploadSampleReport({
          patientId: selectedPatient,
          samplePreset: selectedSample?.id || 'metabolic',
          title: title || selectedSample?.title || 'Clinical Lab Panel',
          labName: labName || selectedSample?.labName || 'Central Health Clinical Laboratories',
          reportDate: reportDate || selectedSample?.reportDate,
          reportType: reportType || selectedSample?.reportType,
          rawTextInput: rawTextPreview
        });
      }

      onUploadSuccess(uploadResult.reportId, selectedPatient);
    } catch (err) {
      setError(err.message || 'Upload and extraction failed');
      setUploading(false);
      setExtractingStep(0);
    }
  };

  const currentPatientObj = patients.find(p => p.id === selectedPatient);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1050px', margin: '0 auto' }}>
      {/* Title */}
      <div>
        <h2 style={{ fontSize: '1.45rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Upload size={24} color="var(--primary)" /> Medical Report Ingestion & Extraction Engine
        </h2>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Ingest multi-parameter PDF or image clinical laboratory documents, or test immediately with pre-packaged diagnostic panels.
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: 'var(--status-high-bg)', color: 'var(--status-high)', border: '1px solid var(--status-high-border)', borderRadius: 'var(--radius-md)', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Main Upload Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
        {/* Left Column: Ingestion Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Target Patient Selector */}
          <div className="card">
            <label className="form-label" style={{ marginBottom: '8px' }}>
              Assign Report to Patient Dossier *
            </label>
            <select
              className="form-select"
              value={selectedPatient}
              onChange={(e) => {
                setSelectedPatient(e.target.value);
                onSelectPatient(e.target.value);
              }}
              required
            >
              <option value="">-- Choose Target Patient --</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.identifier}) — {p.age} yrs, {p.sex}
                </option>
              ))}
            </select>
            {currentPatientObj && (
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                Currently Active: <strong>{currentPatientObj.name}</strong> ({currentPatientObj.identifier})
              </div>
            )}
          </div>

          {/* Option A: Upload Source Document */}
          <div className="card" style={{
            border: file ? '2px solid var(--primary)' : '1px solid var(--border-color)',
            background: file ? 'rgba(0, 210, 180, 0.04)' : undefined
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div className="card-title" style={{ fontSize: '0.95rem', margin: 0 }}>
                Option A: Upload Source Document (PDF / JPG / PNG / TXT)
              </div>
              {file && (
                <span className="badge badge-normal" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Check size={12} /> File Selected
                </span>
              )}
            </div>

            <label
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '28px 20px',
                border: '2px dashed var(--border-color)',
                borderRadius: 'var(--radius-lg)',
                background: file ? 'var(--primary-subtle)' : 'var(--bg-input)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                textAlign: 'center'
              }}
            >
              <input
                type="file"
                style={{ display: 'none' }}
                accept=".pdf,.png,.jpg,.jpeg,.txt"
                onChange={handleFileChange}
              />
              <Upload size={32} color={file ? 'var(--primary)' : 'var(--text-muted)'} style={{ marginBottom: '10px' }} />
              <div style={{ fontSize: '0.92rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                {file ? file.name : 'Click to browse or drop file here'}
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                {file ? `${(file.size / 1024).toFixed(1)} KB • Click to choose different file` : 'Supports text & scan PDFs, images, and text outputs'}
              </div>
            </label>
          </div>

          {/* Option B: Pre-Packaged Clinical Samples */}
          <div className="card" style={{
            border: selectedSample ? '2px solid var(--primary)' : '1px solid var(--border-color)',
            background: selectedSample ? 'rgba(0, 210, 180, 0.04)' : undefined
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div className="card-title" style={{ fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                <Zap size={16} color="var(--primary)" /> Option B: Instant Pre-Packaged Sample Panels
              </div>
              {selectedSample && (
                <span className="badge badge-normal" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Check size={12} /> Sample Active
                </span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {samples.map(s => {
                const isSelected = selectedSample?.id === s.id;
                return (
                  <div
                    key={s.id}
                    style={{
                      padding: '14px',
                      borderRadius: 'var(--radius-md)',
                      border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                      background: isSelected ? 'var(--primary-subtle)' : 'var(--bg-input)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      position: 'relative'
                    }}
                    onClick={() => handleSelectSamplePreset(s)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {isSelected && <Check size={15} color="var(--primary)" />}
                        {s.title}
                      </div>
                      <span style={{ fontSize: '0.72rem', padding: '2px 8px', background: 'var(--bg-card)', borderRadius: '4px', color: 'var(--primary)', fontWeight: '700' }}>
                        {s.testCount} Tests
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      {s.description}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '6px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Suggested Dossier: <strong>{s.recommendedPatient}</strong></span>
                      <span style={{ color: 'var(--primary)', fontWeight: '600' }}>
                        {isSelected ? '✓ Selected' : 'Click to Load'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Metadata & Ingestion Action */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="card-title" style={{ fontSize: '1rem' }}>
              Extraction Metadata & Settings
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Report Panel Title</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Comprehensive Metabolic Panel"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Diagnostic Facility / Lab Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. MetroHealth Diagnostics"
                value={labName}
                onChange={(e) => setLabName(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Specimen Collection Date</label>
              <input
                type="date"
                className="form-input"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
              />
            </div>

            {/* Ingestion Action Button */}
            <button
              className="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: '12px' }}
              onClick={handleUploadSubmit}
              disabled={uploading || (!file && !selectedSample && !rawTextPreview)}
            >
              {uploading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={18} className="animate-pulse" /> Processing Pipeline...
                </span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={18} /> Ingest & Extract Report Data <ArrowRight size={16} />
                </span>
              )}
            </button>
          </div>

          {/* Extraction Pipeline Live Status (when uploading) */}
          {uploading && (
            <div className="card" style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-highlight)' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--primary)', marginBottom: '12px' }}>
                LIVE EXTRACTION PIPELINE
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.82rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: extractingStep >= 1 ? 'var(--primary)' : 'var(--text-muted)' }}>
                  <CheckCircle2 size={16} /> 1. OCR & Document Text Ingestion
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: extractingStep >= 2 ? 'var(--primary)' : 'var(--text-muted)' }}>
                  <CheckCircle2 size={16} /> 2. Multi-Pattern Medical Parameter Normalization
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: extractingStep >= 3 ? 'var(--primary)' : 'var(--text-muted)' }}>
                  <CheckCircle2 size={16} /> 3. Deterministic Reference Range Evaluation
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: extractingStep >= 4 ? 'var(--primary)' : 'var(--text-muted)' }}>
                  <CheckCircle2 size={16} /> 4. Conflict Analysis & Quality Evaluation
                </div>
              </div>
            </div>
          )}

          {/* Regulatory Guardrail Box */}
          <div style={{ padding: '16px', background: 'var(--bg-sidebar)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary)', fontWeight: '700', marginBottom: '6px' }}>
              <ShieldCheck size={16} /> Deterministic Range Compliance
            </div>
            <div>
              MedLens evaluates numerical values strictly against the laboratory reference ranges printed in the uploaded report. No medical diagnoses or treatment recommendations are generated.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
