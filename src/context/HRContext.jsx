import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from 'react';
import { DEFAULT_EMPLOYEES, DEFAULT_HALLS, SHIFT_OPTIONS, DAYS } from '../data/defaultData';
import hrApi from '../api/hrApi';

const DEFAULT_USERS = [
  { username: 'user1', password: 'user123', role: 'USER' },
  { username: 'hr1', password: 'hr123', role: 'HR' },
  { username: 'admin1', password: 'admin123', role: 'ADMIN' },
];

const HRContext = createContext(null);
const STORAGE_KEY = 'demo_hr_system_v5';

const todayISO = () => new Date().toISOString().slice(0, 10);
const dateKey = (v) => String(v || '').slice(0, 10);
const dayName = (dateStr) => new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long' });

const normalizeEmployee = (e, fallbackHall = null) => ({
  id: e.id ?? e.code,
  name: e.name || '',
  code: String(e.code || '').trim(),
  designation: e.designation || '',
  weekOff: e.week_off || e.weekOff || 'Sunday',
  shift: e.shift || 'A',
  hallId: e.hall_id || e.hallId || fallbackHall?.id || '',
  hallName: e.hall_name || e.hallName || fallbackHall?.name || '',
});

const normalizeHall = (h) => ({
  id: h.id,
  name: h.name || '',
  capacity: Number(h.capacity || 0),
  color: h.color || 'blue',
});

const normalizeEntry = (e) => ({
  ...e,
  id: e.id,
  code: String(e.code || '').trim(),
  name: e.name || '',
  designation: e.designation || '',
  weekOff: e.week_off || e.weekOff || 'Sunday',
  shift: e.shift || 'A',
  hallId: e.hall_id || e.hallId || '',
  hallName: e.hall_name || e.hallName || `Hall ${e.hall_id || e.hallId || '?'}`,
  source: e.source || 'SCAN',
  hrCode: e.hr_code || e.hrCode || '',
  hrAction: e.hr_action || e.hrAction || '',
  overrideReason: e.override_reason || e.overrideReason || '',
  date: e.date || '',
  time: e.time || '',
  day: e.day || '',
});

const initialState = () => ({
  selectedDate: todayISO(),
  currentUser: null,
  currentRole: 'GUEST',
  currentHrCode: '',
  halls: DEFAULT_HALLS,
  employees: DEFAULT_EMPLOYEES.map((e) => normalizeEmployee(e, DEFAULT_HALLS[0])),
  entries: [],
  logs: [],
  attendanceTracker: [],
});

export function HRProvider({ children }) {
  const [state, setState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return { ...initialState(), ...JSON.parse(saved) };
    } catch {}
    return initialState();
  });

  const fetchAllDataFromAPI = useCallback(async () => {
    try {
      const [employeesRes, hallsRes, entriesRes, logsRes, trackerRes] = await Promise.all([
        hrApi.getEmployees(),
        hrApi.getHalls(),
        hrApi.getEntries(),
        hrApi.getLogs(),
        hrApi.getAllAttendance(),
      ]);

      const halls = hallsRes?.success ? (hallsRes.data || []).map(normalizeHall) : state.halls;
      const fallbackHall = halls?.[0] || null;

      const employees = employeesRes?.success
        ? (employeesRes.data || []).map((e) => normalizeEmployee(e, fallbackHall))
        : state.employees.map((e) => normalizeEmployee(e, fallbackHall));

      setState((prev) => ({
        ...prev,
        halls,
        employees,
        entries: entriesRes?.success ? (entriesRes.data || []).map(normalizeEntry) : prev.entries,
        logs: logsRes?.success ? (logsRes.data || []) : prev.logs,
        attendanceTracker: trackerRes?.success ? (trackerRes.data || []) : prev.attendanceTracker,
      }));
    } catch (error) {
      console.error('Failed to fetch data from API:', error);
    }
  }, [state.halls, state.employees]);

  useEffect(() => {
    fetchAllDataFromAPI();
  }, [fetchAllDataFromAPI]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, [state]);

  const resetAll = () => {
    const fresh = initialState();
    setState(fresh);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  const employeeMap = useMemo(
    () => new Map(state.employees.map((e) => [String(e.code).trim(), e])),
    [state.employees]
  );

  const activeEntries = useMemo(
    () => (Array.isArray(state.entries) ? state.entries : []).filter((e) => dateKey(e.date) === state.selectedDate),
    [state.entries, state.selectedDate]
  );

  const hallUsage = useMemo(() => {
    return state.halls.map((hall) => {
      const used = activeEntries.filter(
        (e) => String(e.hall_id || e.hallId) === String(hall.id)
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
    () => state.currentRole === 'HR' || state.currentRole === 'ADMIN',
    [state.currentRole]
  );

  const getShift = (code) => SHIFT_OPTIONS.find((s) => s.code === code);

  const isInShift = (timeHHMM, shiftCode) => {
    const shift = getShift(shiftCode);
    if (!shift) return true;

    const [h, m] = timeHHMM.split(':').map(Number);
    const current = h * 60 + m;
    const [sh, sm] = shift.start.split(':').map(Number);
    const [eh, em] = shift.end.split(':').map(Number);
    const start = sh * 60 + sm;
    const end = eh * 60 + em;

    if (shiftCode === 'C' || shiftCode === 'BB') {
      return current >= start || current < end;
    }
    return current >= start && current < end;
  };

  const getNextHallForEmployee = (employee) => {
    const preferred = state.halls.find((h) => String(h.id) === String(employee.hallId));
    if (preferred) {
      const used = activeEntries.filter(
        (e) => String(e.hall_id || e.hallId) === String(preferred.id)
      ).length;
      if (used < Number(preferred.capacity || 0)) return preferred;
    }

    return (
      state.halls.find((h) => {
        const used = activeEntries.filter(
          (e) => String(e.hall_id || e.hallId) === String(h.id)
        ).length;
        return used < Number(h.capacity || 0);
      }) || state.halls[0]
    );
  };

  const login = (username, password) => {
    const user = DEFAULT_USERS.find(
      (u) => u.username === String(username).trim() && u.password === String(password).trim()
    );

    if (!user) return { ok: false, message: 'Invalid credentials' };

    setState((prev) => ({
      ...prev,
      currentUser: { username: user.username, role: user.role },
      currentRole: user.role,
      currentHrCode: user.role === 'HR' || user.role === 'ADMIN' ? user.username : '',
    }));

    return { ok: true, message: 'Login successful', role: user.role };
  };

  const logout = () => {
    setState((prev) => ({
      ...prev,
      currentUser: null,
      currentRole: 'GUEST',
      currentHrCode: '',
    }));
  };

  const addLogRow = (row) => {
    setState((prev) => ({
      ...prev,
      logs: [row, ...prev.logs],
    }));
  };

  const refreshAfterWrite = async () => {
    await fetchAllDataFromAPI();
  };

  const deleteOldScanEntriesByCode = async (code) => {
    const current = Array.isArray(state.entries) ? state.entries : [];
    const oldScans = current.filter(
      (e) =>
        String(e.code).trim() === String(code).trim() &&
        String(e.source || '') === 'SCAN'
    );

    if (!oldScans.length) return;

    setState((prev) => ({
      ...prev,
      entries: prev.entries.filter(
        (e) =>
          !(
            String(e.code).trim() === String(code).trim() &&
            String(e.source || '') === 'SCAN'
          )
      ),
    }));

    for (const entry of oldScans) {
      try {
        if (entry.id != null) await hrApi.deleteEntry(entry.id);
      } catch {}
    }
  };

  const processEntry = async (code) => {
    const emp = employeeMap.get(String(code).trim());
    if (!emp) return { ok: false, text: 'Employee code not found.', type: 'error' };

    const already = activeEntries.some((e) => String(e.code).trim() === String(emp.code).trim());
    if (already) return { ok: false, duplicate: true, text: 'Already scanned today.', type: 'warn' };

    const todayDay = dayName(state.selectedDate);
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    if (emp.weekOff === todayDay) {
      return { ok: false, weekOff: true, employee: emp, text: `${emp.name} is week off today.`, type: 'warn' };
    }

    if (!isInShift(hhmm, emp.shift)) {
      return { ok: false, shiftBlocked: true, employee: emp, text: `${emp.name} is outside shift timing.`, type: 'warn' };
    }

    const hall = getNextHallForEmployee(emp);
    const payload = {
      code: emp.code,
      name: emp.name,
      designation: emp.designation || '',
      week_off: emp.weekOff,
      shift: emp.shift,
      hall_id: hall?.id || '',
      hall_name: hall?.name || '',
      source: 'SCAN',
      hr_code: '',
      hr_action: '',
      override_reason: '',
    };

    const apiRes = await hrApi.addEntry(payload);

    if (apiRes.success) {
      await refreshAfterWrite();
      addLogRow({
        id: apiRes.data?.id || Date.now(),
        type: 'SCAN',
        message: `${emp.name} -> ${hall?.name || '-'}`,
        by: state.currentUser?.username || '',
        employeeCode: emp.code,
        hallId: hall?.id || '',
        hallName: hall?.name || '',
        at: apiRes.data?.date || new Date().toISOString(),
      });

      return { ok: true, entry: apiRes.data, text: `${emp.name} saved in ${hall?.name || '-'}.` };
    }

    return { ok: false, text: apiRes.error || 'Failed to save entry', type: 'error' };
  };

  const hrOverrideEntry = async ({ code, hallId, reason }) => {
    const emp = employeeMap.get(String(code).trim());
    const hall = state.halls.find((h) => String(h.id) === String(hallId));

    if (!emp || !hall || !reason) return { ok: false, text: 'Invalid override data.', type: 'error' };
    if (!canOverride) return { ok: false, text: 'HR/Admin login required.', type: 'error' };

    const todayDay = dayName(state.selectedDate);
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const isWeekOff = emp.weekOff === todayDay;
    const outOfShift = !isInShift(hhmm, emp.shift);
    const reasonTag =
      String(reason || '') +
      (isWeekOff ? ' | WEEK_OFF' : '') +
      (outOfShift ? ' | OUT_OF_SHIFT' : '');

    const payload = {
      code: emp.code,
      name: emp.name,
      designation: emp.designation || '',
      week_off: emp.weekOff,
      shift: emp.shift,
      hall_id: hall.id,
      hall_name: hall.name,
      source: 'HR_OVERRIDE',
      hr_code: state.currentUser?.username || '',
      hr_action: 'FORCE_ENTRY',
      override_reason: reasonTag,
    };

    const apiRes = await hrApi.addEntry(payload);

    if (apiRes.success) {
      await refreshAfterWrite();
      addLogRow({
        id: apiRes.data?.id || Date.now(),
        type: 'HR_OVERRIDE',
        message: `${emp.name} -> ${hall.name} | ${reasonTag}`,
        by: state.currentUser?.username || '',
        employeeCode: emp.code,
        hallId: hall.id,
        hallName: hall.name,
        overrideReason: apiRes.data?.override_reason || reasonTag,
        at: apiRes.data?.date || new Date().toISOString(),
      });

      return { ok: true, entry: apiRes.data, text: `HR override saved for ${emp.name}.` };
    }

    return { ok: false, text: apiRes.error || 'Failed', type: 'error' };
  };

  const moveEmployeeToHall = async ({ code, hallId, reason }) => {
    const emp = employeeMap.get(String(code).trim());
    const hall = state.halls.find((h) => String(h.id) === String(hallId));

    if (!emp || !hall || !reason) return { ok: false, text: 'Invalid move data.', type: 'error' };
    if (!canOverride) return { ok: false, text: 'HR/Admin login required.', type: 'error' };

    const todayDay = dayName(state.selectedDate);
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const isWeekOff = emp.weekOff === todayDay;
    const outOfShift = !isInShift(hhmm, emp.shift);
    const reasonTag =
      String(reason || '') +
      (isWeekOff ? ' | WEEK_OFF' : '') +
      (outOfShift ? ' | OUT_OF_SHIFT' : '');

    const payload = {
      code: emp.code,
      name: emp.name,
      designation: emp.designation || '',
      week_off: emp.weekOff,
      shift: emp.shift,
      hall_id: hall.id,
      hall_name: hall.name,
      source: 'HR_TRANSFER',
      hr_code: state.currentUser?.username || '',
      hr_action: 'MOVE_TO_OTHER_HALL',
      override_reason: reasonTag,
    };

    const apiRes = await hrApi.addEntry(payload);

    if (apiRes.success) {
      const newEntry = normalizeEntry(apiRes.data);

      setState((prev) => ({
        ...prev,
        entries: [newEntry, ...prev.entries.filter(
          (e) =>
            !(
              dateKey(e.date) === state.selectedDate &&
              String(e.code).trim() === String(emp.code).trim() &&
              String(e.source || '') === 'SCAN'
            )
        )],
      }));

      await deleteOldScanEntriesByCode(emp.code);

      addLogRow({
        id: newEntry.id || Date.now(),
        type: 'HR_TRANSFER',
        message: `${emp.name} -> ${hall.name} | ${reasonTag}`,
        by: state.currentUser?.username || '',
        employeeCode: emp.code,
        hallId: hall.id,
        hallName: hall.name,
        overrideReason: newEntry.overrideReason || reasonTag,
        at: newEntry.date || new Date().toISOString(),
      });

      await refreshAfterWrite();

      return { ok: true, entry: newEntry, text: `${emp.name} moved to ${hall.name}.` };
    }

    return { ok: false, text: apiRes.error || 'Failed', type: 'error' };
  };

  const getAttendanceTracker = () => {
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
      const lastSeen = dates.length ? [...dates].sort().at(-1) : '';
      const absentDays = Math.max(0, 30 - uniqueDays.size);

      return {
        ...emp,
        presentDays: uniqueDays.size,
        absentDays,
        lastSeen,
        totalRecords: dates.length,
      };
    });
  };

  return (
    <HRContext.Provider
      value={{
        DAYS,
        SHIFT_OPTIONS,
        state,
        setState,
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
      }}
    >
      {children}
    </HRContext.Provider>
  );
}

export const useHR = () => {
  const ctx = useContext(HRContext);
  if (!ctx) throw new Error('useHR must be used inside HRProvider');
  return ctx;
};