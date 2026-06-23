const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://kushalyouth.com/api/api.php";

const AUTH_BASE_URL =
  import.meta.env.VITE_AUTH_BASE_URL || "https://kushalyouth.com/api/auth.php";

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

const request = async (url, method = "GET", data = null, extraHeaders = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

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
    const contentType = response.headers.get("content-type") || "";

    const payload = contentType.includes("application/json")
      ? await response.json().catch(() => null)
      : { success: false, error: (await response.text()) || `HTTP ${response.status}` };

    if (!response.ok) {
      return {
        success: false,
        error: payload?.error || payload?.message || `HTTP ${response.status}`,
        status: response.status,
        data: payload?.data ?? null,
      };
    }

    return payload ?? { success: true, data: null };
  } catch (error) {
    return error?.name === "AbortError"
      ? { success: false, error: "Request timeout", status: 408 }
      : { success: false, error: error?.message || "Network error" };
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

export const getEmployees = () => apiCall("employees");
export const getEmployeeByCode = (code) => apiCall(`employees/${encodeURIComponent(code)}`);
export const addEmployee = (data) => apiCall("employees", "POST", data);
export const updateEmployee = (id, data) => apiCall(`employees/${encodeURIComponent(id)}`, "PUT", data);
export const deleteEmployee = (id) => apiCall(`employees/${encodeURIComponent(id)}`, "DELETE");
export const bulkImportEmployees = (data) => apiCall("employees/bulk-import", "POST", data);

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

export const login = (username, password) =>
  authCall("login", "POST", { username, password });

export const me = () => authCall("me", "GET");
export const logout = () => authCall("logout", "POST");

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
  login,
  me,
  logout,
};