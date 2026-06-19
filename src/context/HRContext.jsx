import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_EMPLOYEES, DEFAULT_HALLS, DEFAULT_HR_CODES, SHIFT_OPTIONS, DAYS } from '../data/defaultData';

const HRContext = createContext(null);
const STORAGE_KEY = 'demo_hr_system_v3';

const todayISO = () => new Date().toISOString().slice(0, 10);
const dateKey = (v) => String(v || '').slice(0, 10);
const dayName = (dateStr) =>
  new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long' });
const nowTime = () =>
  new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

const normalizeEmployee = (e) => ({
  id: e.id,
  name: e.name || '',
  code: String(e.code || '').trim(),
  weekOff: e.weekOff || 'Sunday',
  shift: e.shift || 'A',
  hallId: e.hallId || 'H1',
  hallName: e.hallName || 'Hall 1'
});

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

  // night shifts wrap
  if (shiftCode === 'C' || shiftCode === 'BB') return current >= start || current < end;
  return current >= start && current < end;
};

const initialState = () => ({
  selectedDate: todayISO(),
  currentRole: 'USER',
  currentHrCode: '',
  halls: DEFAULT_HALLS,
  employees: DEFAULT_EMPLOYEES.map(normalizeEmployee),
  entries: [],
  logs: []
});

export function HRProvider({ children }) {
  const [state, setState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return { ...initialState(), ...JSON.parse(saved) };
    } catch {}
    return initialState();
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const resetAll = () => {
    const fresh = initialState();
    setState(fresh);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  const activeEntries = useMemo(
    () => state.entries.filter((e) => dateKey(e.date) === state.selectedDate),
    [state.entries, state.selectedDate]
  );

  const hallUsage = useMemo(() => {
    return state.halls.map((hall) => {
      const used = activeEntries.filter((e) => e.hallId === hall.id).length;
      return {
        ...hall,
        used,
        remaining: Math.max(0, hall.capacity - used),
        full: used >= hall.capacity
      };
    });
  }, [state.halls, activeEntries]);

  const totals = useMemo(
    () => ({
      totalCapacity: state.halls.reduce((a, h) => a + Number(h.capacity || 0), 0),
      selectedCount: activeEntries.length,
      locked: hallUsage.every((h) => h.full)
    }),
    [state.halls, activeEntries.length, hallUsage]
  );

  const employeeMap = useMemo(
    () => new Map(state.employees.map((e) => [String(e.code).trim(), e])),
    [state.employees]
  );

  const getNextHallForEmployee = (employee) => {
    const preferred = state.halls.find((h) => h.id === employee.hallId);
    if (preferred) {
      const used = activeEntries.filter((e) => e.hallId === preferred.id).length;
      if (used < preferred.capacity) return preferred;
    }
    return (
      state.halls.find(
        (h) => activeEntries.filter((e) => e.hallId === h.id).length < h.capacity
      ) || state.halls[0]
    );
  };

  const loginHr = (hrCode) => {
    const ok = DEFAULT_HR_CODES.includes(String(hrCode).trim());
    setState((prev) => ({
      ...prev,
      currentRole: ok ? 'HR' : 'USER',
      currentHrCode: ok ? String(hrCode).trim() : ''
    }));
    return ok;
  };

  // NORMAL SCAN – sab ke liye strict (HR bhi)
  const processEntry = (code) => {
    const emp = employeeMap.get(String(code).trim());
    if (!emp) return { ok: false, text: 'Employee code not found.', type: 'error' };

    const already = activeEntries.some(
      (e) => String(e.code).trim() === String(emp.code).trim()
    );
    if (already)
      return {
        ok: false,
        duplicate: true,
        text: 'Already scanned today.',
        type: 'warn'
      };

    const todayDay = dayName(state.selectedDate);
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    if (emp.weekOff === todayDay) {
      return {
        ok: false,
        weekOff: true,
        employee: emp,
        text: `${emp.name} is week off today.`,
        type: 'warn'
      };
    }

    if (!isInShift(hhmm, emp.shift)) {
      return {
        ok: false,
        shiftBlocked: true,
        employee: emp,
        text: `${emp.name} is outside shift timing.`,
        type: 'warn'
      };
    }

    const hall = getNextHallForEmployee(emp);
    const entry = {
      id: Date.now(),
      code: emp.code,
      name: emp.name,
      weekOff: emp.weekOff,
      shift: emp.shift,
      hallId: hall.id,
      hallName: hall.name,
      status: 'Present',
      source: 'SCAN',
      day: todayDay,
      date: `${state.selectedDate}T${now.toTimeString().slice(0, 8)}`,
      time: nowTime(),
      hrCode: '',
      hrAction: '',
      overrideReason: ''
    };

    setState((prev) => ({
      ...prev,
      entries: [entry, ...prev.entries],
      logs: [
        {
          id: entry.id,
          type: 'SCAN',
          message: `${emp.name} -> ${hall.name}`,
          by: '',
          employeeCode: emp.code,
          hallId: hall.id,
          hallName: hall.name,
          at: entry.date
        },
        ...prev.logs
      ]
    }));

    return { ok: true, entry, text: `${emp.name} saved in ${hall.name}.` };
  };

  // HR OVERRIDE – week off + out-of-shift allowed, tagged
  const hrOverrideEntry = ({ code, hallId, reason }) => {
    const emp = employeeMap.get(String(code).trim());
    const hall = state.halls.find((h) => h.id === hallId);

    if (!emp || !hall || !reason)
      return { ok: false, text: 'Invalid override data.', type: 'error' };
    if (state.currentRole !== 'HR')
      return { ok: false, text: 'HR login required.', type: 'error' };

    const already = activeEntries.find(
      (e) => String(e.code).trim() === String(emp.code).trim()
    );

    const todayDay = dayName(state.selectedDate);
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    const isWeekOff = emp.weekOff === todayDay;
    const outOfShift = !isInShift(hhmm, emp.shift);

    const baseReason = reason || '';
    const reasonTag =
      baseReason +
      (isWeekOff ? ' | WEEK_OFF' : '') +
      (outOfShift ? ' | OUT_OF_SHIFT' : '');

    const entry = {
      id: Date.now(),
      code: emp.code,
      name: emp.name,
      weekOff: emp.weekOff,
      shift: emp.shift,
      hallId: hall.id,
      hallName: hall.name,
      status: 'Present',
      source: 'HR_OVERRIDE',
      day: todayDay,
      date: `${state.selectedDate}T${now.toTimeString().slice(0, 8)}`,
      time: nowTime(),
      hrCode: state.currentHrCode,
      hrAction: already ? 'MOVE_TO_OTHER_HALL' : 'FORCE_ENTRY',
      overrideReason: reasonTag
    };

    setState((prev) => ({
      ...prev,
      entries: already
        ? prev.entries.map((e) => (e.id === already.id ? entry : e))
        : [entry, ...prev.entries],
      logs: [
        {
          id: entry.id,
          type: 'HR_OVERRIDE',
          message: `${emp.name} -> ${hall.name} | ${baseReason}` +
            (isWeekOff ? ' | WEEK_OFF' : '') +
            (outOfShift ? ' | OUT_OF_SHIFT' : ''),
          by: state.currentHrCode,
          employeeCode: emp.code,
          hallId: hall.id,
          hallName: hall.name,
          overrideReason: entry.overrideReason,
          at: entry.date
        },
        ...prev.logs
      ]
    }));

    return { ok: true, entry, text: `HR override saved for ${emp.name}.` };
  };

  // HR TRANSFER – also tagged
  const moveEmployeeToHall = ({ code, hallId, reason }) => {
    const emp = employeeMap.get(String(code).trim());
    const hall = state.halls.find((h) => h.id === hallId);

    if (!emp || !hall || !reason)
      return { ok: false, text: 'Invalid move data.', type: 'error' };
    if (state.currentRole !== 'HR')
      return { ok: false, text: 'HR login required.', type: 'error' };

    const idx = state.entries.findIndex(
      (e) =>
        dateKey(e.date) === state.selectedDate &&
        String(e.code).trim() === String(emp.code).trim()
    );

    if (idx === -1) {
      // aaj koi normal entry hi nahi bani – direct override
      return hrOverrideEntry({ code: emp.code, hallId, reason });
    }

    const todayDay = dayName(state.selectedDate);
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    const isWeekOff = emp.weekOff === todayDay;
    const outOfShift = !isInShift(hhmm, emp.shift);

    const baseReason = reason || '';
    const reasonTag =
      baseReason +
      (isWeekOff ? ' | WEEK_OFF' : '') +
      (outOfShift ? ' | OUT_OF_SHIFT' : '');

    const updated = {
      ...state.entries[idx],
      hallId: hall.id,
      hallName: hall.name,
      source: 'HR_TRANSFER',
      hrCode: state.currentHrCode,
      hrAction: 'MOVE_TO_OTHER_HALL',
      overrideReason: reasonTag
    };

    setState((prev) => {
      const nextEntries = [...prev.entries];
      nextEntries[idx] = updated;

      return {
        ...prev,
        entries: nextEntries,
        logs: [
          {
            id: Date.now(),
            type: 'HR_TRANSFER',
            message: `${emp.name} -> ${hall.name} | ${baseReason}` +
              (isWeekOff ? ' | WEEK_OFF' : '') +
              (outOfShift ? ' | OUT_OF_SHIFT' : ''),
            by: state.currentHrCode,
            employeeCode: emp.code,
            hallId: hall.id,
            hallName: hall.name,
            overrideReason: updated.overrideReason,
            at: new Date().toISOString()
          },
          ...prev.logs
        ]
      };
    });

    return { ok: true, entry: updated, text: `${emp.name} moved to ${hall.name}.` };
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
        totalRecords: dates.length
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
        loginHr,
        processEntry,
        hrOverrideEntry,
        moveEmployeeToHall,
        getAttendanceTracker,
        resetAll
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