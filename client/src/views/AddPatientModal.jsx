import React, { useState } from 'react';
import { X, Plus, Trash2, UserPlus, ShieldAlert, Check } from 'lucide-react';

export function AddPatientModal({ isOpen, onClose, onSave, editPatient = null }) {
  if (!isOpen) return null;

  const [name, setName] = useState(editPatient ? editPatient.name : '');
  const [identifier, setIdentifier] = useState(editPatient ? editPatient.identifier : '');
  const [dob, setDob] = useState(editPatient ? editPatient.date_of_birth : '');
  const [sex, setSex] = useState(editPatient ? editPatient.sex : 'Female');
  const [notes, setNotes] = useState(editPatient ? editPatient.notes : '');

  // Tag arrays
  const [symptoms, setSymptoms] = useState(editPatient?.symptoms || ['Mild daytime fatigue']);
  const [newSymptom, setNewSymptom] = useState('');

  const [conditions, setConditions] = useState(editPatient?.existing_conditions || ['Type 2 Diabetes Mellitus']);
  const [newCondition, setNewCondition] = useState('');

  const [allergies, setAllergies] = useState(editPatient?.allergies || ['Penicillin']);
  const [newAllergy, setNewAllergy] = useState('');

  // Medication rows
  const [medications, setMedications] = useState(
    editPatient?.current_medications?.length > 0
      ? editPatient.current_medications
      : [{ name: '', dosage: '', frequency: '' }]
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Tag helper
  const addTag = (arr, setArr, val, setVal) => {
    if (!val.trim()) return;
    if (!arr.includes(val.trim())) {
      setArr([...arr, val.trim()]);
    }
    setVal('');
  };

  const removeTag = (arr, setArr, index) => {
    setArr(arr.filter((_, i) => i !== index));
  };

  // Medication helper
  const updateMed = (index, field, value) => {
    const updated = [...medications];
    updated[index][field] = value;
    setMedications(updated);
  };

  const addMedRow = () => {
    setMedications([...medications, { name: '', dosage: '', frequency: '' }]);
  };

  const removeMedRow = (index) => {
    setMedications(medications.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !dob) {
      setError('Patient Name and Date of Birth are mandatory.');
      return;
    }

    setSaving(true);
    setError('');

    const cleanMeds = medications.filter(m => m.name && m.name.trim());

    const payload = {
      name: name.trim(),
      identifier: identifier.trim() || undefined,
      date_of_birth: dob,
      sex,
      symptoms,
      existing_conditions: conditions,
      allergies,
      current_medications: cleanMeds,
      notes: notes.trim(),
      provenance_meta: {
        name: editPatient ? 'USER_EDITED' : 'USER_PROVIDED',
        date_of_birth: editPatient ? 'USER_EDITED' : 'USER_PROVIDED',
        symptoms: 'USER_PROVIDED',
        existing_conditions: 'USER_PROVIDED',
        allergies: 'VERIFIED',
        current_medications: 'USER_EDITED'
      }
    };

    try {
      await onSave(payload, editPatient?.id);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save patient');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserPlus size={20} color="var(--primary)" />
            <h3 style={{ fontSize: '1.15rem' }}>
              {editPatient ? 'Edit Patient Profile' : 'Register New Patient'}
            </h3>
          </div>
          <button className="btn btn-outline btn-icon-only" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {error && (
              <div style={{ padding: '10px 14px', background: 'var(--status-high-bg)', color: 'var(--status-high)', border: '1px solid var(--status-high-border)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
                {error}
              </div>
            )}

            {/* Row 1: Name & Identifier */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Patient Full Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Eleanor Vance"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">MRN / Identifier</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. PT-2026-0819"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                />
              </div>
            </div>

            {/* Row 2: DOB & Sex */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Date of Birth *</label>
                <input
                  type="date"
                  className="form-input"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  required
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Biological Sex</label>
                <select className="form-select" value={sex} onChange={(e) => setSex(e.target.value)}>
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {/* Symptoms Tags */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Reported Symptoms</label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Type symptom and click Add..."
                  value={newSymptom}
                  onChange={(e) => setNewSymptom(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(symptoms, setSymptoms, newSymptom, setNewSymptom); } }}
                />
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => addTag(symptoms, setSymptoms, newSymptom, setNewSymptom)}>
                  Add
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {symptoms.map((s, i) => (
                  <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'var(--bg-input)', padding: '3px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                    {s}
                    <X size={12} style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => removeTag(symptoms, setSymptoms, i)} />
                  </span>
                ))}
              </div>
            </div>

            {/* Existing Conditions Tags */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Existing Chronic Conditions</label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Type 2 Diabetes, Hypertension..."
                  value={newCondition}
                  onChange={(e) => setNewCondition(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(conditions, setConditions, newCondition, setNewCondition); } }}
                />
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => addTag(conditions, setConditions, newCondition, setNewCondition)}>
                  Add
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {conditions.map((c, i) => (
                  <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'var(--primary-subtle)', color: 'var(--primary)', padding: '3px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-highlight)', fontSize: '0.8rem' }}>
                    {c}
                    <X size={12} style={{ cursor: 'pointer' }} onClick={() => removeTag(conditions, setConditions, i)} />
                  </span>
                ))}
              </div>
            </div>

            {/* Allergies Warning Tags */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ color: 'var(--status-high)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ShieldAlert size={14} /> Drug Allergies & Sensitivities
                </span>
              </label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Penicillin, Sulfa, Latex..."
                  value={newAllergy}
                  onChange={(e) => setNewAllergy(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(allergies, setAllergies, newAllergy, setNewAllergy); } }}
                />
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => addTag(allergies, setAllergies, newAllergy, setNewAllergy)}>
                  Add
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {allergies.map((a, i) => (
                  <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'var(--status-high-bg)', color: 'var(--status-high)', padding: '3px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--status-high-border)', fontSize: '0.8rem' }}>
                    {a}
                    <X size={12} style={{ cursor: 'pointer' }} onClick={() => removeTag(allergies, setAllergies, i)} />
                  </span>
                ))}
              </div>
            </div>

            {/* Current Medications Table */}
            <div className="form-group" style={{ margin: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="form-label" style={{ margin: 0 }}>Current Active Medications</label>
                <button type="button" className="btn btn-outline btn-sm" onClick={addMedRow}>
                  <Plus size={12} /> Add Medication
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {medications.map((med, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr auto', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Medication Name (e.g. Metformin)"
                      value={med.name}
                      onChange={(e) => updateMed(i, 'name', e.target.value)}
                    />
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Dosage (e.g. 500 mg)"
                      value={med.dosage}
                      onChange={(e) => updateMed(i, 'dosage', e.target.value)}
                    />
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Frequency (e.g. Twice daily)"
                      value={med.frequency}
                      onChange={(e) => updateMed(i, 'frequency', e.target.value)}
                    />
                    <button type="button" className="btn btn-outline btn-icon-only" onClick={() => removeMedRow(i)}>
                      <Trash2 size={14} color="var(--status-high)" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Clinical Notes */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Clinical Observations & Provider Notes</label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="Enter background clinical observations, care plan notes, or history..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : editPatient ? 'Save Changes' : 'Register Patient'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
