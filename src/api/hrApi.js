const API_BASE_URL = 'https://kushalyouth.com/api/api.php';
const buildUrl = (endpoint) => {
  const clean = String(endpoint || '').replace(/^\/+/, '');
  return `${API_BASE_URL}?endpoint=${clean}`;
};

const apiCall = async (endpoint, method = 'GET', data = null) => {
  const url = buildUrl(endpoint);

  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  };

  if (data !== null && data !== undefined) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);

    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');

    let payload = null;
    if (isJson) {
      payload = await response.json();
    } else {
      const text = await response.text();
      payload = text
        ? { success: false, error: text }
        : { success: false, error: `HTTP ${response.status}` };
    }

    if (!response.ok) {
      return {
        success: false,
        error: payload?.error || payload?.message || `HTTP ${response.status}`,
        status: response.status,
      };
    }

    return payload;
  } catch (error) {
    return {
      success: false,
      error: error?.message || 'Network error',
    };
  }
};

const withQuery = (endpoint, params = {}) => {
  const queryParams = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

  return `${endpoint}${queryParams ? `?${queryParams}` : ''}`;
};

export const getEmployees = () => apiCall('employees');
export const getEmployeeByCode = (code) => apiCall(`employees/${encodeURIComponent(code)}`);
export const addEmployee = (data) => apiCall('employees', 'POST', data);
export const updateEmployee = (id, data) => apiCall(`employees/${encodeURIComponent(id)}`, 'PUT', data);
export const deleteEmployee = (id) => apiCall(`employees/${encodeURIComponent(id)}`, 'DELETE');
export const bulkImportEmployees = (data) => apiCall('employees/bulk-import', 'POST', data);

export const getHalls = () => apiCall('halls');
export const addHall = (data) => apiCall('halls', 'POST', data);
export const updateHall = (id, data) => apiCall(`halls/${encodeURIComponent(id)}`, 'PUT', data);
export const deleteHall = (id) => apiCall(`halls/${encodeURIComponent(id)}`, 'DELETE');

export const getEntries = (params = {}) => apiCall(withQuery('entries', params));
export const getEntryCount = () => apiCall('entries/count');
export const getEntriesByDate = (date) => apiCall(withQuery('entries', { date }));
export const addEntry = (data) => apiCall('entries', 'POST', data);
export const deleteEntry = (id) => apiCall(`entries/${encodeURIComponent(id)}`, 'DELETE');
export const deleteAllEntries = () => apiCall('entries/all', 'DELETE');

export const getLogs = (params = {}) => apiCall(withQuery('logs', params));
export const addLog = (data) => apiCall('logs', 'POST', data);

export const getAttendance = (code) => apiCall(`attendance/${encodeURIComponent(code)}`);
export const getAllAttendance = () => apiCall('attendance');

export default {
  getEmployees,
  getEmployeeByCode,
  addEmployee,
  updateEmployee,
  deleteEmployee,
  bulkImportEmployees,
  getHalls,
  addHall,
  updateHall,
  deleteHall,
  getEntries,
  getEntryCount,
  getEntriesByDate,
  addEntry,
  deleteEntry,
  deleteAllEntries,
  getLogs,
  addLog,
  getAttendance,
  getAllAttendance,
};