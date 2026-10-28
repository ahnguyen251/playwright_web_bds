/**
 * HTTP requests only.
 * No DOM rendering.
 */

const API_BASE = '/api';

async function fetchJSON(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json();
  
  if (!response.ok) {
    const error = new Error(data?.error?.message || 'Lỗi API không xác định');
    error.code = data?.error?.code || 'UNKNOWN_ERROR';
    error.status = response.status;
    throw error;
  }
  
  return data;
}

export const api = {
  getSummary: (options) => fetchJSON(`${API_BASE}/dashboard/summary`, options),
  
  getModules: (options) => fetchJSON(`${API_BASE}/test-cases/modules`, options),

  getTestCases: (page = 1, pageSize = 20, filters = {}, options = {}) => {
    const params = new URLSearchParams({ page, pageSize });
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    return fetchJSON(`${API_BASE}/test-cases?${params.toString()}`, options);
  },

  getTestCaseById: (testCaseId, options) => fetchJSON(`${API_BASE}/test-cases/${testCaseId}`, options),

  getTestCaseAnalytics: (testCaseId, options) => fetchJSON(`${API_BASE}/test-cases/${testCaseId}/analytics`, options),

  getTestCaseResults: (testCaseId, page = 1, pageSize = 20, filters = {}, options = {}) => {
    const params = new URLSearchParams({ page, pageSize });
    if (typeof filters === 'string') {
      if (filters) params.append('status', filters);
    } else if (filters && typeof filters === 'object') {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.set(key, value);
        }
      });
    }
    return fetchJSON(`${API_BASE}/test-cases/${testCaseId}/results?${params.toString()}`, options);
  },
  
  getRuns: (page = 1, pageSize = 20, filters = {}, options = {}) => {
    const params = new URLSearchParams({ page, pageSize });
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, value);
      }
    });
    return fetchJSON(`${API_BASE}/runs?${params.toString()}`, options);
  },

  getRunById: (runId, options) => fetchJSON(`${API_BASE}/runs/${runId}`, options),

  getRunResults: (runId, page = 1, pageSize = 20, status = '', options) => {
    const params = new URLSearchParams({ page, pageSize });
    if (status) params.append('status', status);
    return fetchJSON(`${API_BASE}/runs/${runId}/results?${params.toString()}`, options);
  },

  getResultById: (resultId, options) => fetchJSON(`${API_BASE}/results/${resultId}`, options),
  
  getResultEvidence: (resultId, options) => fetchJSON(`${API_BASE}/results/${resultId}/evidence`, options),

  runTestCase: (testCaseId, data = {}, options = {}) => {
    const { headers = {}, ...restOptions } = options;
    return fetchJSON(`${API_BASE}/test-cases/${encodeURIComponent(testCaseId)}/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(data),
      ...restOptions,
    });
  },
};
