import { db } from './db.js';
import { logAuditEvent } from './services/auditService.js';
import { generateSafeClinicalSummary } from './services/summaryService.js';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function seedInitialData() {
  const existingUsers = db.queryAll('SELECT * FROM users');
  if (existingUsers.length > 0) {
    return; // Already seeded
  }

  console.log('Seeding initial MedLens clinical data...');

  // 1. Seed Clinical Users / Providers
  const users = [
    {
      id: 'usr_sarah_chen',
      username: 'dr_sarah_chen',
      password: 'medlens2026_password',
      full_name: 'Dr. Sarah Chen, MD',
      role: 'Internal Medicine Specialist',
      avatar_initials: 'SC',
      created_at: new Date().toISOString()
    },
    {
      id: 'usr_james_wilson',
      username: 'dr_james_wilson',
      password: 'medlens2026_password',
      full_name: 'Dr. James Wilson, MD',
      role: 'Endocrinologist',
      avatar_initials: 'JW',
      created_at: new Date().toISOString()
    }
  ];

  for (const u of users) {
    db.run(
      `INSERT INTO users (id, username, password, full_name, role, avatar_initials, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [u.id, u.username, u.password, u.full_name, u.role, u.avatar_initials, u.created_at]
    );
  }

  // 2. Seed Patients
  const patients = [
    {
      id: 'pat_eleanor_vance',
      identifier: 'PT-2026-0819',
      name: 'Eleanor Vance',
      date_of_birth: '1968-04-12',
      age: 58,
      sex: 'Female',
      symptoms: JSON.stringify(['Mild daytime fatigue', 'Intermittent polydipsia', 'Occasional blurred vision']),
      existing_conditions: JSON.stringify(['Type 2 Diabetes Mellitus', 'Essential Hypertension', 'Mild Osteoarthritis']),
      allergies: JSON.stringify(['Penicillin (Mild Urticaria / Rash)', 'Sulfa Antibiotics']),
      current_medications: JSON.stringify([
        { name: 'Metformin HCl', dosage: '500 mg', frequency: 'Twice daily with meals', route: 'Oral' },
        { name: 'Lisinopril', dosage: '10 mg', frequency: 'Once daily in morning', route: 'Oral' },
        { name: 'Vitamin D3', dosage: '2000 IU', frequency: 'Once daily', route: 'Oral' }
      ]),
      notes: 'Patient maintains a home blood sugar log. Follow-up scheduled for comprehensive metabolic review and lipid panel assessment.',
      provenance_meta: JSON.stringify({
        name: 'USER_PROVIDED',
        date_of_birth: 'USER_PROVIDED',
        symptoms: 'USER_PROVIDED',
        allergies: 'VERIFIED',
        current_medications: 'USER_EDITED'
      }),
      created_at: '2026-01-10T09:30:00Z',
      updated_at: '2026-08-28T14:15:00Z'
    },
    {
      id: 'pat_marcus_brody',
      identifier: 'PT-2026-1042',
      name: 'Marcus Brody',
      date_of_birth: '1984-11-23',
      age: 41,
      sex: 'Male',
      symptoms: JSON.stringify(['Routine annual wellness exam', 'No acute symptoms reported']),
      existing_conditions: JSON.stringify(['Hyperlipidemia', 'Family history of coronary artery disease']),
      allergies: JSON.stringify(['No Known Drug Allergies (NKDA)']),
      current_medications: JSON.stringify([
        { name: 'Atorvastatin', dosage: '20 mg', frequency: 'Once daily at bedtime', route: 'Oral' },
        { name: 'Omega-3 Fish Oil', dosage: '1000 mg', frequency: 'Daily', route: 'Oral' }
      ]),
      notes: 'Annual lipid panel checkup and baseline complete blood count monitoring.',
      provenance_meta: JSON.stringify({
        name: 'USER_PROVIDED',
        date_of_birth: 'USER_PROVIDED',
        symptoms: 'USER_PROVIDED',
        allergies: 'VERIFIED',
        current_medications: 'VERIFIED'
      }),
      created_at: '2026-02-01T10:00:00Z',
      updated_at: '2026-02-10T11:45:00Z'
    },
    {
      id: 'pat_sophia_lin',
      identifier: 'PT-2026-3391',
      name: 'Sophia Lin',
      date_of_birth: '1992-07-19',
      age: 34,
      sex: 'Female',
      symptoms: JSON.stringify(['Sluggish energy levels', 'Cold intolerance', 'Dry skin']),
      existing_conditions: JSON.stringify(['Hypothyroidism', 'Iron Deficiency Anemia (Resolved)']),
      allergies: JSON.stringify(['Latex (Contact dermatitis)']),
      current_medications: JSON.stringify([
        { name: 'Levothyroxine Sodium', dosage: '50 mcg', frequency: 'Once daily in morning on empty stomach', route: 'Oral' }
      ]),
      notes: 'Six-month thyroid hormone evaluation to assess current levothyroxine dosage efficacy.',
      provenance_meta: JSON.stringify({
        name: 'USER_PROVIDED',
        date_of_birth: 'USER_PROVIDED',
        symptoms: 'USER_PROVIDED',
        allergies: 'VERIFIED',
        current_medications: 'VERIFIED'
      }),
      created_at: '2026-03-01T08:15:00Z',
      updated_at: '2026-03-12T16:20:00Z'
    }
  ];

  for (const p of patients) {
    db.run(
      `INSERT INTO patients (id, identifier, name, date_of_birth, age, sex, symptoms, existing_conditions, allergies, current_medications, notes, provenance_meta, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [p.id, p.identifier, p.name, p.date_of_birth, p.age, p.sex, p.symptoms, p.existing_conditions, p.allergies, p.current_medications, p.notes, p.provenance_meta, p.created_at, p.updated_at]
    );

    logAuditEvent({
      patientId: p.id,
      eventType: 'PATIENT_CREATED',
      description: `Patient profile registered for ${p.name} (${p.identifier}).`,
      details: { identifier: p.identifier, age: p.age, sex: p.sex },
      actorName: 'Dr. Sarah Chen, MD',
      actorRole: 'Internal Medicine Specialist'
    });
  }

  // 3. Seed Reports and Lab Results for Eleanor Vance
  seedEleanorReports();

  console.log('MedLens initial seed complete!');
}

function seedEleanorReports() {
  const patientId = 'pat_eleanor_vance';

  // Report 1: Baseline Metabolic & Lipid Panel (January 15, 2026)
  const rep1Id = 'rep_eleanor_jan2026';
  const rep1Date = '2026-01-15';
  const rep1Title = 'Comprehensive Metabolic & Lipid Panel (Baseline)';

  db.run(
    `INSERT INTO reports (id, patient_id, title, report_type, report_date, lab_name, file_name, file_path, file_type, file_size, status, raw_text, conflicts, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      rep1Id,
      patientId,
      rep1Title,
      'Comprehensive Metabolic Panel',
      rep1Date,
      'St. Jude Clinical Laboratory',
      'eleanor_vance_metabolic_jan2026.pdf',
      'sample_reports/eleanor_vance_jan2026.html',
      'application/pdf',
      245760,
      'VERIFIED',
      'ST. JUDE CLINICAL LABS\nPatient Name: Eleanor Vance\nDOB: 1968-04-12\nDate: 2026-01-15\nFasting Blood Glucose: 145 mg/dL [70 - 99] High\nHemoglobin A1c (HbA1c): 7.4 % [4.0 - 5.6] High\nTotal Cholesterol: 232 mg/dL [< 200] High\nHDL Cholesterol: 42 mg/dL [> 50] Low\nLDL Cholesterol: 154 mg/dL [< 100] High\nTriglycerides: 180 mg/dL [< 150] High\nSerum Creatinine: 0.9 mg/dL [0.5 - 1.1] Normal\nBlood Urea Nitrogen (BUN): 16 mg/dL [7 - 20] Normal\neGFR: 82 mL/min/1.73m2 [> 60] Normal\nSodium: 139 mmol/L [135 - 145] Normal\nPotassium: 4.4 mmol/L [3.5 - 5.1] Normal',
      JSON.stringify([]),
      '2026-01-15T11:00:00Z',
      '2026-01-15T11:45:00Z'
    ]
  );

  const rep1Results = [
    { name: 'Fasting Blood Glucose', cat: 'Metabolic & Glycemic', val: '145', num: 145, unit: 'mg/dL', range: '70 - 99', min: 70, max: 99, status: 'HIGH', reason: 'Value (145) exceeds upper reference limit of 99 printed on report.' },
    { name: 'Hemoglobin A1c (HbA1c)', cat: 'Metabolic & Glycemic', val: '7.4', num: 7.4, unit: '%', range: '4.0 - 5.6', min: 4.0, max: 5.6, status: 'HIGH', reason: 'Value (7.4) exceeds upper reference limit of 5.6 printed on report.' },
    { name: 'Total Cholesterol', cat: 'Lipid Profile', val: '232', num: 232, unit: 'mg/dL', range: '< 200', min: null, max: 200, status: 'HIGH', reason: 'Value (232) exceeds upper threshold (< 200) printed on report.' },
    { name: 'HDL Cholesterol (High-Density)', cat: 'Lipid Profile', val: '42', num: 42, unit: 'mg/dL', range: '> 50', min: 50, max: null, status: 'LOW', reason: 'Value (42) is below minimum threshold (> 50) printed on report.' },
    { name: 'LDL Cholesterol (Calculated/Direct)', cat: 'Lipid Profile', val: '154', num: 154, unit: 'mg/dL', range: '< 100', min: null, max: 100, status: 'HIGH', reason: 'Value (154) exceeds upper threshold (< 100) printed on report.' },
    { name: 'Triglycerides', cat: 'Lipid Profile', val: '180', num: 180, unit: 'mg/dL', range: '< 150', min: null, max: 150, status: 'HIGH', reason: 'Value (180) exceeds upper threshold (< 150) printed on report.' },
    { name: 'Serum Creatinine', cat: 'Renal & Electrolytes', val: '0.9', num: 0.9, unit: 'mg/dL', range: '0.5 - 1.1', min: 0.5, max: 1.1, status: 'NORMAL', reason: 'Value (0.9) is within printed laboratory reference interval (0.5 - 1.1).' },
    { name: 'Blood Urea Nitrogen (BUN)', cat: 'Renal & Electrolytes', val: '16', num: 16, unit: 'mg/dL', range: '7 - 20', min: 7, max: 20, status: 'NORMAL', reason: 'Value (16) is within printed laboratory reference interval (7 - 20).' },
    { name: 'Estimated GFR (eGFR)', cat: 'Renal & Electrolytes', val: '82', num: 82, unit: 'mL/min/1.73m2', range: '> 60', min: 60, max: null, status: 'NORMAL', reason: 'Value (82) meets minimum threshold requirement (> 60) on report.' },
    { name: 'Sodium (Na)', cat: 'Renal & Electrolytes', val: '139', num: 139, unit: 'mmol/L', range: '135 - 145', min: 135, max: 145, status: 'NORMAL', reason: 'Value (139) is within printed laboratory reference interval (135 - 145).' },
    { name: 'Potassium (K)', cat: 'Renal & Electrolytes', val: '4.4', num: 4.4, unit: 'mmol/L', range: '3.5 - 5.1', min: 3.5, max: 5.1, status: 'NORMAL', reason: 'Value (4.4) is within printed laboratory reference interval (3.5 - 5.1).' }
  ];

  for (const r of rep1Results) {
    db.run(
      `INSERT INTO report_results (id, report_id, patient_id, test_name, category, value_raw, value_numeric, unit, ref_range_raw, ref_min, ref_max, status, evaluation_reason, provenance, is_verified, confidence, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `res_${crypto.randomUUID()}`,
        rep1Id,
        patientId,
        r.name,
        r.cat,
        r.val,
        r.num,
        r.unit,
        r.range,
        r.min,
        r.max,
        r.status,
        r.reason,
        'VERIFIED',
        1,
        0.98,
        '',
        '2026-01-15T11:00:00Z',
        '2026-01-15T11:45:00Z'
      ]
    );
  }

  // Summary 1
  const sum1 = generateSafeClinicalSummary(rep1Results.map(r => ({
    test_name: r.name,
    value_raw: r.val,
    unit: r.unit,
    ref_range_raw: r.range,
    status: r.status
  })), null, rep1Title);

  db.run(
    `INSERT INTO summaries (id, report_id, patient_id, summary_text, key_findings, questions_for_doctor, total_tests, normal_count, abnormal_count, is_verified, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      `sum_${crypto.randomUUID()}`,
      rep1Id,
      patientId,
      sum1.summaryText,
      JSON.stringify(sum1.keyFindings),
      JSON.stringify(sum1.questionsForDoctor),
      sum1.totalTests,
      sum1.normalCount,
      sum1.abnormalCount,
      1,
      'Dr. Sarah Chen, MD',
      '2026-01-15T11:50:00Z',
      '2026-01-15T11:50:00Z'
    ]
  );

  logAuditEvent({
    patientId,
    reportId: rep1Id,
    eventType: 'REPORT_UPLOADED',
    description: `Report uploaded: "${rep1Title}" (11 parameters extracted and verified).`,
    details: { reportDate: rep1Date, totalParameters: 11 },
    actorName: 'Dr. Sarah Chen, MD'
  });

  // Report 2: Follow-up Metabolic & Lipid Panel (August 28, 2026)
  const rep2Id = 'rep_eleanor_aug2026';
  const rep2Date = '2026-08-28';
  const rep2Title = 'Comprehensive Metabolic & Lipid Follow-up Panel';

  db.run(
    `INSERT INTO reports (id, patient_id, title, report_type, report_date, lab_name, file_name, file_path, file_type, file_size, status, raw_text, conflicts, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      rep2Id,
      patientId,
      rep2Title,
      'Comprehensive Metabolic Panel',
      rep2Date,
      'MetroHealth Diagnostics',
      'eleanor_vance_metabolic_aug2026.pdf',
      'sample_reports/eleanor_vance_aug2026.html',
      'application/pdf',
      251904,
      'VERIFIED',
      'METROHEALTH DIAGNOSTICS\nPatient Name: Eleanor Vance\nDOB: 1968-04-12\nDate: 2026-08-28\nFasting Blood Glucose: 126 mg/dL [70 - 99] High\nHemoglobin A1c (HbA1c): 6.8 % [4.0 - 5.6] High\nTotal Cholesterol: 208 mg/dL [< 200] High\nHDL Cholesterol: 48 mg/dL [> 50] Low\nLDL Cholesterol: 130 mg/dL [< 100] High\nTriglycerides: 150 mg/dL [< 150] Normal\nSerum Creatinine: 0.88 mg/dL [0.5 - 1.1] Normal\nBlood Urea Nitrogen (BUN): 15 mg/dL [7 - 20] Normal\neGFR: 84 mL/min/1.73m2 [> 60] Normal\nSodium: 140 mmol/L [135 - 145] Normal\nPotassium: 4.3 mmol/L [3.5 - 5.1] Normal',
      JSON.stringify([]),
      '2026-08-28T14:00:00Z',
      '2026-08-28T14:30:00Z'
    ]
  );

  const rep2Results = [
    { name: 'Fasting Blood Glucose', cat: 'Metabolic & Glycemic', val: '126', num: 126, unit: 'mg/dL', range: '70 - 99', min: 70, max: 99, status: 'HIGH', reason: 'Value (126) exceeds upper reference limit of 99 printed on report.' },
    { name: 'Hemoglobin A1c (HbA1c)', cat: 'Metabolic & Glycemic', val: '6.8', num: 6.8, unit: '%', range: '4.0 - 5.6', min: 4.0, max: 5.6, status: 'HIGH', reason: 'Value (6.8) exceeds upper reference limit of 5.6 printed on report.' },
    { name: 'Total Cholesterol', cat: 'Lipid Profile', val: '208', num: 208, unit: 'mg/dL', range: '< 200', min: null, max: 200, status: 'HIGH', reason: 'Value (208) exceeds upper threshold (< 200) printed on report.' },
    { name: 'HDL Cholesterol (High-Density)', cat: 'Lipid Profile', val: '48', num: 48, unit: 'mg/dL', range: '> 50', min: 50, max: null, status: 'LOW', reason: 'Value (48) is below minimum threshold (> 50) printed on report.' },
    { name: 'LDL Cholesterol (Calculated/Direct)', cat: 'Lipid Profile', val: '130', num: 130, unit: 'mg/dL', range: '< 100', min: null, max: 100, status: 'HIGH', reason: 'Value (130) exceeds upper threshold (< 100) printed on report.' },
    { name: 'Triglycerides', cat: 'Lipid Profile', val: '150', num: 150, unit: 'mg/dL', range: '< 150', min: null, max: 150, status: 'NORMAL', reason: 'Value (150) is within printed laboratory reference interval.' },
    { name: 'Serum Creatinine', cat: 'Renal & Electrolytes', val: '0.88', num: 0.88, unit: 'mg/dL', range: '0.5 - 1.1', min: 0.5, max: 1.1, status: 'NORMAL', reason: 'Value (0.88) is within printed laboratory reference interval (0.5 - 1.1).' },
    { name: 'Blood Urea Nitrogen (BUN)', cat: 'Renal & Electrolytes', val: '15', num: 15, unit: 'mg/dL', range: '7 - 20', min: 7, max: 20, status: 'NORMAL', reason: 'Value (15) is within printed laboratory reference interval (7 - 20).' },
    { name: 'Estimated GFR (eGFR)', cat: 'Renal & Electrolytes', val: '84', num: 84, unit: 'mL/min/1.73m2', range: '> 60', min: 60, max: null, status: 'NORMAL', reason: 'Value (84) meets minimum threshold requirement (> 60) on report.' },
    { name: 'Sodium (Na)', cat: 'Renal & Electrolytes', val: '140', num: 140, unit: 'mmol/L', range: '135 - 145', min: 135, max: 145, status: 'NORMAL', reason: 'Value (140) is within printed laboratory reference interval (135 - 145).' },
    { name: 'Potassium (K)', cat: 'Renal & Electrolytes', val: '4.3', num: 4.3, unit: 'mmol/L', range: '3.5 - 5.1', min: 3.5, max: 5.1, status: 'NORMAL', reason: 'Value (4.3) is within printed laboratory reference interval (3.5 - 5.1).' }
  ];

  for (const r of rep2Results) {
    db.run(
      `INSERT INTO report_results (id, report_id, patient_id, test_name, category, value_raw, value_numeric, unit, ref_range_raw, ref_min, ref_max, status, evaluation_reason, provenance, is_verified, confidence, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `res_${crypto.randomUUID()}`,
        rep2Id,
        patientId,
        r.name,
        r.cat,
        r.val,
        r.num,
        r.unit,
        r.range,
        r.min,
        r.max,
        r.status,
        r.reason,
        'VERIFIED',
        1,
        0.98,
        '',
        '2026-08-28T14:00:00Z',
        '2026-08-28T14:30:00Z'
      ]
    );
  }

  // Summary 2
  const sum2 = generateSafeClinicalSummary(rep2Results.map(r => ({
    test_name: r.name,
    value_raw: r.val,
    unit: r.unit,
    ref_range_raw: r.range,
    status: r.status
  })), null, rep2Title);

  db.run(
    `INSERT INTO summaries (id, report_id, patient_id, summary_text, key_findings, questions_for_doctor, total_tests, normal_count, abnormal_count, is_verified, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      `sum_${crypto.randomUUID()}`,
      rep2Id,
      patientId,
      sum2.summaryText,
      JSON.stringify(sum2.keyFindings),
      JSON.stringify(sum2.questionsForDoctor),
      sum2.totalTests,
      sum2.normalCount,
      sum2.abnormalCount,
      1,
      'Dr. Sarah Chen, MD',
      '2026-08-28T14:35:00Z',
      '2026-08-28T14:35:00Z'
    ]
  );

  logAuditEvent({
    patientId,
    reportId: rep2Id,
    eventType: 'RECORD_VERIFIED',
    description: `Follow-up report verified: "${rep2Title}". 11 tests compared and stored.`,
    details: { reportDate: rep2Date, totalParameters: 11 },
    actorName: 'Dr. Sarah Chen, MD'
  });
}
