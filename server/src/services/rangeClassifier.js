/**
 * Deterministic Reference Range Classifier
 * Evaluates test values strictly against the laboratory reference ranges printed in the uploaded report.
 * Does NOT generate diagnoses or medical assumptions.
 * Never invents or assumes missing reference ranges.
 */

export function parseReferenceRange(rangeStr) {
  if (!rangeStr || typeof rangeStr !== 'string' || rangeStr === 'Not available') {
    return { min: null, max: null, isParsed: false, qualitativeTarget: null };
  }

  const clean = rangeStr.trim().replace(/,/g, '').replace(/[()[\]]/g, '');

  // Case 1: "min - max" or "min – max" or "min to max" e.g., "70.0 - 99.0", "13.5 - 17.5", "0.40 - 4.50", "70-99"
  const rangeMatch = clean.match(/^([\d.]+)\s*(?:-|–|—|to)\s*([\d.]+)$/i);
  if (rangeMatch) {
    const min = parseFloat(rangeMatch[1]);
    const max = parseFloat(rangeMatch[2]);
    if (!isNaN(min) && !isNaN(max)) {
      return { min, max, isParsed: true, qualitativeTarget: null };
    }
  }

  // Case 2: "< max" or "<= max" or "Less than max" or "Up to max" e.g., "< 200", "< 100", "<= 150", "<200"
  const lessMatch = clean.match(/^(?:<|<=|less than|up to|below)\s*([\d.]+)/i);
  if (lessMatch) {
    const max = parseFloat(lessMatch[1]);
    if (!isNaN(max)) {
      return { min: null, max, isParsed: true, qualitativeTarget: null };
    }
  }

  // Case 3: "> min" or ">= min" or "Greater than min" e.g., "> 60", ">= 45", ">60"
  const greaterMatch = clean.match(/^(?:>|>=|greater than|above)\s*([\d.]+)/i);
  if (greaterMatch) {
    const min = parseFloat(greaterMatch[1]);
    if (!isNaN(min)) {
      return { min, max: null, isParsed: true, qualitativeTarget: null };
    }
  }

  // Case 4: Embedded range in string e.g. "Ref: 70 - 99", "Normal: < 200", "0.5-1.1 mg/dL"
  const embeddedMatch = clean.match(/([\d.]+)\s*(?:-|–|—|to)\s*([\d.]+)/i);
  if (embeddedMatch) {
    const min = parseFloat(embeddedMatch[1]);
    const max = parseFloat(embeddedMatch[2]);
    if (!isNaN(min) && !isNaN(max)) {
      return { min, max, isParsed: true, qualitativeTarget: null };
    }
  }

  // Case 5: Qualitative "Negative", "Non-Reactive", "Normal"
  if (/(negative|non-reactive|nonreactive|normal|nil|absent)/i.test(clean)) {
    return { qualitativeTarget: 'negative', isParsed: true, min: null, max: null };
  }

  return { min: null, max: null, isParsed: false, qualitativeTarget: null };
}

export function classifyValueAgainstRange(valueRaw, rangeStr) {
  if (valueRaw === null || valueRaw === undefined || valueRaw === '' || valueRaw === 'Not available') {
    return {
      status: 'NOT CLASSIFIED',
      numericValue: null,
      refMin: null,
      refMax: null,
      reason: 'No test value available for numerical evaluation.'
    };
  }

  // Clean value string to extract numeric portion
  const cleanVal = String(valueRaw).trim();
  const numericMatch = cleanVal.match(/[-+]?[0-9]*\.?[0-9]+/);
  const numericValue = numericMatch ? parseFloat(numericMatch[0]) : null;

  const parsedRange = parseReferenceRange(rangeStr);

  if (!parsedRange.isParsed) {
    return {
      status: 'NOT CLASSIFIED',
      numericValue,
      refMin: null,
      refMax: null,
      reason: 'No standard numerical reference range was printed in the report for this parameter.'
    };
  }

  // Qualitative check
  if (parsedRange.qualitativeTarget) {
    const isNormal = /(negative|non-reactive|nonreactive|normal|nil|absent)/i.test(cleanVal);
    return {
      status: isNormal ? 'NORMAL' : 'HIGH',
      numericValue: null,
      refMin: null,
      refMax: null,
      reason: isNormal
        ? `Qualitative result matches normal baseline (${rangeStr}).`
        : `Qualitative result deviates from normal baseline (${rangeStr}).`
    };
  }

  if (numericValue === null || isNaN(numericValue)) {
    return {
      status: 'NOT CLASSIFIED',
      numericValue: null,
      refMin: parsedRange.min,
      refMax: parsedRange.max,
      reason: 'Parameter value is non-numeric; cannot be evaluated against quantitative limits.'
    };
  }

  const { min, max } = parsedRange;

  // Range with both min and max (e.g. 70 - 99)
  if (min !== null && max !== null) {
    if (numericValue < min) {
      return {
        status: 'LOW',
        numericValue,
        refMin: min,
        refMax: max,
        reason: `Value (${numericValue}) is below the lower reference limit of ${min} printed on report.`
      };
    }
    if (numericValue > max) {
      return {
        status: 'HIGH',
        numericValue,
        refMin: min,
        refMax: max,
        reason: `Value (${numericValue}) exceeds the upper reference limit of ${max} printed on report.`
      };
    }
    return {
      status: 'NORMAL',
      numericValue,
      refMin: min,
      refMax: max,
      reason: `Value (${numericValue}) falls within the printed laboratory reference interval (${min} - ${max}).`
    };
  }

  // Upper-bounded only (e.g. "< 200")
  if (max !== null && min === null) {
    if (numericValue > max) {
      return {
        status: 'HIGH',
        numericValue,
        refMin: null,
        refMax: max,
        reason: `Value (${numericValue}) exceeds the desirable upper threshold (< ${max}) on report.`
      };
    }
    return {
      status: 'NORMAL',
      numericValue,
      refMin: null,
      refMax: max,
      reason: `Value (${numericValue}) is within the desirable upper limit (< ${max}) on report.`
    };
  }

  // Lower-bounded only (e.g. "> 60")
  if (min !== null && max === null) {
    if (numericValue < min) {
      return {
        status: 'LOW',
        numericValue,
        refMin: min,
        refMax: null,
        reason: `Value (${numericValue}) is below the minimum threshold (> ${min}) on report.`
      };
    }
    return {
      status: 'NORMAL',
      numericValue,
      refMin: min,
      refMax: null,
      reason: `Value (${numericValue}) meets the minimum threshold requirement (> ${min}) on report.`
    };
  }

  return {
    status: 'NOT CLASSIFIED',
    numericValue,
    refMin: null,
    refMax: null,
    reason: 'Insufficient reference parameters to perform deterministic classification.'
  };
}
