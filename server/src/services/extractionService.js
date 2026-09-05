import { classifyValueAgainstRange, parseReferenceRange } from './rangeClassifier.js';
import crypto from 'crypto';

// Comprehensive dictionary of clinical laboratory test patterns
export const CLINICAL_TEST_PATTERNS = [
  // Metabolic & Glycemic
  {
    name: 'Fasting Blood Glucose',
    aliases: ['fasting blood glucose', 'fasting glucose', 'glucose, fasting', 'glucose fasting', 'glucose, serum', 'glucose serum', 'glucose, plasma', 'serum glucose', 'plasma glucose', 'fbs', 'blood sugar fasting', 'blood sugar', 'glucose'],
    category: 'Metabolic & Glycemic',
    defaultUnit: 'mg/dL'
  },
  {
    name: 'Hemoglobin A1c (HbA1c)',
    aliases: ['hemoglobin a1c (hba1c)', 'hemoglobin a1c', 'hba1c', 'glycated hemoglobin', 'glycohemoglobin', 'a1c', 'hgb a1c'],
    category: 'Metabolic & Glycemic',
    defaultUnit: '%'
  },
  {
    name: 'Postprandial Glucose (PPBS)',
    aliases: ['postprandial glucose', 'ppbs', 'glucose 2hr post prandial', '2-hour postprandial glucose', 'glucose, 2hr pp'],
    category: 'Metabolic & Glycemic',
    defaultUnit: 'mg/dL'
  },
  {
    name: 'Insulin, Fasting',
    aliases: ['insulin, fasting', 'fasting insulin', 'serum insulin', 'insulin'],
    category: 'Metabolic & Glycemic',
    defaultUnit: 'uIU/mL'
  },

  // Lipid Panel
  {
    name: 'Total Cholesterol',
    aliases: ['total cholesterol', 'cholesterol, total', 'cholesterol total', 'serum cholesterol', 'cholesterol', 'chol'],
    category: 'Lipid Profile',
    defaultUnit: 'mg/dL'
  },
  {
    name: 'HDL Cholesterol (High-Density)',
    aliases: ['hdl cholesterol (high-density)', 'hdl cholesterol', 'cholesterol, hdl', 'cholesterol hdl', 'hdl-c', 'hdl', 'direct hdl', 'hdl direct'],
    category: 'Lipid Profile',
    defaultUnit: 'mg/dL'
  },
  {
    name: 'LDL Cholesterol (Calculated/Direct)',
    aliases: ['ldl cholesterol (calculated/direct)', 'ldl cholesterol', 'cholesterol, ldl', 'cholesterol ldl', 'ldl-c', 'ldl calculated', 'ldl direct', 'ldl calc', 'ldl chol calc', 'ldl'],
    category: 'Lipid Profile',
    defaultUnit: 'mg/dL'
  },
  {
    name: 'Triglycerides',
    aliases: ['triglycerides', 'serum triglycerides', 'triglyceride', 'tg', 'trig'],
    category: 'Lipid Profile',
    defaultUnit: 'mg/dL'
  },
  {
    name: 'VLDL Cholesterol',
    aliases: ['vldl cholesterol', 'vldl-c', 'vldl', 'vldl cholesterol, cal'],
    category: 'Lipid Profile',
    defaultUnit: 'mg/dL'
  },
  {
    name: 'Non-HDL Cholesterol',
    aliases: ['non-hdl cholesterol', 'non hdl cholesterol', 'non-hdl-c'],
    category: 'Lipid Profile',
    defaultUnit: 'mg/dL'
  },

  // Hematology (Complete Blood Count)
  {
    name: 'White Blood Cell Count (WBC)',
    aliases: ['white blood cell count (wbc)', 'white blood cell count', 'white blood cells', 'wbc count', 'wbc', 'total leukocyte count', 'tlc', 'leukocyte count', 'leukocytes'],
    category: 'Hematology (CBC)',
    defaultUnit: '10^3/uL'
  },
  {
    name: 'Red Blood Cell Count (RBC)',
    aliases: ['red blood cell count (rbc)', 'red blood cell count', 'red blood cells', 'rbc count', 'rbc', 'erythrocyte count', 'erythrocytes', 'red blood count'],
    category: 'Hematology (CBC)',
    defaultUnit: '10^6/uL'
  },
  {
    name: 'Hemoglobin (Hb)',
    aliases: ['hemoglobin (hb)', 'hemoglobin', 'hgb', 'hb', 'total hemoglobin'],
    category: 'Hematology (CBC)',
    defaultUnit: 'g/dL'
  },
  {
    name: 'Hematocrit (Hct)',
    aliases: ['hematocrit (hct)', 'hematocrit', 'hct', 'packed cell volume', 'pcv'],
    category: 'Hematology (CBC)',
    defaultUnit: '%'
  },
  {
    name: 'Mean Corpuscular Volume (MCV)',
    aliases: ['mean corpuscular volume (mcv)', 'mean corpuscular volume', 'mcv'],
    category: 'Hematology (CBC)',
    defaultUnit: 'fL'
  },
  {
    name: 'Mean Corpuscular Hemoglobin (MCH)',
    aliases: ['mean corpuscular hemoglobin (mch)', 'mean corpuscular hemoglobin', 'mch'],
    category: 'Hematology (CBC)',
    defaultUnit: 'pg'
  },
  {
    name: 'Mean Corpuscular Hemoglobin Conc. (MCHC)',
    aliases: ['mean corpuscular hemoglobin conc.', 'mchc', 'mchc, automated'],
    category: 'Hematology (CBC)',
    defaultUnit: 'g/dL'
  },
  {
    name: 'Red Cell Distribution Width (RDW)',
    aliases: ['red cell distribution width', 'rdw', 'rdw-cv', 'rdw-sd'],
    category: 'Hematology (CBC)',
    defaultUnit: '%'
  },
  {
    name: 'Platelet Count',
    aliases: ['platelet count', 'platelets', 'plt', 'thrombocyte count', 'thrombocytes'],
    category: 'Hematology (CBC)',
    defaultUnit: '10^3/uL'
  },
  {
    name: 'Mean Platelet Volume (MPV)',
    aliases: ['mean platelet volume (mpv)', 'mean platelet volume', 'mpv'],
    category: 'Hematology (CBC)',
    defaultUnit: 'fL'
  },
  {
    name: 'Neutrophils',
    aliases: ['neutrophils', 'neutrophil count', 'segs', 'segmented neutrophils', 'polys'],
    category: 'Hematology (CBC)',
    defaultUnit: '%'
  },
  {
    name: 'Lymphocytes',
    aliases: ['lymphocytes', 'lymphocyte count', 'lymphs'],
    category: 'Hematology (CBC)',
    defaultUnit: '%'
  },
  {
    name: 'Monocytes',
    aliases: ['monocytes', 'monocyte count', 'monos'],
    category: 'Hematology (CBC)',
    defaultUnit: '%'
  },
  {
    name: 'Eosinophils',
    aliases: ['eosinophils', 'eosinophil count', 'eos'],
    category: 'Hematology (CBC)',
    defaultUnit: '%'
  },
  {
    name: 'Basophils',
    aliases: ['basophils', 'basophil count', 'basos'],
    category: 'Hematology (CBC)',
    defaultUnit: '%'
  },

  // Renal & Electrolytes
  {
    name: 'Serum Creatinine',
    aliases: ['serum creatinine', 'creatinine, serum', 'creatinine', 'cr, serum', 'cr', 'creat', 's. creatinine'],
    category: 'Renal & Electrolytes',
    defaultUnit: 'mg/dL'
  },
  {
    name: 'Blood Urea Nitrogen (BUN)',
    aliases: ['blood urea nitrogen (bun)', 'blood urea nitrogen', 'urea nitrogen (bun)', 'urea nitrogen, serum', 'urea nitrogen', 'serum urea', 'bun', 'urea'],
    category: 'Renal & Electrolytes',
    defaultUnit: 'mg/dL'
  },
  {
    name: 'Estimated GFR (eGFR)',
    aliases: ['estimated gfr (egfr)', 'estimated gfr', 'egfr', 'estimated glomerular filtration rate', 'egfr non-african american', 'egfr if non-african american', 'egfr if nonafricn-am', 'egfr african american', 'gfr estimated', 'gfr'],
    category: 'Renal & Electrolytes',
    defaultUnit: 'mL/min/1.73m2'
  },
  {
    name: 'BUN/Creatinine Ratio',
    aliases: ['bun/creatinine ratio', 'bun/creat ratio', 'urea/creatinine ratio'],
    category: 'Renal & Electrolytes',
    defaultUnit: 'ratio'
  },
  {
    name: 'Sodium (Na)',
    aliases: ['sodium (na)', 'sodium, serum', 'serum sodium', 'sodium', 'na+, serum', 'na+', 'na'],
    category: 'Renal & Electrolytes',
    defaultUnit: 'mmol/L'
  },
  {
    name: 'Potassium (K)',
    aliases: ['potassium (k)', 'potassium, serum', 'serum potassium', 'potassium', 'k+, serum', 'k+', 'k'],
    category: 'Renal & Electrolytes',
    defaultUnit: 'mmol/L'
  },
  {
    name: 'Chloride (Cl)',
    aliases: ['chloride (cl)', 'chloride, serum', 'serum chloride', 'chloride', 'cl-, serum', 'cl-', 'cl'],
    category: 'Renal & Electrolytes',
    defaultUnit: 'mmol/L'
  },
  {
    name: 'Carbon Dioxide, Total (CO2)',
    aliases: ['carbon dioxide, total (co2)', 'carbon dioxide, total', 'carbon dioxide', 'total co2', 'co2', 'bicarbonate', 'hco3'],
    category: 'Renal & Electrolytes',
    defaultUnit: 'mmol/L'
  },
  {
    name: 'Calcium, Total',
    aliases: ['calcium, total', 'total calcium', 'calcium, serum', 'serum calcium', 'calcium', 'ca, total', 'ca'],
    category: 'Renal & Electrolytes',
    defaultUnit: 'mg/dL'
  },
  {
    name: 'Phosphorus, Serum',
    aliases: ['phosphorus, serum', 'serum phosphorus', 'phosphorus', 'phosphate', 'po4'],
    category: 'Renal & Electrolytes',
    defaultUnit: 'mg/dL'
  },
  {
    name: 'Magnesium, Serum',
    aliases: ['magnesium, serum', 'serum magnesium', 'magnesium', 'mg, serum', 'mg'],
    category: 'Renal & Electrolytes',
    defaultUnit: 'mg/dL'
  },
  {
    name: 'Uric Acid, Serum',
    aliases: ['uric acid, serum', 'serum uric acid', 'uric acid'],
    category: 'Renal & Electrolytes',
    defaultUnit: 'mg/dL'
  },

  // Hepatic / Liver Function
  {
    name: 'Alanine Aminotransferase (ALT/SGPT)',
    aliases: ['alanine aminotransferase (alt/sgpt)', 'alanine aminotransferase', 'alt (sgpt)', 'alt, serum', 'alt', 'sgpt, serum', 'sgpt'],
    category: 'Hepatic Function',
    defaultUnit: 'U/L'
  },
  {
    name: 'Aspartate Aminotransferase (AST/SGOT)',
    aliases: ['aspartate aminotransferase (ast/sgot)', 'aspartate aminotransferase', 'ast (sgot)', 'ast, serum', 'ast', 'sgot, serum', 'sgot'],
    category: 'Hepatic Function',
    defaultUnit: 'U/L'
  },
  {
    name: 'Alkaline Phosphatase (ALP)',
    aliases: ['alkaline phosphatase (alp)', 'alkaline phosphatase, s', 'alkaline phosphatase', 'alk phos', 'alp, serum', 'alp'],
    category: 'Hepatic Function',
    defaultUnit: 'U/L'
  },
  {
    name: 'Total Bilirubin',
    aliases: ['total bilirubin', 'bilirubin, total, serum', 'bilirubin, total', 'bilirubin total', 't. bili', 't bili'],
    category: 'Hepatic Function',
    defaultUnit: 'mg/dL'
  },
  {
    name: 'Direct Bilirubin',
    aliases: ['direct bilirubin', 'bilirubin, direct', 'conjugated bilirubin', 'd. bili'],
    category: 'Hepatic Function',
    defaultUnit: 'mg/dL'
  },
  {
    name: 'Total Protein',
    aliases: ['total protein, serum', 'total protein', 'protein, total, serum', 'protein, total', 'serum protein'],
    category: 'Hepatic Function',
    defaultUnit: 'g/dL'
  },
  {
    name: 'Albumin',
    aliases: ['albumin, serum', 'serum albumin', 'albumin', 'alb'],
    category: 'Hepatic Function',
    defaultUnit: 'g/dL'
  },
  {
    name: 'Globulin, Total',
    aliases: ['globulin, total', 'total globulin', 'globulin', 'serum globulin'],
    category: 'Hepatic Function',
    defaultUnit: 'g/dL'
  },
  {
    name: 'A/G Ratio',
    aliases: ['a/g ratio', 'albumin/globulin ratio', 'alb/glob ratio'],
    category: 'Hepatic Function',
    defaultUnit: 'ratio'
  },
  {
    name: 'Gamma-Glutamyl Transferase (GGT)',
    aliases: ['gamma-glutamyl transferase', 'ggt', 'ggtp'],
    category: 'Hepatic Function',
    defaultUnit: 'U/L'
  },

  // Thyroid Function
  {
    name: 'Thyroid Stimulating Hormone (TSH)',
    aliases: ['thyroid stimulating hormone (tsh)', 'thyroid stimulating hormone', 'tsh, 3rd generation', 'sensitive tsh', '3rd gen tsh', 'tsh'],
    category: 'Thyroid Function',
    defaultUnit: 'uIU/mL'
  },
  {
    name: 'Free Thyroxine (Free T4)',
    aliases: ['free thyroxine (free t4)', 'free thyroxine', 'thyroxine, free', 'free t4', 'ft4', 't4, free'],
    category: 'Thyroid Function',
    defaultUnit: 'ng/dL'
  },
  {
    name: 'Free Triiodothyronine (Free T3)',
    aliases: ['free triiodothyronine (free t3)', 'free triiodothyronine', 'triiodothyronine, free', 'free t3', 'ft3', 't3, free'],
    category: 'Thyroid Function',
    defaultUnit: 'pg/mL'
  },

  // Inflammatory, Vitamins & Cardiac
  {
    name: 'C-Reactive Protein (hs-CRP)',
    aliases: ['c-reactive protein', 'hs-crp', 'crp, high sensitivity', 'crp'],
    category: 'Inflammatory & Other',
    defaultUnit: 'mg/L'
  },
  {
    name: 'Sedimentation Rate (ESR)',
    aliases: ['sedimentation rate', 'erythrocyte sedimentation rate', 'esr', 'sed rate'],
    category: 'Inflammatory & Other',
    defaultUnit: 'mm/hr'
  },
  {
    name: 'Ferritin',
    aliases: ['ferritin, serum', 'serum ferritin', 'ferritin'],
    category: 'Hematology (Iron)',
    defaultUnit: 'ng/mL'
  },
  {
    name: 'Vitamin D, 25-Hydroxy',
    aliases: ['vitamin d, 25-hydroxy', '25-hydroxyvitamin d', 'vitamin d3', 'vitamin d', '25-oh vitamin d'],
    category: 'Vitamins & Minerals',
    defaultUnit: 'ng/mL'
  },
  {
    name: 'Vitamin B12',
    aliases: ['vitamin b12', 'b12, serum', 'cobalamin', 'b12'],
    category: 'Vitamins & Minerals',
    defaultUnit: 'pg/mL'
  },
  {
    name: 'Prostate Specific Antigen (PSA)',
    aliases: ['prostate specific antigen', 'psa, total', 'total psa', 'psa'],
    category: 'Diagnostic Biomarkers',
    defaultUnit: 'ng/mL'
  }
];

// Common laboratory units sorted by length descending for greedy matching
export const COMMON_LAB_UNITS = [
  'mL/min/1.73m2', 'mL/min',
  '10^3/uL', '10^6/uL', 'x10^3/uL', 'x10^6/uL', '10*3/uL', '10*6/uL', 'k/uL', 'M/uL',
  'mg/dL', 'g/dL', 'mmol/L', 'umol/L', 'uIU/mL', 'uIu/ml', 'mIU/L', 'ng/dL', 'ng/mL', 'pg/mL',
  'mm/hr', 'mg/L', '%', 'percent', 'fL', 'fl', 'pg', 'U/L', 'u/l', 'IU/L', 'iu/l', 'ratio'
];

const UNITS_REGEX = /\b(mg\/dL|g\/dL|mmol\/L|umol\/L|uIU\/mL|uIu\/ml|mIU\/L|ng\/dL|ng\/mL|pg\/mL|10\^3\/uL|10\^6\/uL|x10\^3\/uL|x10\^6\/uL|10\*3\/uL|10\*6\/uL|k\/uL|M\/uL|\%|percent|fL|fl|pg|U\/L|u\/l|IU\/L|iu\/l|mL\/min\/1\.73m2|mL\/min|mm\/hr|mg\/L|ratio)\b/i;

/**
 * Robust Medical Extraction Engine
 * Extracts all detectable laboratory result rows from arbitrary PDF text, OCR, or structured logs.
 * Preserves strict report reference ranges. Never invents missing values or ranges.
 */
export function extractStructuredData(rawText, existingPatient = null, isSample = false) {
  if (!rawText || typeof rawText !== 'string') {
    return {
      metadata: { patientName: 'Not available', dateOfBirth: 'Not available', reportDate: 'Not available', labFacility: 'Not available', panelType: 'Diagnostic Lab Panel' },
      results: [],
      quality: { status: 'EMPTY', totalExtracted: 0, notes: 'No text was provided for extraction.' }
    };
  }

  // Normalize text characters (replace non-breaking spaces, curly quotes, en/em dashes)
  const normalizedText = rawText
    .replace(/\u00A0/g, ' ')
    .replace(/[–—]/g, '-')
    .replace(/[\r]/g, '');

  const lines = normalizedText.split('\n').map(l => l.trim()).filter(Boolean);

  // 1. Extract metadata from report headers
  const extractedMeta = extractReportMetadata(lines, normalizedText);

  // 2. Extract structured results using multi-stage strategy
  const results = [];
  const extractedTestNames = new Set();
  const matchedLineIndices = new Set();

  // STAGE 0: High-Precision Structured & Collapsed Line Parser
  // Handles both standard formatted lines and unspaced PDF table streams (e.g. "HbA1c8.1%4.0 - 5.6HIGH")
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    if (isMetadataOrHeaderLine(line)) continue;

    const parsed = parseLaboratoryLine(line);
    if (parsed && !extractedTestNames.has(parsed.test_name.toLowerCase())) {
      extractedTestNames.add(parsed.test_name.toLowerCase());
      matchedLineIndices.add(lineIndex);

      const classification = classifyValueAgainstRange(parsed.value_raw, parsed.ref_range_raw);

      results.push({
        id: `res_${crypto.randomUUID()}`,
        test_name: parsed.test_name,
        category: parsed.category,
        value_raw: parsed.value_raw,
        value_numeric: classification.numericValue,
        unit: parsed.unit,
        ref_range_raw: parsed.ref_range_raw,
        ref_min: classification.refMin,
        ref_max: classification.refMax,
        status: classification.status,
        evaluation_reason: classification.reason,
        provenance: isSample ? 'SAMPLE_DATA' : 'AI_EXTRACTED',
        is_verified: 0,
        confidence: 0.99,
        notes: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
  }

  // STAGE 1: Dictionary & Pattern Matching across remaining lines
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    if (matchedLineIndices.has(lineIndex)) continue;
    const line = lines[lineIndex];
    if (isMetadataOrHeaderLine(line)) continue;

    // Check if line matches any dictionary test pattern
    for (const testDef of CLINICAL_TEST_PATTERNS) {
      if (extractedTestNames.has(testDef.name.toLowerCase())) continue;

      // Find if alias is in line (sort aliases by length descending so longer aliases match first)
      const sortedAliases = [...testDef.aliases].sort((a, b) => b.length - a.length);
      let matchedAlias = null;
      let matchedPos = -1;

      for (const alias of sortedAliases) {
        const escaped = escapeRegExp(alias);
        const regex = new RegExp(`(^|[^a-zA-Z0-9])${escaped}([^a-zA-Z0-9]|$)`, 'i');
        const match = regex.exec(line);
        if (match) {
          matchedAlias = alias;
          matchedPos = match.index + match[1].length;
          break;
        }
      }

      if (matchedAlias && matchedPos >= 0) {
        // Attempt to parse result from current line or combined next line if columnar
        let lineToParse = line;
        let consumedNext = false;
        if (line.trim().length <= matchedAlias.length + 5 && lineIndex + 1 < lines.length) {
          lineToParse = `${line} ${lines[lineIndex + 1]}`;
          consumedNext = true;
        }

        const parsed = parseTestDetails(lineToParse, matchedAlias, matchedPos, testDef);
        if (parsed && parsed.valueRaw !== 'Not available') {
          extractedTestNames.add(testDef.name.toLowerCase());
          matchedLineIndices.add(lineIndex);
          if (consumedNext) matchedLineIndices.add(lineIndex + 1);

          const classification = classifyValueAgainstRange(parsed.valueRaw, parsed.refRangeRaw);

          results.push({
            id: `res_${crypto.randomUUID()}`,
            test_name: testDef.name,
            category: testDef.category,
            value_raw: parsed.valueRaw,
            value_numeric: classification.numericValue,
            unit: parsed.unit,
            ref_range_raw: parsed.refRangeRaw,
            ref_min: classification.refMin,
            ref_max: classification.refMax,
            status: classification.status,
            evaluation_reason: classification.reason,
            provenance: isSample ? 'SAMPLE_DATA' : 'AI_EXTRACTED',
            is_verified: 0,
            confidence: 0.98,
            notes: parsed.observation || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          break; // Move to next line
        }
      }
    }
  }

  // STAGE 2: Generic Tabular Row Fallback
  // Parses any remaining laboratory rows on lines that were not matched in Stage 0 or Stage 1
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    if (matchedLineIndices.has(lineIndex)) continue;
    const line = lines[lineIndex];

    // Skip header/footer metadata lines
    if (isMetadataOrHeaderLine(line)) continue;

    // Check if this line looks like a generic result row: [Name] [Value] [Unit] [Range]
    const genericParsed = parseGenericRow(line);
    if (genericParsed && !extractedTestNames.has(genericParsed.test_name.toLowerCase())) {
      extractedTestNames.add(genericParsed.test_name.toLowerCase());
      matchedLineIndices.add(lineIndex);

      const classification = classifyValueAgainstRange(genericParsed.value_raw, genericParsed.ref_range_raw);

      results.push({
        id: `res_${crypto.randomUUID()}`,
        test_name: genericParsed.test_name,
        category: genericParsed.category || 'General Diagnostic',
        value_raw: genericParsed.value_raw,
        value_numeric: classification.numericValue,
        unit: genericParsed.unit,
        ref_range_raw: genericParsed.ref_range_raw,
        ref_min: classification.refMin,
        ref_max: classification.refMax,
        status: classification.status,
        evaluation_reason: classification.reason,
        provenance: isSample ? 'SAMPLE_DATA' : 'AI_EXTRACTED',
        is_verified: 0,
        confidence: 0.92,
        notes: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
  }

  // STAGE 3: Multi-line Block Columnar Reconstructor
  // If fewer than 2 results extracted from multi-line text, attempts block columnar extraction
  if (results.length < 2 && lines.length >= 6) {
    const blockResults = parseBlockColumnarFormat(lines, matchedLineIndices, isSample);
    for (const br of blockResults) {
      if (!extractedTestNames.has(br.test_name.toLowerCase())) {
        extractedTestNames.add(br.test_name.toLowerCase());
        results.push(br);
      }
    }
  }

  // 3. Evaluate extraction completeness and quality
  const totalExtracted = results.length;
  const unclassifiedCount = results.filter(r => r.status === 'NOT CLASSIFIED').length;
  const missingRangeCount = results.filter(r => r.ref_range_raw === 'Not available').length;

  let qualityStatus = 'COMPLETE';
  let qualityNotes = `Successfully extracted ${totalExtracted} clinical parameter(s) from document.`;

  if (totalExtracted === 0) {
    qualityStatus = 'UNCERTAIN';
    qualityNotes = 'No structured clinical parameters could be identified from this document.';
  } else if (missingRangeCount > 0) {
    qualityStatus = 'PARTIAL';
    qualityNotes = `${totalExtracted} parameter(s) extracted. ${missingRangeCount} parameter(s) do not contain printed reference intervals in source document.`;
  }

  return {
    metadata: extractedMeta,
    results,
    quality: {
      status: qualityStatus,
      totalExtracted,
      unclassifiedCount,
      missingRangeCount,
      notes: qualityNotes
    }
  };
}

/**
 * High-Precision parser for laboratory result lines (both spaced and unspaced/PDF-collapsed)
 */
export function parseLaboratoryLine(rawLine) {
  let line = rawLine.trim();
  if (!line || line.length < 4) return null;

  // Clean trailing flags (HIGH, LOW, NORMAL, CRITICAL, ABNORMAL, H, L, N, FLAG)
  line = line.replace(/(?:\s+|(?<=[0-9%]))(?:HIGH|LOW|NORMAL|ABNORMAL|CRITICAL|FLAG|H|L|N)(?:\s*\])?\s*$/i, '').trim();
  line = line.replace(/\]\s*$/, '').trim();

  // Find unit in line from COMMON_LAB_UNITS list
  let foundUnit = null;
  let unitIndex = -1;
  for (const u of COMMON_LAB_UNITS) {
    const escaped = escapeRegExp(u);
    const uRegex = new RegExp('(?:\\d|\\s)(' + escaped + ')(?:\\s|\\(|\\d|[<>]|$)', 'i');
    const m = line.match(uRegex);
    if (m) {
      foundUnit = u;
      unitIndex = m.index + (m[0].indexOf(m[1]));
      break;
    }
  }

  if (foundUnit && unitIndex >= 0) {
    const beforeUnit = line.substring(0, unitIndex).trim();
    const afterUnit = line.substring(unitIndex + foundUnit.length).trim();

    // The measured value is the number immediately preceding the unit
    const valMatch = beforeUnit.match(/([-+]?\d+(?:\.\d+)?|negative|non-reactive|normal)\s*$/i);
    if (valMatch) {
      const valueRaw = valMatch[1];
      const rawTestName = beforeUnit.substring(0, valMatch.index).trim().replace(/[:|\-–—=]+\s*$/, '').trim();

      // Extract reference range from afterUnit
      let refRangeRaw = 'Not available';
      const rangeMatch = afterUnit.match(/(?:\(|\s*|[:=]|reference|ref|range)?\s*([<>=]?\s*\d+(?:\.\d+)?\s*(?:-|–|—|to)\s*\d+(?:\.\d+)?|[<>=]\s*\d+(?:\.\d+)?|negative|normal)/i);
      if (rangeMatch) {
        refRangeRaw = rangeMatch[1].trim();
      }

      if (rawTestName.length >= 2) {
        // Match against canonical clinical dictionary if available
        let canonicalName = rawTestName;
        let category = 'General Diagnostic';

        for (const testDef of CLINICAL_TEST_PATTERNS) {
          const matched = testDef.aliases.some(a => {
            const al = a.toLowerCase();
            const rl = rawTestName.toLowerCase();
            return al === rl || rl.startsWith(al) || al.startsWith(rl);
          });
          if (matched) {
            canonicalName = testDef.name;
            category = testDef.category;
            break;
          }
        }

        return {
          test_name: canonicalName,
          category,
          value_raw: valueRaw,
          unit: foundUnit,
          ref_range_raw: refRangeRaw
        };
      }
    }
  }

  return null;
}

/**
 * Extracts metadata (Patient Name, DOB, Dates, Lab Facility)
 */
function extractReportMetadata(lines, rawText) {
  const meta = {
    patientName: 'Not available',
    dateOfBirth: 'Not available',
    reportDate: 'Not available',
    labFacility: 'Not available',
    panelType: 'Diagnostic Lab Panel'
  };

  for (const line of lines) {
    // Patient Name
    if (/patient\s*(?:name)?\s*[:\-]\s*([A-Za-z\s.,]+)/i.test(line)) {
      const m = line.match(/patient\s*(?:name)?\s*[:\-]\s*([A-Za-z\s.,]+)/i);
      if (m && m[1] && m[1].trim().length > 2) meta.patientName = m[1].trim().replace(/,\s*$/, '');
    }
    // DOB
    if (/(?:dob|date of birth|birth date)\s*[:\-]\s*([0-9\/\-\w]+)/i.test(line)) {
      const m = line.match(/(?:dob|date of birth|birth date)\s*[:\-]\s*([0-9\/\-\w]+)/i);
      if (m && m[1]) meta.dateOfBirth = m[1].trim();
    }
    // Report/Collection Date
    if (/(?:collected|date collected|report date|date of report|specimen date|collection date|date)\s*[:\-]\s*([0-9\/\-\w]+)/i.test(line)) {
      const m = line.match(/(?:collected|date collected|report date|date of report|specimen date|collection date|date)\s*[:\-]\s*([0-9\/\-\w]+)/i);
      if (m && m[1] && m[1].length >= 6) meta.reportDate = m[1].trim();
    }
    // Lab Facility
    if (/(?:laboratory|diagnostic center|hospital|clinic|diagnostics|labs?)\s*[:\-]\s*([A-Za-z0-9\s.,]+)/i.test(line)) {
      const m = line.match(/(?:laboratory|diagnostic center|hospital|clinic|diagnostics|labs?)\s*[:\-]\s*([A-Za-z0-9\s.,]+)/i);
      if (m && m[1] && m[1].trim().length > 3) meta.labFacility = m[1].trim();
    }
  }

  // Fallbacks from rawText if not found in lines
  if (meta.reportDate === 'Not available') {
    const dateMatch = rawText.match(/\b(202[0-9]-[0-1][0-9]-[0-3][0-9]|[0-1]?[0-9][\/\-][0-3]?[0-9][\/\-]202[0-9])\b/);
    if (dateMatch) meta.reportDate = dateMatch[1];
  }

  // Panel title deduction
  if (/comprehensive metabolic/i.test(rawText)) meta.panelType = 'Comprehensive Metabolic Panel';
  else if (/lipid profile|lipid panel/i.test(rawText)) meta.panelType = 'Lipid Profile';
  else if (/complete blood count|cbc/i.test(rawText)) meta.panelType = 'Complete Blood Count (CBC)';
  else if (/thyroid/i.test(rawText)) meta.panelType = 'Thyroid Function Panel';
  else if (/renal function/i.test(rawText)) meta.panelType = 'Renal Function Panel';
  else if (/hepatic|liver/i.test(rawText)) meta.panelType = 'Hepatic Function Panel';

  return meta;
}

/**
 * Parses value, unit, and reference range for a matched alias from a text line
 */
function parseTestDetails(line, matchedAlias, matchedPos, testDef) {
  // Find where alias occurs
  const aliasPos = matchedPos >= 0 ? matchedPos : line.toLowerCase().indexOf(matchedAlias.toLowerCase());
  let afterAlias = line.substring(aliasPos + matchedAlias.length).trim();

  // Strip leading secondary parenthetical/bracket abbreviations like (Free T4), (HbA1c), (BUN), (Na), (ALT/SGPT), etc.
  // ONLY if it is not a range or numeric value
  if (/^\s*\([^)]*\)/.test(afterAlias)) {
    const parenContent = afterAlias.match(/^\s*\(([^)]*)\)/)[1].trim();
    // If it is NOT purely a number or range like "(70 - 99)" or "(< 200)"
    if (!/^[<>]?\s*[\d.]+\s*(?:-|–|—|to)\s*[\d.]+$|^[<>]\s*[\d.]+$/.test(parenContent)) {
      afterAlias = afterAlias.replace(/^\s*\([^)]*\)/, '').trim();
    }
  }
  if (/^\s*\[[^\]]*\]/.test(afterAlias)) {
    const bracketContent = afterAlias.match(/^\s*\[([^\]]*)\]/)[1].trim();
    if (!/^[<>]?\s*[\d.]+\s*(?:-|–|—|to)\s*[\d.]+$|^[<>]\s*[\d.]+$/.test(bracketContent)) {
      afterAlias = afterAlias.replace(/^\s*\[[^\]]*\]/, '').trim();
    }
  }

  // Strip leading delimiters
  afterAlias = afterAlias.replace(/^[:|\-–—=]+\s*/, '').trim();

  // 1. Extract reference range printed in the line
  let refRangeRaw = 'Not available';
  let matchedRangeSegment = '';

  // Priority A: Explicit reference label e.g. "Reference Range: 70 - 99 mg/dL" or "Ref: < 200"
  const explicitRangeMatch = afterAlias.match(/(?:reference\s*(?:range|interval)?|ref\s*range|ref|range|interval|normal\s*range)\s*[:=]?\s*(\([^\)]+\)|\[[^\]]+\]|[<>=]?\s*[\d.]+\s*(?:-|–|—|to)\s*[\d.]+|[<>=]\s*[\d.]+|negative|normal)/i);
  if (explicitRangeMatch) {
    matchedRangeSegment = explicitRangeMatch[0];
    let rangeContent = explicitRangeMatch[1].trim().replace(/^[\(\[]/, '').replace(/[\)\]]$/, '').trim();
    refRangeRaw = rangeContent;
  } else {
    // Priority B: Parentheses or brackets containing ranges, e.g. (70 - 99 mg/dL) or (< 200) or (> 60 mL/min)
    const bracketRange = afterAlias.match(/(?:\(|\[)\s*([<>=]?\s*[\d.]+\s*(?:-|–|—|to)\s*[\d.]+|[<>=]\s*[\d.]+|negative|normal)(?:\s*[a-zA-Z\/^0-9%.]+)?\s*(?:\)|\])/i);
    if (bracketRange) {
      matchedRangeSegment = bracketRange[0];
      refRangeRaw = bracketRange[1].trim();
    } else {
      // Priority C: General standalone range pattern at end of line
      const generalRange = afterAlias.match(/(?:<|<=|>|>=)\s*[\d.]+|[\d.]+\s*(?:-|–|—|to)\s*[\d.]+/i);
      if (generalRange) {
        matchedRangeSegment = generalRange[0];
        refRangeRaw = generalRange[0].trim();
      }
    }
  }

  // 2. Extract Unit
  let unit = 'Not available';
  const unitMatch = afterAlias.match(UNITS_REGEX);
  if (unitMatch) {
    unit = unitMatch[0];
  } else if (testDef.defaultUnit) {
    unit = testDef.defaultUnit;
  }

  // 3. Extract measured result value
  // Remove reference range segment from search text so numbers inside range are not mistaken for the value
  let valueSearchText = afterAlias;
  if (matchedRangeSegment) {
    valueSearchText = valueSearchText.replace(matchedRangeSegment, ' ');
  } else if (refRangeRaw !== 'Not available') {
    valueSearchText = valueSearchText.replace(refRangeRaw, ' ');
  }

  // Remove trailing flags or common words
  valueSearchText = valueSearchText.replace(/\b(reference|range|interval|flag|high|low|normal|h|l|crit|units?)\b/gi, ' ').trim();

  let valueRaw = 'Not available';
  // Match the first number or qualitative result in the value portion
  const numMatches = valueSearchText.match(/[-+]?[0-9]*\.?[0-9]+/g);
  if (numMatches && numMatches.length > 0) {
    valueRaw = numMatches[0];
  } else {
    // Check qualitative
    const qualMatch = valueSearchText.match(/\b(negative|non-reactive|nonreactive|normal|nil|absent|positive|reactive)\b/i);
    if (qualMatch) valueRaw = qualMatch[0];
  }

  return {
    valueRaw,
    unit,
    refRangeRaw,
    observation: ''
  };
}

/**
 * Parses generic tabular laboratory lines that may not be in the dictionary
 */
function parseGenericRow(line) {
  // Typical generic line: "Phosphorus, Serum    3.4    mg/dL    2.5 - 4.5    Normal"
  const rangeMatch = line.match(/(?:<|<=|>|>=)\s*[\d.]+|[\d.]+\s*(?:-|–|—|to)\s*[\d.]+/i);
  const unitMatch = line.match(UNITS_REGEX);

  if (!rangeMatch || !unitMatch) return null;

  const refRangeRaw = rangeMatch[0].trim();
  const unit = unitMatch[0].trim();

  // Find parameter name before the numbers
  const firstNumMatch = line.match(/[-+]?[0-9]*\.?[0-9]+/);
  if (!firstNumMatch) return null;

  const testNamePart = line.substring(0, firstNumMatch.index).trim().replace(/[:|\-–]\s*$/, '').trim();
  if (!testNamePart || testNamePart.length < 2 || testNamePart.length > 50) return null;

  // Find value (first number)
  const valueRaw = firstNumMatch[0];

  return {
    test_name: testNamePart,
    category: 'General Diagnostic',
    value_raw: valueRaw,
    unit,
    ref_range_raw: refRangeRaw
  };
}

/**
 * Fallback parser for block-columnar text where tests and values are in separate lines
 */
function parseBlockColumnarFormat(lines, matchedLineIndices, isSample) {
  const results = [];
  // Look for lines that have a test name followed on subsequent line by a value & range
  for (let i = 0; i < lines.length - 1; i++) {
    if (matchedLineIndices.has(i)) continue;
    const l1 = lines[i];
    const l2 = lines[i + 1];

    for (const testDef of CLINICAL_TEST_PATTERNS) {
      const matchedAlias = testDef.aliases.find(a => new RegExp(`^${escapeRegExp(a)}$`, 'i').test(l1.trim()));
      if (matchedAlias) {
        const parsed = parseTestDetails(l2, '', testDef);
        if (parsed && parsed.valueRaw !== 'Not available') {
          const classification = classifyValueAgainstRange(parsed.valueRaw, parsed.refRangeRaw);
          results.push({
            id: `res_${crypto.randomUUID()}`,
            test_name: testDef.name,
            category: testDef.category,
            value_raw: parsed.valueRaw,
            value_numeric: classification.numericValue,
            unit: parsed.unit,
            ref_range_raw: parsed.refRangeRaw,
            ref_min: classification.refMin,
            ref_max: classification.refMax,
            status: classification.status,
            evaluation_reason: classification.reason,
            provenance: isSample ? 'SAMPLE_DATA' : 'AI_EXTRACTED',
            is_verified: 0,
            confidence: 0.90,
            notes: '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          matchedLineIndices.add(i);
          matchedLineIndices.add(i + 1);
        }
      }
    }
  }
  return results;
}

function isMetadataOrHeaderLine(line) {
  const l = line.toLowerCase();
  return (
    l.includes('patient name') ||
    l.includes('date of birth') ||
    l.includes('ordering physician') ||
    l.includes('specimen:') ||
    l.includes('clia id') ||
    l.includes('page ') ||
    l.includes('test name') ||
    l.includes('laboratory results') ||
    l.includes('electronic signature')
  );
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
