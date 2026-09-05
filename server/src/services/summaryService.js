/**
 * Safe Patient-Friendly AI Summary Service
 * Generates clear, non-diagnostic clinical summaries strictly based on available extracted data.
 * Zero diagnostic claims, zero treatment recommendations, zero medication modifications.
 */

const TEST_EXPLANATIONS = {
  'Fasting Blood Glucose': 'Measures blood sugar concentration after an overnight fast to assess baseline glycemic regulation.',
  'Hemoglobin A1c (HbA1c)': 'Reflects average blood sugar levels over the preceding 2 to 3 month period.',
  'Postprandial Glucose (PPBS)': 'Measures blood glucose response approximately 2 hours after a meal.',
  'Total Cholesterol': 'Quantifies total circulating cholesterol carriers in the bloodstream.',
  'HDL Cholesterol (High-Density)': 'Often referred to as high-density lipoprotein, which carries cholesterol back to the liver.',
  'LDL Cholesterol (Calculated/Direct)': 'Reflects low-density lipoprotein particles circulating in the vascular system.',
  'Triglycerides': 'Measures the primary storage form of fats circulating in the bloodstream.',
  'Hemoglobin (Hb)': 'The iron-rich protein in red blood cells responsible for oxygen transport throughout tissues.',
  'Hematocrit (Hct)': 'The percentage of whole blood volume composed of red blood cells.',
  'White Blood Cell Count (WBC)': 'Reflects immune system cellular components involved in defense and inflammation.',
  'Platelet Count': 'Specialized cell fragments essential for normal blood clotting and vascular integrity.',
  'Serum Creatinine': 'A metabolic byproduct of muscle tissue filtered by the kidneys, used to assess renal clearance.',
  'Blood Urea Nitrogen (BUN)': 'Measures nitrogen from urea, reflecting protein breakdown and kidney filtration function.',
  'Estimated GFR (eGFR)': 'An estimate of how efficiently the kidneys filter waste from the bloodstream.',
  'Thyroid Stimulating Hormone (TSH)': 'A hormone produced by the pituitary gland that regulates thyroid gland activity.',
  'Free Thyroxine (Free T4)': 'The active circulating form of thyroid hormone responsible for cellular metabolism rate.',
  'Alanine Aminotransferase (ALT/SGPT)': 'An enzyme primarily found in liver cells involved in amino acid metabolism.',
  'Aspartate Aminotransferase (AST/SGOT)': 'An enzyme present in liver and muscle cells involved in energy production.'
};

export function generateSafeClinicalSummary(results, patient = null, reportTitle = 'Laboratory Panel') {
  const total = results.length;
  const normalResults = results.filter(r => r.status === 'NORMAL');
  const lowResults = results.filter(r => r.status === 'LOW');
  const highResults = results.filter(r => r.status === 'HIGH');
  const unclassifiedResults = results.filter(r => r.status === 'NOT CLASSIFIED');

  const outsideCount = lowResults.length + highResults.length;

  const keyFindings = [];

  if (outsideCount === 0) {
    keyFindings.push(`All ${total} evaluated parameters are within the standard reference ranges printed on this laboratory report.`);
  } else {
    keyFindings.push(
      `${outsideCount} of ${total} evaluated parameters fall outside the reference ranges printed in this report (${highResults.length} above upper limit, ${lowResults.length} below lower limit).`
    );
  }

  // Highlight high results with strictly descriptive text
  highResults.forEach(r => {
    keyFindings.push(
      `• ${r.test_name}: ${r.value_raw} ${r.unit} (Report Reference Range: ${r.ref_range_raw}) — Elevated relative to printed upper threshold.`
    );
  });

  // Highlight low results with strictly descriptive text
  lowResults.forEach(r => {
    keyFindings.push(
      `• ${r.test_name}: ${r.value_raw} ${r.unit} (Report Reference Range: ${r.ref_range_raw}) — Lower relative to printed lower threshold.`
    );
  });

  if (normalResults.length > 0) {
    keyFindings.push(
      `${normalResults.length} parameter(s) within normal report ranges: ${normalResults.map(r => r.test_name).join(', ')}.`
    );
  }

  // Educational test context
  const testDetails = results.map(r => {
    const explanation = TEST_EXPLANATIONS[r.test_name] || 'Standard clinical diagnostic parameter measured for health assessment.';
    return {
      test_name: r.test_name,
      value: `${r.value_raw} ${r.unit}`,
      range: r.ref_range_raw,
      status: r.status,
      explanation
    };
  });

  // Safe questions to discuss with their clinician
  const questionsForDoctor = [
    'How do these laboratory values compare with my overall health history and previous baselines?',
    outsideCount > 0 ? 'Are any follow-up tests or repeat measurements indicated to monitor these values?' : 'When is the appropriate timeframe for my next routine lab evaluation?',
    'Could any dietary factors, medications, hydration levels, or sample collection timing have influenced these results?'
  ];

  const summaryParagraph = outsideCount === 0
    ? `This report (${reportTitle}) contains ${total} laboratory measurements. All tested markers are within the normal reference intervals specified by the testing facility.`
    : `This report (${reportTitle}) contains ${total} laboratory measurements. ${outsideCount} parameter(s) differ from the reference intervals printed on the report: ${[...highResults.map(r => `${r.test_name} (Higher)`), ...lowResults.map(r => `${r.test_name} (Lower)`)].join(', ')}. The remaining ${normalResults.length} parameter(s) fall within printed reference boundaries.`;

  return {
    summaryText: summaryParagraph,
    keyFindings,
    testDetails,
    questionsForDoctor,
    totalTests: total,
    normalCount: normalResults.length,
    abnormalCount: outsideCount,
    unclassifiedCount: unclassifiedResults.length,
    disclaimer: 'Notice: This summary is generated for information organization purposes only and does NOT constitute a clinical diagnosis, medical opinion, treatment plan, or medication recommendation. Please consult your licensed healthcare provider for all clinical decisions.'
  };
}
