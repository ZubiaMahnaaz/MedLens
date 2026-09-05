const API_BASE = '/api';

export async function fetchJson(url, options = {}) {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `HTTP error ${res.status}`);
  }
  return data;
}

export const api = {
  // Auth
  getCurrentUser: () => fetchJson('/auth/current'),
  getUsers: () => fetchJson('/auth/users'),
  loginUser: (userId) => fetchJson('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ userId })
  }),

  // Patients
  getPatients: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchJson(`/patients${query ? `?${query}` : ''}`);
  },
  getPatient: (id) => fetchJson(`/patients/${id}`),
  createPatient: (patientData) => fetchJson('/patients', {
    method: 'POST',
    body: JSON.stringify(patientData)
  }),
  updatePatient: (id, patientData) => fetchJson(`/patients/${id}`, {
    method: 'PUT',
    body: JSON.stringify(patientData)
  }),
  deletePatient: (id) => fetchJson(`/patients/${id}`, {
    method: 'DELETE'
  }),

  // Reports
  getReports: (patientId) => fetchJson(`/reports${patientId ? `?patientId=${patientId}` : ''}`),
  getReport: (id) => fetchJson(`/reports/${id}`),
  uploadReport: async (formData) => {
    // Note: for multipart/form-data, do not set Content-Type header so browser sets boundary
    const res = await fetch(`${API_BASE}/reports/upload`, {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    return data;
  },
  uploadSampleReport: (payload) => fetchJson('/reports/upload', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  deleteReport: (id) => fetchJson(`/reports/${id}`, {
    method: 'DELETE'
  }),

  // Test Results
  getResults: (reportId) => fetchJson(`/results/report/${reportId}`),
  updateResult: (id, resultData) => fetchJson(`/results/${id}`, {
    method: 'PUT',
    body: JSON.stringify(resultData)
  }),
  addResult: (reportId, resultData) => fetchJson(`/results/report/${reportId}/add`, {
    method: 'POST',
    body: JSON.stringify(resultData)
  }),
  deleteResult: (id) => fetchJson(`/results/${id}`, {
    method: 'DELETE'
  }),
  verifyAllResults: (reportId) => fetchJson(`/results/report/${reportId}/verify-all`, {
    method: 'POST'
  }),

  // AI Summaries
  getSummary: (reportId) => fetchJson(`/summaries/report/${reportId}`),
  generateSummary: (reportId) => fetchJson('/summaries/generate', {
    method: 'POST',
    body: JSON.stringify({ reportId })
  }),
  updateSummary: (id, summary_text) => fetchJson(`/summaries/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ summary_text })
  }),

  // Longitudinal Comparison
  compareReports: (patientId, report1Id, report2Id) =>
    fetchJson(`/compare?patientId=${patientId}&report1Id=${report1Id}&report2Id=${report2Id}`),

  // Conflicts
  getConflicts: (reportId) => fetchJson(`/conflicts/report/${reportId}`),
  resolveConflict: (reportId, conflictId, resolutionNote, resolutionAction) => fetchJson('/conflicts/resolve', {
    method: 'POST',
    body: JSON.stringify({ reportId, conflictId, resolutionNote, resolutionAction })
  }),

  // Audit Timeline
  getTimeline: (patientId) => fetchJson(`/timeline/patient/${patientId}`),

  // Samples Library
  getSamples: () => fetchJson('/samples'),
  getSampleContent: (sampleId) => fetchJson(`/samples/${sampleId}/content`)
};
