import React, { useMemo, useState } from 'react';
import { CalendarDays, Clock3, Search, UserCheck2, Users, ShieldCheck } from 'lucide-react';
import { useHR } from '../context/HRContext';

export default function EmployeeTracker() {
  const { state, totals, trackerRows, SHIFT_OPTIONS } = useHR();
  const [query, setQuery] = useState('');

  const shiftLabelMap = useMemo(() => {
    return new Map(SHIFT_OPTIONS.map((item) => [item.code, `${item.label} (${item.start} - ${item.end})`]));
  }, [SHIFT_OPTIONS]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return trackerRows.filter((row) => {
      const name = String(row.name ?? '').toLowerCase();
      const code = String(row.code ?? '').toLowerCase();
      const hallName = String(row.hallName ?? '').toLowerCase();
      const shift = String(row.shift ?? '').toLowerCase();
      return !q || name.includes(q) || code.includes(q) || hallName.includes(q) || shift.includes(q);
    });
  }, [query, trackerRows]);

  const cards = [
    { title: 'Total employees', value: state.employees.length, icon: Users, tone: 'text-brand-700 bg-brand-50 border-brand-200' },
    { title: 'Present today', value: totals.selectedCount, icon: UserCheck2, tone: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
    { title: 'Remaining seats', value: totals.remainingCount, icon: Clock3, tone: 'text-blue-700 bg-blue-50 border-blue-200' },
    { title: 'Shift rules', value: '5 types', icon: ShieldCheck, tone: 'text-violet-700 bg-violet-50 border-violet-200' }
  ];

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-slate-200 bg-white px-5 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Employee Tracker</h2>
            <p className="mt-1 text-sm text-slate-500">
              Selected date ke records, shift ke saath yahan dikh rahe hain.
            </p>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input w-full pl-9 sm:w-72"
              placeholder="Search name, code, shift, or hall"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="rounded-none border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.title}</div>
                  <div className="mt-2 text-2xl font-bold text-slate-900">{item.value}</div>
                </div>
                <div className={`rounded-none border p-3 ${item.tone}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-slate-200 bg-white px-5 py-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Today’s attendance</h3>
          <span className="text-xs text-slate-500">{rows.length} records</span>
        </div>

        <div className="table-wrap max-h-[520px] overflow-y-auto overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="sticky top-0 z-10 bg-slate-50">Date</th>
                <th className="sticky top-0 z-10 bg-slate-50">Day</th>
                <th className="sticky top-0 z-10 bg-slate-50">Time</th>
                <th className="sticky top-0 z-10 bg-slate-50">Code</th>
                <th className="sticky top-0 z-10 bg-slate-50">Name</th>
                <th className="sticky top-0 z-10 bg-slate-50">Shift</th>
                <th className="sticky top-0 z-10 bg-slate-50">Week off</th>
                <th className="sticky top-0 z-10 bg-slate-50">Hall</th>
                <th className="sticky top-0 z-10 bg-slate-50">Status</th>
              </tr>
            </thead>

            <tbody>
              {rows.length ? (
                rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.date ? String(row.date).slice(0, 10) : '-'}</td>
                    <td>{row.day || '-'}</td>
                    <td>{row.time || '-'}</td>
                    <td className="font-medium text-slate-900">{row.code || '-'}</td>
                    <td>{row.name || '-'}</td>
                    <td>
                      <span className="badge rounded-none border border-violet-200 bg-violet-50 px-2.5 py-1 text-violet-700">
                        {shiftLabelMap.get(row.shift) || row.shift || '-'}
                      </span>
                    </td>
                    <td>{row.weekOff || '-'}</td>
                    <td>
                      <span className="badge rounded-none border border-brand-200 bg-brand-50 px-2.5 py-1 text-brand-700">
                        {row.hallName || '-'}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge rounded-none border px-2.5 py-1 ${
                          row.status === 'WO'
                            ? 'border-amber-200 bg-amber-50 text-amber-800'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                        }`}
                      >
                        {row.status || 'Present'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="py-10 text-center text-sm text-slate-500">
                    No attendance records for selected date.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}