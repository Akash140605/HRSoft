import React, { useMemo, useState } from 'react';
import { Download, Search, Trash2, ShieldAlert, Filter, Copy, Check, Eye, PencilLine } from 'lucide-react';
import { useHR } from '../context/HRContext';

export default function EntryTable() {
  const { state, setState, activeEntries, moveEmployeeToHall } = useHR();
  const [query, setQuery] = useState('');
  const [moveCode, setMoveCode] = useState('');
  const [moveHallId, setMoveHallId] = useState('H1');
  const [moveReason, setMoveReason] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [hallFilter, setHallFilter] = useState('');
  const [selectedRow, setSelectedRow] = useState(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return activeEntries.filter((r) => {
      const vals = [r.code, r.name, r.hallName, r.shift, r.source, r.day, r.status, r.overrideReason, r.hrCode].join(' ').toLowerCase();
      const qOk = !q || vals.includes(q);
      const sourceOk = !sourceFilter || String(r.source || '') === sourceFilter;
      const hallOk = !hallFilter || String(r.hallId || '') === hallFilter;
      return qOk && sourceOk && hallOk;
    });
  }, [activeEntries, hallFilter, query, sourceFilter]);

  const exportCsv = () => {
    const headers = ['date', 'day', 'time', 'code', 'name', 'shift', 'weekOff', 'hallId', 'hallName', 'source', 'hrCode', 'hrAction', 'overrideReason'];
    const csv = [headers, ...rows.map((r) => headers.map((h) => r[h] ?? ''))]
      .map((line) => line.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'attendance-sheet.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyRow = async (r) => {
    const text = `${r.code} | ${r.name} | ${r.hallName} | ${r.source}`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
  };

  const onMove = () => {
    const res = moveEmployeeToHall({ code: moveCode, hallId: moveHallId, reason: moveReason });
    alert(res.text);
  };

  const clearFilters = () => {
    setQuery('');
    setSourceFilter('');
    setHallFilter('');
  };

  return (
    <div className="card overflow-hidden border border-slate-200 bg-white shadow-xl">
      <div className="border-b border-slate-200 bg-white px-5 py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Attendance Sheet</h2>
            <p className="text-sm text-slate-500">Search, filter, export, and HR hall transfer.</p>
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={clearFilters} type="button">
              <Filter className="h-4 w-4" />
              Clear Filters
            </button>
            <button className="btn-secondary" onClick={exportCsv} type="button">
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      <div className="border-b border-slate-200 bg-slate-50 p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
          <div className="relative md:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className="input w-full pl-9" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search attendance" />
          </div>
          <select className="input" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
            <option value="">All sources</option>
            <option value="SCAN">SCAN</option>
            <option value="HR_OVERRIDE">HR_OVERRIDE</option>
            <option value="HR_TRANSFER">HR_TRANSFER</option>
          </select>
          <select className="input" value={hallFilter} onChange={(e) => setHallFilter(e.target.value)}>
            <option value="">All halls</option>
            {state.halls.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
          <input className="input" value={moveCode} onChange={(e) => setMoveCode(e.target.value)} placeholder="Employee code for transfer" />
          <select className="input" value={moveHallId} onChange={(e) => setMoveHallId(e.target.value)}>
            {state.halls.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
          <input className="input md:col-span-2" value={moveReason} onChange={(e) => setMoveReason(e.target.value)} placeholder="Reason for hall move" />
          <button className="btn-primary md:col-span-2" type="button" onClick={onMove}>
            <ShieldAlert className="h-4 w-4" />
            HR Move
          </button>
        </div>
      </div>

      <div className="px-4 pt-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Rows</div>
            <div className="mt-1 text-lg font-semibold text-slate-900">{rows.length}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Halls Used</div>
            <div className="mt-1 text-lg font-semibold text-slate-900">{new Set(rows.map((r) => r.hallId)).size}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">HR Entries</div>
            <div className="mt-1 text-lg font-semibold text-slate-900">{rows.filter((r) => r.source !== 'SCAN').length}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Scan Entries</div>
            <div className="mt-1 text-lg font-semibold text-slate-900">{rows.filter((r) => r.source === 'SCAN').length}</div>
          </div>
        </div>
      </div>

      <div className="table-wrap mt-4 max-h-[520px] overflow-auto">
        <table className="min-w-full">
          <thead>
            <tr>
              <th className="sticky top-0 bg-slate-50">Date</th>
              <th className="sticky top-0 bg-slate-50">Day</th>
              <th className="sticky top-0 bg-slate-50">Time</th>
              <th className="sticky top-0 bg-slate-50">Code</th>
              <th className="sticky top-0 bg-slate-50">Name</th>
              <th className="sticky top-0 bg-slate-50">Shift</th>
              <th className="sticky top-0 bg-slate-50">Hall</th>
              <th className="sticky top-0 bg-slate-50">Source</th>
              <th className="sticky top-0 bg-slate-50">Reason</th>
              <th className="sticky top-0 bg-slate-50">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? rows.map((r) => (
              <tr key={r.id} className={selectedRow === r.id ? 'bg-blue-50' : ''} onClick={() => setSelectedRow(r.id)}>
                <td>{String(r.date).slice(0, 10)}</td>
                <td>{r.day}</td>
                <td>{r.time}</td>
                <td className="font-medium text-slate-900">{r.code}</td>
                <td>{r.name}</td>
                <td>{r.shift}</td>
                <td>
                  <span className="badge border border-slate-300 bg-white text-slate-700">{r.hallName}</span>
                </td>
                <td>
                  <span className={`badge ${r.source === 'SCAN' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                    {r.source}
                  </span>
                </td>
                <td>{r.overrideReason || '-'}</td>
                <td>
                  <div className="flex gap-2">
                    <button className="btn-secondary py-2 px-3" type="button" onClick={() => copyRow(r)}>
                      <Copy className="h-4 w-4" />
                    </button>
                    <button className="btn-secondary py-2 px-3" type="button" onClick={() => setSelectedRow(r.id)}>
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      className="btn-danger py-2 px-3"
                      onClick={() => setState((prev) => ({ ...prev, entries: prev.entries.filter((x) => x.id !== r.id) }))}
                      type="button"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="10" className="py-10 text-center text-sm text-slate-500">No attendance records found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedRow ? (
        <div className="border-t border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          Selected entry details are highlighted in table. Use export or delete actions from the row.
        </div>
      ) : null}
    </div>
  );
}