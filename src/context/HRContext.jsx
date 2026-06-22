import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import { DEFAULT_EMPLOYEES, DEFAULT_HALLS, SHIFT_OPTIONS, DAYS } from "../data/defaultData";
import hrApi from "../api/hrApi";

const HRContext = createContext(null);
const STORAGE_KEY = "demo_hr_system_v6";

const todayISO = () => new Date().toISOString().slice(0, 10);
const dateKey = (v) => String(v || "").slice(0, 10);
const dayName = (dateStr) => new Date(dateStr).toLocaleDateString("en-US", { weekday: "long" });

const normalizeEmployee = (e, fallbackHall = null) => ({
  id: e.id ?? e.code,
  name: e.name || "",
  code: String(e.code || "").trim(),
  designation: e.designation || "",
  weekOff: e.week_off || e.weekOff || "Sunday",
  shift: e.shift || "A",
  hallId: e.hall_id || e.hallId || fallbackHall?.id || "",
  hallName: e.hall_name || e.hallName || fallbackHall?.name || "",
});

const normalizeHall = (h) => ({
  id: h.id,
  name: h.name || "",
  capacity: Number(h.capacity || 0),
  color: h.color || "blue",
});

const normalizeEntry = (e) => ({
  ...e,
  id: e.id,
  code: String(e.code || "").trim(),
  name: e.name || "",
  designation: e.designation || "",
  weekOff: e.week_off || e.weekOff || "Sunday",
  shift: e.shift || "A",
  hallId: e.hall_id || e.hallId || "",
  hallName: e.hall_name || e.hallName || `Hall ${e.hall_id || e.hallId || "?"}`,
  source: e.source || "SCAN",
  hrCode: e.hr_code || e.hrCode || "",
  hrAction: e.hr_action || e.hrAction || "",
  overrideReason: e.override_reason || e.overrideReason || "",
  date: e.date || "",
  time: e.time || "",
  day: e.day || "",
});

const makeLogRow = (type, message, extra = {}) => ({
  id: extra.id || Date.now() + Math.random(),
  type,
  message,
  by: extra.by || "",
  employeeCode: extra.employeeCode || "",
  hallId: extra.hallId || "",
  hallName: extra.hallName || "",
  overrideReason: extra.overrideReason || "",
  at: extra.at || new Date().toISOString(),
});

const createInitialState = () => ({
  selectedDate: todayISO(),
  currentUser: null,
  currentRole: "GUEST",
  currentHrCode: "",
  halls: DEFAULT_HALLS.map(normalizeHall),
  employees: DEFAULT_EMPLOYEES.map((e) => normalizeEmployee(e, DEFAULT_HALLS[0])),
  entries: [],
  logs: [],
  attendanceTracker: [],
});

const safeParse = (value, fallback) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

export function HRProvider({ children }) {
  const [state, setState] = useState(() => {
    if (typeof window === "undefined") return createInitialState();
    const saved = safeParse(localStorage.getItem(STORAGE_KEY), null);
    return saved ? { ...createInitialState(), ...saved } : createInitialState();
  });

  const updateState = useCallback((updater) => {
    setState((prev) => (typeof updater === "function" ? updater(prev) : updater));
  }, []);

  const fetchAllDataFromAPI = useCallback(async () => {
    try {
      const [employeesRes, hallsRes, entriesRes, logsRes, trackerRes] = await Promise.all([
        hrApi.getEmployees(),
        hrApi.getHalls(),
        hrApi.getEntries(),
        hrApi.getLogs(),
        hrApi.getAllAttendance(),
      ]);

      setState((prev) => {
        const halls = hallsRes?.success ? (hallsRes.data || []).map(normalizeHall) : prev.halls;
        const fallbackHall = halls?.[0] || null;

        const employees = employeesRes?.success
          ? (employeesRes.data || []).map((e) => normalizeEmployee(e, fallbackHall))
          : prev.employees.map((e) => normalizeEmployee(e, fallbackHall));

        const entries = entriesRes?.success ? (entriesRes.data || []).map(normalizeEntry) : prev.entries;
        const logs = logsRes?.success ? (logsRes.data || []) : prev.logs;
        const attendanceTracker = trackerRes?.success ? (trackerRes.data || []) : prev.attendanceTracker;

        return {
          ...prev,
          halls,
          employees,
          entries,
          logs,
          attendanceTracker,
        };
      });
    } catch (error) {
      console.error("Failed to fetch data from API:", error);
    }
  }, []);

  useEffect(() => {
    fetchAllDataFromAPI();
  }, [fetchAllDataFromAPI]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, [state]);

  const resetAll = useCallback(() => {
    const fresh = createInitialState();
    setState(fresh);
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem("hr_token");
    } catch {}
  }, []);

  const employeeMap = useMemo(
    () => new Map(state.employees.map((e) => [String(e.code).trim(), e])),
    [state.employees]
  );

  const activeEntries = useMemo(
    () =>
      (Array.isArray(state.entries) ? state.entries : []).filter(
        (e) => dateKey(e.date) === state.selectedDate
      ),
    [state.entries, state.selectedDate]
  );

  const hallUsage = useMemo(() => {
    return state.halls.map((hall) => {
      const used = activeEntries.filter(
        (e) => String(e.hallId || e.hall_id) === String(hall.id)
      ).length;

      return {
        ...hall,
        used,
        remaining: Math.max(0, Number(hall.capacity || 0) - used),
        full: used >= Number(hall.capacity || 0),
      };
    });
  }, [state.halls, activeEntries]);

  const totals = useMemo(
    () => ({
      totalCapacity: state.halls.reduce((a, h) => a + Number(h.capacity || 0), 0),
      selectedCount: activeEntries.length,
      remainingCount: Math.max(0, hallUsage.reduce((a, h) => a + Number(h.remaining || 0), 0)),
      locked: hallUsage.length > 0 ? hallUsage.every((h) => h.full) : false,
    }),
    [state.halls, activeEntries.length, hallUsage]
  );

  const canOverride = useMemo(
    () => state.currentRole === "HR" || state.currentRole === "ADMIN",
    [state.currentRole]
  );

  const getShift = useCallback((code) => SHIFT_OPTIONS.find((s) => s.code === code), []);

  const isInShift = useCallback(
    (timeHHMM, shiftCode) => {
      const shift = getShift(shiftCode);
      if (!shift) return true;

      const [h, m] = timeHHMM.split(":").map(Number);
      const current = h * 60 + m;
      const [sh, sm] = shift.start.split(":").map(Number);
      const [eh, em] = shift.end.split(":").map(Number);
      const start = sh * 60 + sm;
      const end = eh * 60 + em;

      if (shiftCode === "C" || shiftCode === "BB") return current >= start || current < end;
      return current >= start && current < end;
    },
    [getShift]
  );

  const getNextHallForEmployee = useCallback(
    (employee, entries = activeEntries, halls = state.halls) => {
      const preferred = halls.find((h) => String(h.id) === String(employee.hallId));
      if (preferred) {
        const used = entries.filter(
          (e) => String(e.hallId || e.hall_id) === String(preferred.id)
        ).length;
        if (used < Number(preferred.capacity || 0)) return preferred;
      }

      return (
        halls.find((h) => {
          const used = entries.filter(
            (e) => String(e.hallId || e.hall_id) === String(h.id)
          ).length;
          return used < Number(h.capacity || 0);
        }) || halls[0]
      );
    },
    [activeEntries, state.halls]
  );

  const login = useCallback(async (username, password) => {
    const res = await hrApi.login(String(username).trim(), String(password).trim());
    if (!res?.success) return { ok: false, message: res?.error || "Invalid credentials" };

    const token = res?.data?.token || "";
    const user = res?.data?.user || null;

    if (token) localStorage.setItem("hr_token", token);

    setState((prev) => ({
      ...prev,
      currentUser: user,
      currentRole: user?.role || "GUEST",
      currentHrCode: user?.role === "HR" || user?.role === "ADMIN" ? user?.username || "" : "",
    }));

    return { ok: true, message: "Login successful", role: user?.role || "GUEST" };
  }, []);

  const logout = useCallback(async () => {
    try {
      await hrApi.logout();
    } catch {}
    try {
      localStorage.removeItem("hr_token");
    } catch {}
    setState((prev) => ({
      ...prev,
      currentUser: null,
      currentRole: "GUEST",
      currentHrCode: "",
    }));
  }, []);

  const pushLog = useCallback((row) => {
    updateState((prev) => ({
      ...prev,
      logs: [row, ...prev.logs],
    }));
  }, [updateState]);

  const refreshAfterWrite = useCallback(async () => {
    await fetchAllDataFromAPI();
  }, [fetchAllDataFromAPI]);

  const deleteOldScanEntriesByCode = useCallback(
    async (code) => {
      const current = Array.isArray(state.entries) ? state.entries : [];
      const oldScans = current.filter(
        (e) => String(e.code).trim() === String(code).trim() && String(e.source || "") === "SCAN"
      );

      if (!oldScans.length) return;

      setState((prev) => ({
        ...prev,
        entries: prev.entries.filter(
          (e) =>
            !(
              String(e.code).trim() === String(code).trim() &&
              String(e.source || "") === "SCAN"
            )
        ),
      }));

      await Promise.allSettled(
        oldScans.map((entry) => (entry.id != null ? hrApi.deleteEntry(entry.id) : Promise.resolve()))
      );
    },
    [state.entries]
  );

  const processEntry = useCallback(
    async (code) => {
      const emp = employeeMap.get(String(code).trim());
      if (!emp) return { ok: false, text: "Employee code not found.", type: "error" };

      const already = activeEntries.some(
        (e) => String(e.code).trim() === String(emp.code).trim()
      );
      if (already) return { ok: false, duplicate: true, text: "Already scanned today.", type: "warn" };

      const todayDay = dayName(state.selectedDate);
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

      if (emp.weekOff === todayDay) {
        return { ok: false, weekOff: true, employee: emp, text: `${emp.name} is week off today.`, type: "warn" };
      }

      if (!isInShift(hhmm, emp.shift)) {
        return { ok: false, shiftBlocked: true, employee: emp, text: `${emp.name} is outside shift timing.`, type: "warn" };
      }

      const hall = getNextHallForEmployee(emp);
      const payload = {
        code: emp.code,
        name: emp.name,
        designation: emp.designation || "",
        week_off: emp.weekOff,
        shift: emp.shift,
        hall_id: hall?.id || "",
        hall_name: hall?.name || "",
        source: "SCAN",
        hr_code: "",
        hr_action: "",
        override_reason: "",
      };

      const apiRes = await hrApi.addEntry(payload);
      if (!apiRes?.success) return { ok: false, text: apiRes?.error || "Failed to save entry", type: "error" };

      const newEntry = normalizeEntry(apiRes.data);

      setState((prev) => ({
        ...prev,
        entries: [newEntry, ...prev.entries],
        logs: [
          makeLogRow("SCAN", `${emp.name} -> ${hall?.name || "-"}`, {
            by: prev.currentUser?.username || "",
            employeeCode: emp.code,
            hallId: hall?.id || "",
            hallName: hall?.name || "",
            at: apiRes.data?.date || new Date().toISOString(),
            id: newEntry.id || Date.now(),
          }),
          ...prev.logs,
        ],
      }));

      return { ok: true, entry: newEntry, text: `${emp.name} saved in ${hall?.name || "-"}.` };
    },
    [activeEntries, employeeMap, getNextHallForEmployee, isInShift, state.selectedDate]
  );

  const hrOverrideEntry = useCallback(
    async ({ code, hallId, reason }) => {
      const emp = employeeMap.get(String(code).trim());
      const hall = state.halls.find((h) => String(h.id) === String(hallId));

      if (!emp || !hall || !reason) return { ok: false, text: "Invalid override data.", type: "error" };
      if (!canOverride) return { ok: false, text: "HR/Admin login required.", type: "error" };

      const todayDay = dayName(state.selectedDate);
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

      const isWeekOff = emp.weekOff === todayDay;
      const outOfShift = !isInShift(hhmm, emp.shift);
      const reasonTag = `${String(reason || "")}${isWeekOff ? " | WEEK_OFF" : ""}${outOfShift ? " | OUT_OF_SHIFT" : ""}`;

      const payload = {
        code: emp.code,
        name: emp.name,
        designation: emp.designation || "",
        week_off: emp.weekOff,
        shift: emp.shift,
        hall_id: hall.id,
        hall_name: hall.name,
        source: "HR_OVERRIDE",
        hr_code: state.currentUser?.username || "",
        hr_action: "FORCE_ENTRY",
        override_reason: reasonTag,
      };

      const apiRes = await hrApi.addEntry(payload);
      if (!apiRes?.success) return { ok: false, text: apiRes?.error || "Failed", type: "error" };

      const newEntry = normalizeEntry(apiRes.data);

      setState((prev) => ({
        ...prev,
        entries: [newEntry, ...prev.entries],
        logs: [
          makeLogRow("HR_OVERRIDE", `${emp.name} -> ${hall.name} | ${reasonTag}`, {
            by: prev.currentUser?.username || "",
            employeeCode: emp.code,
            hallId: hall.id,
            hallName: hall.name,
            overrideReason: apiRes.data?.override_reason || reasonTag,
            at: apiRes.data?.date || new Date().toISOString(),
            id: newEntry.id || Date.now(),
          }),
          ...prev.logs,
        ],
      }));

      return { ok: true, entry: newEntry, text: `HR override saved for ${emp.name}.` };
    },
    [canOverride, employeeMap, isInShift, state.currentUser?.username, state.halls, state.selectedDate]
  );

  const moveEmployeeToHall = useCallback(
    async ({ code, hallId, reason }) => {
      const emp = employeeMap.get(String(code).trim());
      const hall = state.halls.find((h) => String(h.id) === String(hallId));

      if (!emp || !hall || !reason) return { ok: false, text: "Invalid move data.", type: "error" };
      if (!canOverride) return { ok: false, text: "HR/Admin login required.", type: "error" };

      const todayDay = dayName(state.selectedDate);
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

      const isWeekOff = emp.weekOff === todayDay;
      const outOfShift = !isInShift(hhmm, emp.shift);
      const reasonTag = `${String(reason || "")}${isWeekOff ? " | WEEK_OFF" : ""}${outOfShift ? " | OUT_OF_SHIFT" : ""}`;

      const payload = {
        code: emp.code,
        name: emp.name,
        designation: emp.designation || "",
        week_off: emp.weekOff,
        shift: emp.shift,
        hall_id: hall.id,
        hall_name: hall.name,
        source: "HR_TRANSFER",
        hr_code: state.currentUser?.username || "",
        hr_action: "MOVE_TO_OTHER_HALL",
        override_reason: reasonTag,
      };

      const apiRes = await hrApi.addEntry(payload);
      if (!apiRes?.success) return { ok: false, text: apiRes?.error || "Failed", type: "error" };

      const newEntry = normalizeEntry(apiRes.data);

      setState((prev) => ({
        ...prev,
        entries: [
          newEntry,
          ...prev.entries.filter(
            (e) =>
              !(
                dateKey(e.date) === prev.selectedDate &&
                String(e.code).trim() === String(emp.code).trim() &&
                String(e.source || "") === "SCAN"
              )
          ),
        ],
        logs: [
          makeLogRow("HR_TRANSFER", `${emp.name} -> ${hall.name} | ${reasonTag}`, {
            by: prev.currentUser?.username || "",
            employeeCode: emp.code,
            hallId: hall.id,
            hallName: hall.name,
            overrideReason: newEntry.overrideReason || reasonTag,
            at: newEntry.date || new Date().toISOString(),
            id: newEntry.id || Date.now(),
          }),
          ...prev.logs,
        ],
      }));

      await deleteOldScanEntriesByCode(emp.code);
      return { ok: true, entry: newEntry, text: `${emp.name} moved to ${hall.name}.` };
    },
    [canOverride, deleteOldScanEntriesByCode, employeeMap, isInShift, state.currentUser?.username, state.halls, state.selectedDate]
  );

  const getAttendanceTracker = useCallback(() => {
    const byEmp = new Map();

    state.entries.forEach((e) => {
      const k = String(e.code).trim();
      const arr = byEmp.get(k) || [];
      arr.push(e.date);
      byEmp.set(k, arr);
    });

    return state.employees.map((emp) => {
      const dates = byEmp.get(String(emp.code).trim()) || [];
      const uniqueDays = new Set(dates.map((d) => dateKey(d)));
      const lastSeen = dates.length ? [...dates].sort().at(-1) : "";
      const absentDays = Math.max(0, 30 - uniqueDays.size);

      return {
        ...emp,
        presentDays: uniqueDays.size,
        absentDays,
        lastSeen,
        totalRecords: dates.length,
      };
    });
  }, [state.entries, state.employees]);

  const value = useMemo(
    () => ({
      DAYS,
      SHIFT_OPTIONS,
      state,
      setState: updateState,
      hallUsage,
      totals,
      activeEntries,
      canOverride,
      login,
      logout,
      processEntry,
      hrOverrideEntry,
      moveEmployeeToHall,
      getAttendanceTracker,
      resetAll,
      fetchAllDataFromAPI,
      pushLog,
      refreshAfterWrite,
    }),
    [
      activeEntries,
      canOverride,
      fetchAllDataFromAPI,
      hallUsage,
      hrOverrideEntry,
      login,
      logout,
      moveEmployeeToHall,
      processEntry,
      pushLog,
      refreshAfterWrite,
      resetAll,
      state,
      totals,
      updateState,
      getAttendanceTracker,
    ]
  );

  return <HRContext.Provider value={value}>{children}</HRContext.Provider>;
}

export const useHR = () => {
  const ctx = useContext(HRContext);
  if (!ctx) throw new Error("useHR must be used inside HRProvider");
  return ctx;
};