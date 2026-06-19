import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { DAYS, DEFAULT_EMPLOYEES, DEFAULT_HALLS, SHIFT_OPTIONS } from '../data/defaultData';
import { readStorage, writeStorage } from '../utils/storage';
import { api } from '../utils/api';
import { getHallUsage, getNextAvailableHall, getTotalCapacity } from '../utils/helpers';

const HRContext = createContext(null);
const STORAGE_KEY = 'hr_gate_system_v5';

const todayISODate = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const createInitialState = () => ({
  halls: DEFAULT_HALLS,
  employees: DEFAULT_EMPLOYEES,
  entries: [],
  selectedDate: todayISODate(),
  logs: [],
  currentUserRole: 'HR'
});

const getDateKey = (value) => String(value || '').slice(0, 10);
const getDayNameFromDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long' });
const getShiftMeta = (shiftCode) => SHIFT_OPTIONS.find((s) => s.code === shiftCode) || null;

const isTimeInShift = (timeHHMM, shiftCode) => {
  const shift = getShiftMeta(shiftCode);
  if (!shift) return true;
  const [h, m] = String(timeHHMM).split(':').map(Number);
  const current = h * 60 + m;
  const [sh, sm] = shift.start.split(':').map(Number);
  const [eh, em] = shift.end.split(':').map(Number);
  const start = sh * 60 + sm;
  const end = eh * 60 + em;
  if (shift.code === 'C' || shift.code === 'BB') return current >= start || current < end;
  return current >= start && current < end;
};

const normalizeEmployee = (row, index = 0) => ({
  id: row.id || row.code || `emp_${index + 1}`,
  name: row.name || '',
  code: String(row.code || '').trim(),
  weekOff: row.weekOff || 'Sunday',
  shift: row.shift || 'A'
});

const normalizeHall = (row, index = 0) => ({
  id: row.id || `H${index + 1}`,
  name: row.name || `Hall ${index + 1}`,
  capacity: Number(row.capacity || 0),
  color: row.color || 'slate'
});

const normalizeEntry = (row) => ({
  id: row.id || Date.now(),
  code: String(row.code || '').trim(),
  name: row.name || '',
  weekOff: row.weekOff || row.week_off || '-',
  shift: row.shift || '-',
  hallId: row.hallId || row.hall_id || null,
  hallName: row.hallName || row.hall_name || 'Unnamed Hall',
  status: row.status || 'Present',
  source: row.source || 'SCAN_OR_MANUAL',
  overrideReason: row.overrideReason || row.override_reason || '',
  overriddenBy: row.overriddenBy || row.overridden_by || '',
  day: row.day || getDayNameFromDate(row.date || row.entry_date || todayISODate()),
  time: row.time || '00:00:00',
  date: row.date || (row.entry_date ? `${row.entry_date}T00:00:00` : `${todayISODate()}T00:00:00`)
});

export function HRProvider({ children }) {
  const [state, setState] = useState(() => readStorage(STORAGE_KEY, createInitialState()));
  const [lastMessage, setLastMessage] = useState({ type: 'info', text: 'System ready' });

  useEffect(() => {
    writeStorage(STORAGE_KEY, state);
  }, [state]);

  useEffect(() => {
    let active = true;
    const bootstrap = async () => {
      try {
        const [empRes, hallRes, settingsRes, attRes, logsRes] = await Promise.all([
          api.get('/employees'),
          api.get('/halls'),
          api.get('/settings'),
          api.get(`/attendance?date=${state.selectedDate}`),
          api.get('/logs')
        ]);

        if (!active) return;

        setState((prev) => ({
          ...prev,
          employees: Array.isArray(empRes.data) && empRes.data.length ? empRes.data.map(normalizeEmployee) : prev.employees,
          halls: Array.isArray(hallRes.data) && hallRes.data.length ? hallRes.data.map(normalizeHall) : prev.halls,
          entries: Array.isArray(attRes.data) && attRes.data.length ? attRes.data.map(normalizeEntry) : prev.entries,
          currentUserRole: settingsRes.data?.current_user_role || prev.currentUserRole,
          logs: Array.isArray(logsRes.data) && logsRes.data.length
            ? logsRes.data.map((l) => ({
                id: l.id,
                message: l.message,
                createdAt: l.created_at,
                relatedEntryId: l.related_entry_id || null
              }))
            : prev.logs
        }));
      } catch {}
    };

    bootstrap();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const loadAttendanceForDate = async () => {
      try {
        const res = await api.get(`/attendance?date=${state.selectedDate}`);
        if (active && Array.isArray(res.data)) {
          setState((prev) => ({
            ...prev,
            entries: res.data.map(normalizeEntry)
          }));
        }
      } catch {}
    };

    loadAttendanceForDate();
    return () => {
      active = false;
    };
  }, [state.selectedDate]);

  const entriesForSelectedDate = useMemo(() => {
    return state.entries.filter((item) => getDateKey(item.date) === state.selectedDate);
  }, [state.entries, state.selectedDate]);

  const totals = useMemo(() => {
    const totalCapacity = getTotalCapacity(state.halls);
    const selectedCount = entriesForSelectedDate.length;
    const presentCount = state.entries.filter((entry) => entry.status === 'Present').length;
    const weekOffCount = state.entries.filter((entry) => entry.status === 'WO').length;
    const overrideCount = state.entries.filter((entry) => entry.source === 'HR_OVERRIDE').length;

    return {
      totalCapacity,
      selectedCount,
      presentCount,
      weekOffCount,
      overrideCount,
      remainingCount: Math.max(totalCapacity - selectedCount, 0),
      locked: selectedCount >= totalCapacity
    };
  }, [state.halls, entriesForSelectedDate, state.entries]);

  const hallSummary = useMemo(() => {
    return state.halls.map((hall) => {
      const used = getHallUsage(entriesForSelectedDate, hall.id);
      const capacity = Number(hall.capacity ?? 0);
      return {
        ...hall,
        name: hall.name || 'Unnamed Hall',
        used,
        remaining: Math.max(capacity - used, 0),
        full: capacity > 0 ? used >= capacity : false
      };
    });
  }, [state.halls, entriesForSelectedDate]);

  const trackerRows = useMemo(() => {
    const employeeMap = new Map(state.employees.map((emp) => [String(emp.code).trim(), emp]));
    return entriesForSelectedDate.map((entry) => {
      const emp = employeeMap.get(String(entry.code).trim());
      return {
        ...entry,
        status: entry.status || 'Present',
        weekOff: emp?.weekOff || entry.weekOff || '-',
        shift: emp?.shift || entry.shift || '-'
      };
    });
  }, [entriesForSelectedDate, state.employees]);

  const allAttendanceRows = useMemo(() => {
    const employeeMap = new Map(state.employees.map((emp) => [String(emp.code).trim(), emp]));
    return state.entries.map((entry) => {
      const emp = employeeMap.get(String(entry.code).trim());
      return {
        ...entry,
        day: entry.day || getDayNameFromDate(entry.date),
        status: entry.status || 'Present',
        weekOff: emp?.weekOff || entry.weekOff || '-',
        shift: emp?.shift || entry.shift || '-'
      };
    });
  }, [state.entries, state.employees]);

  const setSelectedDate = (date) => {
    setState((prev) => ({ ...prev, selectedDate: date || todayISODate() }));
  };

  const setCurrentUserRole = async (role) => {
    const value = String(role || 'HR').toUpperCase();
    setState((prev) => ({ ...prev, currentUserRole: value }));
    try {
      await api.put('/settings', { current_user_role: value });
    } catch {}
  };

  const canOverride = ['HR', 'ADMIN'].includes(String(state.currentUserRole || '').toUpperCase());

  const updateHall = async (hallId, patch) => {
    setState((prev) => ({
      ...prev,
      halls: prev.halls.map((hall) =>
        hall.id === hallId
          ? {
              ...hall,
              ...patch,
              name: patch.name !== undefined ? patch.name : hall.name,
              capacity: patch.capacity !== undefined ? Number(patch.capacity) || 0 : Number(hall.capacity) || 0,
              color: patch.color || hall.color || 'slate'
            }
          : hall
      )
    }));

    try {
      await api.put(`/halls/${hallId}`, patch);
    } catch {}
  };

  const addHall = async () => {
    const hall = {
      id: `H${state.halls.length + 1}_${Date.now()}`,
      name: `Hall ${state.halls.length + 1}`,
      capacity: 0,
      color: 'slate'
    };

    setState((prev) => ({ ...prev, halls: [...prev.halls, hall] }));

    try {
      await api.post('/halls', hall);
    } catch {}
  };

  const removeHall = async (hallId) => {
    const inUse = state.entries.some((entry) => entry.hallId === hallId);
    if (inUse) {
      setLastMessage({ type: 'error', text: 'Is hall me already entries hain, pehle unko remove karo.' });
      return;
    }

    setState((prev) => ({
      ...prev,
      halls: prev.halls.filter((hall) => hall.id !== hallId)
    }));

    try {
      await api.del(`/halls/${hallId}`);
    } catch {}
  };

  const updateEmployee = async (code, patch) => {
    setState((prev) => ({
      ...prev,
      employees: prev.employees.map((employee) =>
        String(employee.code) === String(code) ? { ...employee, ...patch } : employee
      )
    }));
  };

  const replaceRoster = async (rows) => {
    const seen = new Set();
    const safeRows = Array.isArray(rows)
      ? rows
          .map(normalizeEmployee)
          .filter((emp) => emp.code && !seen.has(emp.code) && seen.add(emp.code))
      : [];

    setState((prev) => ({ ...prev, employees: safeRows }));
    setLastMessage({ type: 'success', text: 'Roster import ho gaya.' });
  };

  const addEmployee = async (payload) => {
    const code = String(payload.code || '').trim();
    const name = String(payload.name || '').trim();

    if (!name || !code) {
      setLastMessage({ type: 'error', text: 'Name aur code required hain.' });
      return false;
    }

    if (state.employees.some((item) => String(item.code) === code)) {
      setLastMessage({ type: 'error', text: 'Ye code already roster me hai.' });
      return false;
    }

    const emp = {
      id: Date.now(),
      name,
      code,
      weekOff: payload.weekOff || 'Sunday',
      shift: payload.shift || 'A'
    };

    setState((prev) => ({
      ...prev,
      employees: [emp, ...prev.employees]
    }));

    try {
      await api.post('/employees', {
        name: emp.name,
        code: emp.code,
        weekOff: emp.weekOff,
        shift: emp.shift
      });
    } catch {}

    setLastMessage({ type: 'success', text: 'Employee roster me add ho gaya.' });
    return true;
  };

  const checkEligibility = (code) => {
    const codeKey = String(code).trim();
    const employee = state.employees.find((item) => String(item.code).trim() === codeKey);
    const todayKey = state.selectedDate;

    if (!employee) {
      return { ok: false, type: 'error', canOverride: false, duplicate: false, text: 'Employee code roster me nahi mila.' };
    }

    const alreadyToday = state.entries.some(
      (item) => String(item.code).trim() === String(employee.code).trim() && getDateKey(item.date) === todayKey
    );

    if (alreadyToday) {
      return {
        ok: false,
        type: 'warn',
        canOverride: false,
        duplicate: true,
        employee,
        text: 'Already scanned / duplicate entry.'
      };
    }

    const now = new Date();
    const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const assignedShift = getShiftMeta(employee.shift);

    if (assignedShift && !isTimeInShift(currentHHMM, employee.shift)) {
      return {
        ok: false,
        type: 'warn',
        canOverride,
        duplicate: false,
        employee,
        text: `${employee.name} ka shift ${assignedShift.label} hai. Abhi punch time us shift me nahi aata.`
      };
    }

    if (employee.weekOff === getDayNameFromDate(todayKey)) {
      return {
        ok: false,
        type: 'warn',
        canOverride,
        duplicate: false,
        employee,
        text: `Aaj ${employee.name} ka week off hai. Punch allow nahi hai.`
      };
    }

    const todayEntries = state.entries.filter((item) => getDateKey(item.date) === todayKey);
    const hall = getNextAvailableHall(state.halls, todayEntries);

    return {
      ok: true,
      type: 'success',
      canOverride: false,
      duplicate: false,
      employee,
      hall,
      text: `${employee.name} eligible hai. Shift: ${assignedShift?.label || employee.shift}. Next hall: ${hall?.name || 'N/A'}`
    };
  };

  const processEntry = async (code) => {
    const result = checkEligibility(code);
    setLastMessage({ type: result.type, text: result.text });

    if (!result.ok) return result;

    const now = new Date();
    const entry = {
      id: Date.now(),
      code: result.employee.code,
      name: result.employee.name,
      weekOff: result.employee.weekOff,
      shift: result.employee.shift,
      hallId: result.hall?.id || null,
      hallName: result.hall?.name || 'Unnamed Hall',
      status: 'Present',
      day: getDayNameFromDate(state.selectedDate),
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      date: `${state.selectedDate}T${now.toTimeString().slice(0, 8)}`,
      source: 'SCAN_OR_MANUAL'
    };

    setState((prev) => ({
      ...prev,
      entries: [entry, ...prev.entries],
      logs: [
        { id: entry.id, message: `${entry.name} -> ${entry.hallName}`, createdAt: entry.date },
        ...prev.logs
      ].slice(0, 100)
    }));

    try {
      await api.post('/attendance', {
        code: entry.code,
        name: entry.name,
        weekOff: entry.weekOff,
        shift: entry.shift,
        hallId: entry.hallId,
        hallName: entry.hallName,
        selectedDate: state.selectedDate,
        source: entry.source
      });
    } catch {}

    setLastMessage({ type: 'success', text: `${entry.name} ka punch save ho gaya.` });
    return { ok: true, entry };
  };

  const overrideEntry = async (payload) => {
    if (!canOverride) {
      setLastMessage({ type: 'error', text: 'Aapke paas HR override permission nahi hai.' });
      return false;
    }

    const code = String(payload.code || '').trim();
    const name = String(payload.name || '').trim();
    const shift = String(payload.shift || '').trim();
    const reason = String(payload.overrideReason || '').trim();

    if (!code || !name || !shift || !reason) {
      setLastMessage({ type: 'error', text: 'Override ke liye name, code, shift aur reason required hain.' });
      return false;
    }

    const now = new Date();
    const todayKey = state.selectedDate;
    const day = getDayNameFromDate(todayKey);

    const entry = {
      id: Date.now(),
      code,
      name,
      shift,
      weekOff: payload.weekOff || '-',
      hallId: payload.hallId || null,
      hallName: payload.hallName || 'HR Override',
      status: 'Present',
      source: 'HR_OVERRIDE',
      overrideReason: reason,
      overriddenBy: payload.overriddenBy || state.currentUserRole || 'HR',
      day,
      time: payload.time || now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      date: `${todayKey}T${now.toTimeString().slice(0, 8)}`
    };

    setState((prev) => ({
      ...prev,
      entries: [entry, ...prev.entries],
      logs: [
        { id: entry.id, message: `OVERRIDE: ${entry.name} -> ${entry.overrideReason}`, createdAt: entry.date },
        ...prev.logs
      ].slice(0, 100)
    }));

    try {
      await api.post('/attendance', {
        code: entry.code,
        name: entry.name,
        weekOff: entry.weekOff,
        shift: entry.shift,
        hallId: entry.hallId,
        hallName: entry.hallName,
        selectedDate: state.selectedDate,
        source: 'HR_OVERRIDE',
        overrideReason: entry.overrideReason,
        overriddenBy: entry.overriddenBy,
        time: entry.time
      });
    } catch {}

    setLastMessage({ type: 'success', text: `${entry.name} ka override punch save ho gaya.` });
    return true;
  };

  const removeEntry = async (entryId) => {
    setState((prev) => ({
      ...prev,
      entries: prev.entries.filter((entry) => entry.id !== entryId)
    }));

    try {
      await api.del(`/attendance/${entryId}`);
    } catch {}

    setLastMessage({ type: 'warn', text: 'Entry remove kar di gayi.' });
  };

  const resetEntries = () => {
    setState((prev) => ({ ...prev, entries: [], logs: [] }));
    setLastMessage({ type: 'warn', text: 'Selected list reset ho gayi.' });
  };

  const resetSystem = () => {
    setState(createInitialState());
    setLastMessage({ type: 'warn', text: 'System default state me reset ho gaya.' });
  };

  const value = {
    DAYS,
    SHIFT_OPTIONS,
    state,
    totals,
    hallSummary,
    trackerRows,
    allAttendanceRows,
    entriesForSelectedDate,
    lastMessage,
    setSelectedDate,
    setCurrentUserRole,
    canOverride,
    updateHall,
    addHall,
    removeHall,
    updateEmployee,
    addEmployee,
    replaceRoster,
    processEntry,
    overrideEntry,
    checkEligibility,
    removeEntry,
    resetEntries,
    resetSystem
  };

  return <HRContext.Provider value={value}>{children}</HRContext.Provider>;
}

export function useHR() {
  const context = useContext(HRContext);
  if (!context) throw new Error('useHR must be within HRProvider');
  return context;
}