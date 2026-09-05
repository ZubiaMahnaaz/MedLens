/**
 * Conflict Detection Service
 * Flags potential discrepancies between extracted report data and existing patient profile.
 * Displays "Needs Review" to give human reviewers full control.
 */

export function detectReportConflicts(extractedMeta, existingPatient, existingReports = [], currentResults = []) {
  const conflicts = [];

  if (!existingPatient) return conflicts;

  // 1. Patient Name Discrepancy
  if (extractedMeta.patientName && extractedMeta.patientName !== 'Not available') {
    const reportName = extractedMeta.patientName.toLowerCase().replace(/[^a-z]/g, '');
    const profileName = (existingPatient.name || '').toLowerCase().replace(/[^a-z]/g, '');

    if (reportName && profileName && reportName !== profileName && !reportName.includes(profileName) && !profileName.includes(reportName)) {
      conflicts.push({
        id: 'conf_name_mismatch',
        severity: 'HIGH',
        type: 'PATIENT_NAME_MISMATCH',
        title: 'Patient Name Discrepancy Detected',
        description: `The report lists patient name as "${extractedMeta.patientName}", but the selected patient profile is "${existingPatient.name}".`,
        suggestedAction: 'Verify that this report belongs to the selected patient before confirming.'
      });
    }
  }

  // 2. Date of Birth Mismatch
  if (extractedMeta.dateOfBirth && extractedMeta.dateOfBirth !== 'Not available' && existingPatient.date_of_birth) {
    const repDob = extractedMeta.dateOfBirth.replace(/[^0-9]/g, '');
    const patDob = existingPatient.date_of_birth.replace(/[^0-9]/g, '');

    if (repDob && patDob && repDob !== patDob) {
      conflicts.push({
        id: 'conf_dob_mismatch',
        severity: 'HIGH',
        type: 'DOB_MISMATCH',
        title: 'Date of Birth Discrepancy',
        description: `Report DOB (${extractedMeta.dateOfBirth}) differs from patient profile DOB (${existingPatient.date_of_birth}).`,
        suggestedAction: 'Check report header to prevent mixing patient files.'
      });
    }
  }

  // 3. Duplicate Report Detection
  if (extractedMeta.reportDate && extractedMeta.reportDate !== 'Not available') {
    const duplicate = existingReports.find(r => r.report_date === extractedMeta.reportDate && r.title === extractedMeta.panelType);
    if (duplicate) {
      conflicts.push({
        id: 'conf_duplicate_report',
        severity: 'MEDIUM',
        type: 'DUPLICATE_REPORT',
        title: 'Potential Duplicate Report',
        description: `A report with date "${extractedMeta.reportDate}" and title "${extractedMeta.panelType}" was previously uploaded on ${new Date(duplicate.created_at).toLocaleDateString()}.`,
        suggestedAction: 'Ensure you are not uploading a duplicate copy of an existing laboratory report.'
      });
    }
  }

  // 4. Missing Reference Ranges Check
  const unclassifiedTests = currentResults.filter(r => r.status === 'NOT CLASSIFIED' || r.ref_range_raw === 'Not available');
  if (unclassifiedTests.length > 0) {
    conflicts.push({
      id: 'conf_missing_ref_range',
      severity: 'LOW',
      type: 'MISSING_REFERENCE_RANGE',
      title: 'Missing Reference Ranges in Report',
      description: `${unclassifiedTests.length} test parameter(s) (${unclassifiedTests.map(t => t.test_name).join(', ')}) do not have standard printed reference ranges in this report.`,
      suggestedAction: 'Manual verification recommended to confirm if reference limits were printed on the source document.'
    });
  }

  return conflicts;
}
