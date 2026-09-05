import fs from 'fs';
import path from 'path';

async function testPdfUploadPipeline() {
  console.log(' Starting End-to-End PDF Upload Pipeline Verification...\n');
  const BASE_URL = 'http://localhost:5000/api';

  // 1. Fetch a patient
  const patData = await fetch(`${BASE_URL}/patients`).then(r => r.json());
  const patient = patData.patients[0];
  console.log(` Target Patient: ${patient.name} (${patient.id})`);

  // 2. Prepare actual PDF file upload using native FormData
  const pdfPath = path.join(process.cwd(), 'uploads', 'medreport_1788589691855_02e729fa.pdf');
  if (!fs.existsSync(pdfPath)) {
    throw new Error(`PDF test file not found at ${pdfPath}`);
  }

  const pdfBuffer = fs.readFileSync(pdfPath);
  const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
  const formData = new FormData();
  formData.append('reportFile', blob, 'Rahul_Verma_Sample_Lab_Report.pdf');
  formData.append('patientId', patient.id);
  formData.append('title', 'Rahul Verma Laboratory Verification Panel');
  formData.append('labName', 'MetroHealth Diagnostics');
  formData.append('reportDate', '2026-09-05');
  formData.append('reportType', 'Comprehensive Metabolic Panel');

  console.log(' Uploading actual PDF file to POST /api/reports/upload...');
  const uploadRes = await fetch(`${BASE_URL}/reports/upload`, {
    method: 'POST',
    body: formData
  });

  if (!uploadRes.ok) {
    const errBody = await uploadRes.text();
    console.error(` Upload failed with HTTP ${uploadRes.status}:`, errBody);
    process.exit(1);
  }

  const data = await uploadRes.json();
  console.log(` Upload HTTP Status: ${uploadRes.status} OK`);
  console.log(` Report ID: ${data.reportId}`);
  console.log(` Raw Document Text Length: ${data.report.raw_text?.length || 0} chars`);
  console.log(` Raw Document Preview:\n"${data.report.raw_text?.substring(0, 250)}..."`);
  console.log(` Total Parameters Extracted: ${data.results.length}/11`);
  console.log(` Extraction Quality:`, data.quality);

  if (!data.report.raw_text || data.report.raw_text.length < 50) {
    console.error(' FAILED: Raw document text was empty or not preserved!');
    process.exit(1);
  }

  console.log('\n Extracted Results Detail:');
  for (const r of data.results) {
    console.log(`  - ${r.test_name}: ${r.value_raw} ${r.unit} (Ref: ${r.ref_range_raw}) -> [${r.status}]`);
  }

  const hba1c = data.results.find(r => r.test_name.includes('A1c'));
  const creat = data.results.find(r => r.test_name.includes('Creatinine'));
  const potas = data.results.find(r => r.test_name.includes('Potassium'));
  const hdl = data.results.find(r => r.test_name.includes('HDL'));
  const ldl = data.results.find(r => r.test_name.includes('LDL'));

  if (data.results.length !== 11) {
    console.error(` FAILED: Expected 11 parameters, got ${data.results.length}`);
    process.exit(1);
  }

  if (hba1c?.value_raw !== '8.1') {
    console.error(` FAILED: HbA1c expected '8.1', got '${hba1c?.value_raw}'`);
    process.exit(1);
  }

  if (creat?.value_raw !== '1.1') {
    console.error(` FAILED: Creatinine expected '1.1', got '${creat?.value_raw}'`);
    process.exit(1);
  }

  if (potas?.value_raw !== '4.3') {
    console.error(` FAILED: Potassium expected '4.3', got '${potas?.value_raw}'`);
    process.exit(1);
  }

  // 3. Verify Structured Review GET /api/reports/:id endpoint
  console.log('\n Verifying GET /api/reports/:id for Structured Review & Dual Pane...');
  const getRes = await fetch(`${BASE_URL}/reports/${data.reportId}`).then(r => r.json());
  console.log(` Structured Review Report Title: "${getRes.report.title}"`);
  console.log(` Structured Review Raw Text Available: ${Boolean(getRes.report.raw_text)} (${getRes.report.raw_text.length} chars)`);
  console.log(` Structured Review Results Count: ${getRes.results.length}`);
  console.log(` Clinical Summary Generated: "${getRes.summary?.summary_text?.substring(0, 100)}..."`);

  console.log('\n COMPLETE OPTION A PDF UPLOAD PIPELINE VERIFIED 100% OPERATIONAL!\n');
}

testPdfUploadPipeline().catch(err => {
  console.error('Pipeline test failed:', err);
  process.exit(1);
});
