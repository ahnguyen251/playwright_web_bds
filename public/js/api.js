/**
 * HTTP requests only.
 * No DOM rendering.
 */

const API_BASE = '/api';

async function fetchJSON(url) {
  const response = await fetch(url);
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
  getSummary: () => fetchJSON(`${API_BASE}/dashboard/summary`),
  
  getTestCases: (page = 1, pageSize = 20, search = '') => {
    const params = new URLSearchParams({ page, pageSize });
    if (search) params.append('search', search);
    return fetchJSON(`${API_BASE}/test-cases?${params.toString()}`);
  },
  
  getRuns: (page = 1, pageSize = 20) => {
    const params = new URLSearchParams({ page, pageSize });
    return fetchJSON(`${API_BASE}/runs?${params.toString()}`);
  },

  getRunById: (runId) => fetchJSON(`${API_BASE}/runs/${runId}`),

  getRunResults: (runId, page = 1, pageSize = 20, status = '') => {
    const params = new URLSearchParams({ page, pageSize });
    if (status) params.append('status', status);
    return fetchJSON(`${API_BASE}/runs/${runId}/results?${params.toString()}`);
  },

  getResultById: (resultId) => fetchJSON(`${API_BASE}/results/${resultId}`),
  
  getResultEvidence: (resultId) => fetchJSON(`${API_BASE}/results/${resultId}/evidence`)
};
