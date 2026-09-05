import React from 'react';

export function StatusBadge({ status, showIcon = true }) {
  const s = (status || 'NOT CLASSIFIED').toUpperCase();

  let className = 'badge badge-neutral';
  let icon = '•';
  let label = s;

  if (s === 'NORMAL') {
    className = 'badge badge-normal';
    icon = '✓';
    label = 'Normal';
  } else if (s === 'HIGH') {
    className = 'badge badge-high';
    icon = '▲';
    label = 'High';
  } else if (s === 'LOW') {
    className = 'badge badge-low';
    icon = '▼';
    label = 'Low';
  } else {
    className = 'badge badge-neutral';
    icon = '?';
    label = 'Not Classified';
  }

  return (
    <span className={className} title={status}>
      {showIcon && <span style={{ marginRight: '2px', fontWeight: 'bold' }}>{icon}</span>}
      {label}
    </span>
  );
}

export function ProvenanceBadge({ provenance, isVerified }) {
  if (isVerified || provenance === 'VERIFIED') {
    return (
      <span className="prov-tag prov-verified" title="Clinically Verified by Healthcare Provider">
        <span>🛡️</span> Verified
      </span>
    );
  }

  const p = (provenance || 'AI_EXTRACTED').toUpperCase();

  if (p === 'SAMPLE_DATA') {
    return (
      <span className="prov-tag prov-sample" title="Pre-Packaged Clinical Sample Data">
        <span>🧪</span> Sample Data
      </span>
    );
  }

  if (p === 'USER_EDITED') {
    return (
      <span className="prov-tag prov-edit" title="Modified by Clinical Reviewer">
        <span>✏️</span> User Edited
      </span>
    );
  }

  if (p === 'USER_PROVIDED') {
    return (
      <span className="prov-tag prov-user" title="Directly Provided by User/Staff">
        <span>👤</span> User Provided
      </span>
    );
  }

  return (
    <span className="prov-tag prov-ai" title="Extracted by AI OCR Pipeline (Unverified)">
      <span>✨</span> AI Extracted
    </span>
  );
}

export function RangeIndicatorBar({ value, min, max, status }) {
  if (value === null || value === undefined || isNaN(value)) {
    return <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>—</span>;
  }

  // If min and max both exist
  if (min !== null && max !== null && min < max) {
    const rangeSpan = max - min;
    const padding = rangeSpan * 0.4;
    const chartMin = Math.max(0, min - padding);
    const chartMax = max + padding;
    const totalSpan = chartMax - chartMin;

    const normalLeftPct = ((min - chartMin) / totalSpan) * 100;
    const normalWidthPct = ((max - min) / totalSpan) * 100;

    let pinPct = ((value - chartMin) / totalSpan) * 100;
    pinPct = Math.max(3, Math.min(97, pinPct));

    let pinClass = 'pin-normal';
    if (status === 'HIGH') pinClass = 'pin-high';
    if (status === 'LOW') pinClass = 'pin-low';

    return (
      <div className="range-bar-wrapper" title={`Value: ${value} | Range: ${min} - ${max}`}>
        <div className="range-bar-track">
          <div
            className="range-bar-normal-zone"
            style={{ left: `${normalLeftPct}%`, width: `${normalWidthPct}%` }}
          />
          <div
            className={`range-bar-pin ${pinClass}`}
            style={{ left: `${pinPct}%` }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
          <span>{min}</span>
          <span>{max}</span>
        </div>
      </div>
    );
  }

  // Upper bounded only (< max)
  if (max !== null && min === null) {
    const chartMax = max * 1.5;
    let pinPct = (value / chartMax) * 100;
    pinPct = Math.max(3, Math.min(97, pinPct));
    const normalWidthPct = (max / chartMax) * 100;

    const pinClass = status === 'HIGH' ? 'pin-high' : 'pin-normal';

    return (
      <div className="range-bar-wrapper" title={`Value: ${value} | Upper Limit: < ${max}`}>
        <div className="range-bar-track">
          <div
            className="range-bar-normal-zone"
            style={{ left: '0%', width: `${normalWidthPct}%` }}
          />
          <div
            className={`range-bar-pin ${pinClass}`}
            style={{ left: `${pinPct}%` }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
          <span>0</span>
          <span>&lt; {max}</span>
        </div>
      </div>
    );
  }

  // Lower bounded only (> min)
  if (min !== null && max === null) {
    const chartMax = min * 2.0;
    let pinPct = (value / chartMax) * 100;
    pinPct = Math.max(3, Math.min(97, pinPct));
    const normalLeftPct = (min / chartMax) * 100;

    const pinClass = status === 'LOW' ? 'pin-low' : 'pin-normal';

    return (
      <div className="range-bar-wrapper" title={`Value: ${value} | Lower Limit: > ${min}`}>
        <div className="range-bar-track">
          <div
            className="range-bar-normal-zone"
            style={{ left: `${normalLeftPct}%`, width: `${100 - normalLeftPct}%` }}
          />
          <div
            className={`range-bar-pin ${pinClass}`}
            style={{ left: `${pinPct}%` }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
          <span>&gt; {min}</span>
          <span>—</span>
        </div>
      </div>
    );
  }

  return <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Non-numeric range</span>;
}
