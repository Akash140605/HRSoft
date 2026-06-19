import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useHR } from '../context/HRContext';

export default function EmployeeTracker() {
  const { getAttendanceTracker, state } = useHR();
  const [query, setQuery] = useState('');
  const [hallId, setHallId] = useState('');
  const [shift, setShift] = useState('');
  const [absentDaysMin, setAbsentDaysMin] = useState('');

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return getAttendanceTracker().filter((e) => {
      const text = `${e.name} ${e.code} ${e.hallName} ${e.shift} ${e.weekOff}`.toLowerCase();
      const hallOk = !hallId || e.hallId === hallId;
      const shiftOk = !shift || e.shift === shift;
      const absentOk = !absentDaysMin || Number(e.absentDays) >= Number(absentDaysMin);
      const queryOk = !q || text.includes(q);
      return hallOk && shiftOk && absentOk && queryOk;
    });
  }, [absentDaysMin, getAttendanceTracker, hallId, query, shift]);

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-slate-200 bg-white px-5 py-4">
        <h2 className="text-base font-semibold text-slate-900">Employee Tracker</h2>
        <p className="mt-1 text-sm text-slate-500">Absent, hall, shift, and week-off tracking</p>
      </div>

      <div className="border-b border-slate-200 bg-slate-50 p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <div className="relative md:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className="input w-full pl-9" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search employee" />
          </div>
          <select className="input" value={hallId} onChange={(e) => setHallId(e.target.value)}>
            <option value="">All halls</option>
            {state.halls.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
          <select className="input" value={shift} onChange={(e) => setShift(e.target.value)}>
            <option value="">All shifts</option>
            {['A', 'B', 'C', 'AA', 'BB'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <input className="input" value={absentDaysMin} onChange={(e) => setAbsentDaysMin(e.target.value)} placeholder="Min absent days" />
        </div>
      </div>

      <div className="table-wrap max-h-[520px] overflow-auto">
        <table className="min-w-full">
          <thead>
            <tr>
              <th className="sticky top-0 bg-slate-50">Code</th>
              <th className="sticky top-0 bg-slate-50">Name</th>
              <th className="sticky top-0 bg-slate-50">Hall</th>
              <th className="sticky top-0 bg-slate-50">Shift</th>
              <th className="sticky top-0 bg-slate-50">Week Off</th>
              <th className="sticky top-0 bg-slate-50">Present Days</th>
              <th className="sticky top-0 bg-slate-50">Absent Days</th>
              <th className="sticky top-0 bg-slate-50">Last Seen</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? rows.map((r) => (
              <tr key={r.code}>
                <td className="font-medium text-slate-900">{r.code}</td>
                <td>{r.name}</td>
                <td>{r.hallName}</td>
                <td>{r.shift}</td>
                <td>{r.weekOff}</td>
                <td>{r.presentDays}</td>
                <td>{r.absentDays}</td>
                <td>{r.lastSeen ? String(r.lastSeen).slice(0, 10) : '-'}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan="8" className="py-10 text-center text-sm text-slate-500">No tracker data found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}