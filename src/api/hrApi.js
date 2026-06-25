const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://kushalyouth.com/api/api.php";

const AUTH_BASE_URL =
  import.meta.env.VITE_AUTH_BASE_URL || "https://kushalyouth.com/api/auth.php";

const DEFAULT_TIMEOUT_MS = 30000;

const getAuthHeaders = () => {
  const token = localStorage.getItem("hr_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const buildUrl = (baseUrl, params = {}) => {
  const url = new URL(baseUrl);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });
  return url;
};

const parseJsonSafe = async (response) => {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const text = await response.text().catch(() => "");
    return { success: false, error: text || `HTTP ${response.status}` };
  }

  try {
    return await response.json();
  } catch {
    return { success: false, error: `Invalid JSON response (${response.status})` };
  }
};

const request = async (url, method = "GET", data = null, extraHeaders = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  const options = {
    method,
    signal: controller.signal,
    headers: {
      Accept: "application/json",
      ...getAuthHeaders(),
      ...extraHeaders,
    },
  };

  if (data !== null && data !== undefined && method !== "GET") {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url.toString(), options);
    const payload = await parseJsonSafe(response);

    if (!response.ok) {
      return {
        success: false,
        error: payload?.error || payload?.message || `HTTP ${response.status}`,
        status: response.status,
        data: payload?.data ?? null,
      };
    }

    if (payload && typeof payload === "object") return payload;
    return { success: true, data: null };
  } catch (error) {
    if (error?.name === "AbortError") {
      return { success: false, error: "Request timeout", status: 408 };
    }

    return {
      success: false,
      error: error?.message || "Network error",
      status: 0,
    };
  } finally {
    clearTimeout(timeoutId);
  }
};

const apiCall = async (endpoint, method = "GET", data = null, params = {}) => {
  const url = buildUrl(API_BASE_URL, { endpoint, ...params });
  return request(url, method, data);
};

const authCall = async (action, method = "GET", data = null) => {
  const url = buildUrl(AUTH_BASE_URL, { action });
  return request(url, method, data);
};

const normalizeEmployeePayload = (data = {}) => ({
  code: String(data.code || "").trim(),
  name: String(data.name || "").trim(),
  designation: String(data.designation || "").trim(),
  week_off: String(data.week_off || data.weekOff || "Sunday").trim(),
  shift: String(data.shift || "A").trim(),
  hall_id: String(data.hall_id || data.hallId || "").trim(),
  hall_name: String(data.hall_name || data.hallName || "").trim(),
});

const normalizeRosterPayload = (data = {}) => ({
  week_key: String(data.week_key || data.weekKey || "").trim(),
  week_start: String(data.week_start || data.weekStart || "").trim(),
  week_end: String(data.week_end || data.weekEnd || "").trim(),
  code: String(data.code || "").trim(),
  name: String(data.name || "").trim(),
  designation: String(data.designation || "").trim(),
  week_off: String(data.week_off || data.weekOff || "Sunday").trim(),
  shift: String(data.shift || "A").trim(),
  hall_id: String(data.hall_id || data.hallId || "").trim(),
  hall_name: String(data.hall_name || data.hallName || "").trim(),
});

export const getEmployees = () => apiCall("employees");
export const getEmployeeByCode = (code) => apiCall(`employees/${encodeURIComponent(code)}`);
export const addEmployee = (data) => apiCall("employees", "POST", normalizeEmployeePayload(data));
export const updateEmployee = (id, data) => apiCall(`employees/${encodeURIComponent(id)}`, "PUT", normalizeEmployeePayload(data));
export const deleteEmployee = (id) => apiCall(`employees/${encodeURIComponent(id)}`, "DELETE");
export const bulkImportEmployees = (data) =>
  apiCall("employees/bulk-import", "POST", {
    employees: Array.isArray(data?.employees) ? data.employees.map(normalizeEmployeePayload) : [],
  });

export const getRoster = (weekKey, hallId = "") =>
  apiCall("roster", "GET", null, { week_key: weekKey, hall_id: hallId });

export const addRosterRow = (data) => apiCall("roster", "POST", { employees: [normalizeRosterPayload(data)] });
export const updateRosterRow = (id, data) => apiCall(`roster/${encodeURIComponent(id)}`, "PUT", normalizeRosterPayload(data));
export const deleteRosterRow = (id) => apiCall(`roster/${encodeURIComponent(id)}`, "DELETE");

export const bulkImportRoster = (data) => {
  const employees = Array.isArray(data?.employees)
    ? data.employees.map(normalizeRosterPayload).filter((r) => r.code && r.name)
    : [];

  return apiCall("roster", "POST", {
    week_key: String(data?.week_key || data?.weekKey || "").trim(),
    week_start: String(data?.week_start || data?.weekStart || "").trim(),
    week_end: String(data?.week_end || data?.weekEnd || "").trim(),
    employees,
  });
};

export const importRosterFromWeek = (data) =>
  apiCall("roster/import-prev", "POST", {
    week_key: String(data?.week_key || data?.weekKey || "").trim(),
    source_week_key: String(data?.source_week_key || data?.sourceWeekKey || "").trim(),
  });

export const getHalls = () => apiCall("halls");
export const addHall = (data) => apiCall("halls", "POST", data);
export const updateHall = (id, data) => apiCall(`halls/${encodeURIComponent(id)}`, "PUT", data);
export const deleteHall = (id) => apiCall(`halls/${encodeURIComponent(id)}`, "DELETE");

export const getEntries = (params = {}) => apiCall("entries", "GET", null, params);
export const getEntryCount = () => apiCall("entries/count");
export const getEntriesByDate = (date) => apiCall("entries", "GET", null, { date });
export const addEntry = (data) => apiCall("entries", "POST", data);
export const deleteEntry = (id) => apiCall(`entries/${encodeURIComponent(id)}`, "DELETE");
export const deleteAllEntries = () => apiCall("entries/all", "DELETE");

export const getLogs = (params = {}) => apiCall("logs", "GET", null, params);
export const addLog = (data) => apiCall("logs", "POST", data);

export const getAttendance = (code) => apiCall(`attendance/${encodeURIComponent(code)}`);
export const getAllAttendance = () => apiCall("attendance");

export const login = (username, password) => authCall("login", "POST", { username, password });
export const me = () => authCall("me", "GET");
export const logout = () => authCall("logout", "POST");

export default {
  getEmployees,
  getEmployeeByCode,
  addEmployee,
  updateEmployee,
  deleteEmployee,
  bulkImportEmployees,
  getRoster,
  addRosterRow,
  updateRosterRow,
  deleteRosterRow,
  bulkImportRoster,
  importRosterFromWeek,
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
  login,
  me,
  logout,
};