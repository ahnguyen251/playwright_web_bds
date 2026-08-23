/**
 * HTTP requests only.
 * No DOM rendering.
 */

const API_BASE = '/api';

async function fetchJSON(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json();
  
  if (!response.ok) {
    const error = new Error(data?.error?.message || 'Unknown API error');
    error.code = data?.error?.code || 'UNKNOWN_ERROR';
    error.status = response.status;
    throw error;
  }
  
  return data;
}

export const api = {
  getSummary: (options) => fetchJSON(`${API_BASE}/dashboard/summary`, options),
  
  getTestCases: (page = 1, pageSize = 20, search = '', options) => {
    const params = new URLSearchParams({ page, pageSize });
    if (search) params.append('search', search);
    return fetchJSON(`${API_BASE}/test-cases?${params.toString()}`, options);
  },

  getTestCaseById: (testCaseId, options) => fetchJSON(`${API_BASE}/test-cases/${testCaseId}`, options),

  getTestCaseAnalytics: (testCaseId, options) => fetchJSON(`${API_BASE}/test-cases/${testCaseId}/analytics`, options),

  getTestCaseResults: (testCaseId, page = 1, pageSize = 20, status = '', options) => {
    const params = new URLSearchParams({ page, pageSize });
    if (status) params.append('status', status);
    return fetchJSON(`${API_BASE}/test-cases/${testCaseId}/results?${params.toString()}`, options);
  },
  
  getRuns: (page = 1, pageSize = 20, options) => {
    const params = new URLSearchParams({ page, pageSize });
    return fetchJSON(`${API_BASE}/runs?${params.toString()}`, options);
  },

  getRunById: (runId, options) => fetchJSON(`${API_BASE}/runs/${runId}`, options),

  getRunResults: (runId, page = 1, pageSize = 20, status = '', options) => {
    const params = new URLSearchParams({ page, pageSize });
    if (status) params.append('status', status);
    return fetchJSON(`${API_BASE}/runs/${runId}/results?${params.toString()}`, options);
  },

  getResultById: (resultId, options) => fetchJSON(`${API_BASE}/results/${resultId}`, options),
  
  getResultEvidence: (resultId, options) => fetchJSON(`${API_BASE}/results/${resultId}/evidence`, options)
};
