import fs from 'fs';
import path from 'path';
import { initDatabase, db } from './src/db.js';

async function verifyPersistence() {
  console.log(' Starting MedLens Data Persistence Verification...\n');
  const BASE_URL = 'http://localhost:5000/api';

  // 1. Fetch patients
  const patData = await fetch(`${BASE_URL}/patients`).then(r => r.json());
  let rahul = patData.patients.find(p => p.name.toLowerCase().includes('rahul verma'));
  
  if (!rahul) {
    console.log(' Registering Rahul Verma...');
    const createRes = await fetch(`${BASE_URL}/patients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Rahul Verma',
        identifier: 'PT-2026-001',
        date_of_birth: '1974-06-15',
        sex: 'Male',
        existing_conditions: ['Type 2 Diabetes Mellitus', 'Essential Hypertension'],
        allergies: ['No Known Drug Allergies (NKDA)'],
        current_medications: [{ name: 'Metformin', dosage: '500mg', frequency: 'Twice daily' }]
      })
    }).then(r => r.json());
    rahul = createRes.patient;
  }
  console.log(` Target Patient: ${rahul.name} (${rahul.id})`);

  // 2. Upload actual PDF report for Rahul Verma
  const pdfPath = path.join(process.cwd(), 'uploads', 'medreport_1788589691855_02e729fa.pdf');
  const pdfBuffer = fs.readFileSync(pdfPath);
  const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
  const formData = new FormData();
  formData.append('reportFile', blob, 'Rahul_Verma_Sample_Lab_Report.pdf');
  formData.append('patientId', rahul.id);
  formData.append('title', 'MetroHealth Diabetes & Metabolic Follow-up');
  formData.append('labName', 'MetroHealth Diagnostics');
  formData.append('reportDate', '2026-09-05');
  formData.append('reportType', 'Comprehensive Metabolic Panel');

  console.log(' Uploading PDF report for Rahul Verma...');
  const uploadRes = await fetch(`${BASE_URL}/reports/upload`, {
    method: 'POST',
    body: formData
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    console.error('Upload failed:', errText);
    process.exit(1);
  }

  const uploadData = await uploadRes.json();
  const reportId = uploadData.reportId;
  console.log(` Report Uploaded & Extracted. Report ID: ${reportId}`);
  console.log(` Parameters Extracted: ${uploadData.results.length}/11`);

  // 3. Verify SQLite DB state directly on disk
  console.log('\n Verifying SQLite Database Disk Persistence...');
  await initDatabase();
  const dbReport = db.queryOne('SELECT * FROM reports WHERE id = ?', [reportId]);
  const dbResults = db.queryAll('SELECT * FROM report_results WHERE report_id = ?', [reportId]);
  const dbSummary = db.queryOne('SELECT * FROM summaries WHERE report_id = ?', [reportId]);

  console.log(` DB Report Record Found: ${Boolean(dbReport)} (Patient: ${dbReport?.patient_id})`);
  console.log(` DB Report Results Count: ${dbResults.length}`);
  console.log(` DB Summary Record Found: ${Boolean(dbSummary)}`);
  console.log(` DB Raw Text Saved: ${Boolean(dbReport?.raw_text)} (${dbReport?.raw_text?.length} characters)`);

  if (!dbReport || dbResults.length !== 11 || !dbSummary) {
    console.error(' Persistence Verification FAILED in SQLite DB!');
    process.exit(1);
  }

  // 4. Verify API Queries for Rahul Verma
  console.log('\n Verifying Patient Report Isolation & Retrieval...');
  const rahulReports = await fetch(`${BASE_URL}/reports?patientId=${rahul.id}`).then(r => r.json());
  console.log(` Rahul Verma Reports Count: ${rahulReports.reports.length}`);
  
  const eleanor = patData.patients.find(p => p.name.toLowerCase().includes('eleanor'));
  if (eleanor) {
    const eleanorReports = await fetch(`${BASE_URL}/reports?patientId=${eleanor.id}`).then(r => r.json());
    console.log(` Eleanor Vance Reports Count: ${eleanorReports.reports.length}`);
    
    // Verify isolation
    const hasOverlap = rahulReports.reports.some(r => eleanorReports.reports.some(er => er.id === r.id));
    if (hasOverlap) {
      console.error(' FAILED: Report cross-contamination between patients!');
      process.exit(1);
    }
    console.log(' Patient Report Isolation: PASSED (Zero cross-contamination)');
  }

  // 5. Verify Structured Review GET /api/reports/:id
  console.log('\n Verifying Structured Review & AI Summary API Endpoints...');
  const singleReport = await fetch(`${BASE_URL}/reports/${reportId}`).then(r => r.json());
  console.log(` Report Title: "${singleReport.report.title}"`);
  console.log(` Associated Patient: "${singleReport.patient.name}"`);
  console.log(` Extracted Results: ${singleReport.results.length}`);
  console.log(` Key Findings Count: ${singleReport.summary?.key_findings?.length || 0}`);
  
  const hba1c = singleReport.results.find(r => r.test_name.includes('A1c'));
  console.log(` HbA1c Persisted Value: ${hba1c?.value_raw} ${hba1c?.unit} -> [${hba1c?.status}]`);
  
  if (hba1c?.value_raw !== '8.1') {
    console.error(' FAILED: HbA1c value mismatch!');
    process.exit(1);
  }

  // 6. Verify Timeline
  const timeline = await fetch(`${BASE_URL}/timeline/${rahul.id}`).then(r => r.json());
  console.log(` Timeline Events Count for Rahul Verma: ${timeline.timeline.length}`);

  console.log('\n DATA PERSISTENCE VERIFICATION PASSED 100% SUCCESSFULLY!\n');
}

verifyPersistence().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
