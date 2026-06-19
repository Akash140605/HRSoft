import React, { useMemo, useState } from 'react';
import { Download, Trash2, Search } from 'lucide-react';
import { useHR } from '../context/HRContext';
import { downloadTextFile } from '../utils/helpers';

export default function EntryTable() {
  const { allAttendanceRows, removeEntry, SHIFT_OPTIONS } = useHR();
  const [query, setQuery] = useState('');

  const shiftLabelMap = useMemo(() => {
    return new Map(SHIFT_OPTIONS.map((item) => [item.code, `${item.label} (${item.start} - ${item.end})`]));
  }, [SHIFT_OPTIONS]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allAttendanceRows.filter((row) => {
      const code = String(row.code ?? '').toLowerCase();
      const name = String(row.name ?? '').toLowerCase();
      const hallName = String(row.hallName ?? '').toLowerCase();
      const status = String(row.status ?? '').toLowerCase();
      const date = String(row.date ?? '').toLowerCase();
      const shift = String(row.shift ?? '').toLowerCase();
      return (
        !q ||
        name.includes(q) ||
        code.includes(q) ||
        hallName.includes(q) ||
        status.includes(q) ||
        date.includes(q) ||
        shift.includes(q)
      );
    });
  }, [query, allAttendanceRows]);

  const exportEntries = () => {
    const headers = ['date', 'day', 'time', 'code', 'name', 'weekOff', 'shift', 'hallName', 'status', 'source', 'overrideReason'];
    const csv = [
      headers,
      ...rows.map((entry) => [
        entry.date ?? '',
        entry.day ?? '',
        entry.time ?? '',
        entry.code ?? '',
        entry.name ?? '',
        entry.weekOff ?? '',
        entry.shift ?? '',
        entry.hallName ?? '',
        entry.status ?? '',
        entry.source ?? '',
        entry.overrideReason ?? ''
      ])
    ]
      .map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
      .join('\n');

    downloadTextFile('attendance-sheet.csv', csv, 'text/csv;charset=utf-8;');
  };

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-slate-200 bg-white px-5 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Attendance Sheet</h2>
            <p className="mt-1 text-sm text-slate-500">All attendance records are shown here.</p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="input w-full pl-9 sm:w-72"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search records"
              />
            </div>

            <button className="btn-secondary" onClick={exportEntries} type="button">
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>
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
              <th className="sticky top-0 z-10 bg-slate-50">Action</th>
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
                  <td>
                    <button className="btn-danger px-3 py-2" onClick={() => removeEntry(row.id)} type="button">
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="10" className="py-10 text-center text-sm text-slate-500">
                  No attendance records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}