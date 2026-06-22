const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://kushalyouth.com/api/api.php";

const AUTH_BASE_URL =
  import.meta.env.VITE_AUTH_BASE_URL || "https://kushalyouth.com/api/auth.php";

const getAuthHeaders = () => {
  const token = localStorage.getItem("hr_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const apiCall = async (baseUrl, endpoint, method = "GET", data = null, params = {}) => {
  const url = new URL(baseUrl);
  url.searchParams.set("endpoint", String(endpoint || "").replace(/^\/+/, ""));

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  const options = {
    method,
    signal: controller.signal,
    headers: {
      Accept: "application/json",
      ...getAuthHeaders(),
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

const authCall = async (action, method = "GET", data = null) => {
  const url = new URL(AUTH_BASE_URL);
  url.searchParams.set("action", action);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  const options = {
    method,
    signal: controller.signal,
    headers: {
      Accept: "application/json",
      ...getAuthHeaders(),
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

const withQuery = (endpoint, params = {}) => {
  const queryParams = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
  return `${endpoint}${queryParams ? `?${queryParams}` : ""}`;
};

export const getEmployees = () => apiCall(API_BASE_URL, "employees");
export const getEmployeeByCode = (code) => apiCall(API_BASE_URL, `employees/${encodeURIComponent(code)}`);
export const addEmployee = (data) => apiCall(API_BASE_URL, "employees", "POST", data);
export const updateEmployee = (id, data) => apiCall(API_BASE_URL, `employees/${encodeURIComponent(id)}`, "PUT", data);
export const deleteEmployee = (id) => apiCall(API_BASE_URL, `employees/${encodeURIComponent(id)}`, "DELETE");
export const bulkImportEmployees = (data) => apiCall(API_BASE_URL, "employees/bulk-import", "POST", data);

export const getHalls = () => apiCall(API_BASE_URL, "halls");
export const addHall = (data) => apiCall(API_BASE_URL, "halls", "POST", data);
export const updateHall = (id, data) => apiCall(API_BASE_URL, `halls/${encodeURIComponent(id)}`, "PUT", data);
export const deleteHall = (id) => apiCall(API_BASE_URL, `halls/${encodeURIComponent(id)}`, "DELETE");

export const getEntries = (params = {}) => apiCall(API_BASE_URL, withQuery("entries", params));
export const getEntryCount = () => apiCall(API_BASE_URL, "entries/count");
export const getEntriesByDate = (date) => apiCall(API_BASE_URL, withQuery("entries", { date }));
export const addEntry = (data) => apiCall(API_BASE_URL, "entries", "POST", data);
export const deleteEntry = (id) => apiCall(API_BASE_URL, `entries/${encodeURIComponent(id)}`, "DELETE");
export const deleteAllEntries = () => apiCall(API_BASE_URL, "entries/all", "DELETE");

export const getLogs = (params = {}) => apiCall(API_BASE_URL, withQuery("logs", params));
export const addLog = (data) => apiCall(API_BASE_URL, "logs", "POST", data);

export const getAttendance = (code) => apiCall(API_BASE_URL, `attendance/${encodeURIComponent(code)}`);
export const getAllAttendance = () => apiCall(API_BASE_URL, "attendance");

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