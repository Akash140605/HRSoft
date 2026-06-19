import React, { useMemo, useState } from 'react';
import { Download, FileUp, Plus, Search, Trash2, Edit3, Save, FileSpreadsheet, X, AlertCircle, Building2, Users } from 'lucide-react';
import { useHR } from '../context/HRContext';

export default function RosterManager() {
 const { state, setState, resetAll } = useHR();
  const [query, setQuery] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', code: '', weekOff: 'Sunday', shift: 'A', hallId: state.halls?.[0]?.id || 'H1' });
  const [message, setMessage] = useState('');

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.employees.filter((e) => !q || `${e.name} ${e.code} ${e.hallName} ${e.shift} ${e.weekOff}`.toLowerCase().includes(q));
  }, [query, state.employees]);
const resetForm = () => {
  const ok = window.confirm('Saara local data (roster + entries + logs) reset ho jayega. Continue?');
  if (!ok) return;
  resetAll();
  setMessage('All local data cleared.');
};
  const upsertEmp = () => {
    if (!form.name.trim() || !form.code.trim()) {
      setMessage('Name aur code required hai.');
      return;
    }
    const hall = state.halls.find((h) => h.id === form.hallId) || state.halls[0];
    const payload = {
      id: editingId ?? Date.now(),
      name: form.name.trim(),
      code: form.code.trim(),
      weekOff: form.weekOff,
      shift: form.shift,
      hallId: hall.id,
      hallName: hall.name
    };

    setState((prev) => {
      const exists = prev.employees.some((e) => e.id === payload.id);
      return {
        ...prev,
        employees: exists ? prev.employees.map((e) => (e.id === payload.id ? payload : e)) : [payload, ...prev.employees]
      };
    });

    setMessage(editingId ? 'Employee updated.' : 'Employee added.');
    resetForm();
  };

  const startEdit = (row) => {
    setEditingId(row.id);
    setForm({
      name: row.name || '',
      code: row.code || '',
      weekOff: row.weekOff || 'Sunday',
      shift: row.shift || 'A',
      hallId: row.hallId || state.halls?.[0]?.id || 'H1'
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const removeRow = (id) => {
    setState((prev) => ({ ...prev, employees: prev.employees.filter((e) => e.id !== id) }));
    if (editingId === id) resetForm();
    setMessage('Employee removed.');
  };

  const headers = ['id', 'name', 'code', 'weekOff', 'shift', 'hallId', 'hallName'];
  const toCsv = (data) => [headers, ...data.map((r) => headers.map((h) => r[h] ?? ''))].map((line) => line.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(',')).join('\n');

  const exportCsv = () => {
    const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'roster.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportExcel = () => {
    const html = `
      <html><head><meta charset="utf-8" /></head><body>
      <table border="1">
        <tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr>
        ${rows.map((r) => `<tr>${headers.map((h) => `<td>${String(r[h] ?? '').replaceAll('<','&lt;').replaceAll('>','&gt;')}</td>`).join('')}</tr>`).join('')}
      </table>
      </body></html>
    `;
    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'roster.xls';
    a.click();
    URL.revokeObjectURL(url);
  };

const importCsv = (file) => {
  const reader = new FileReader();
  reader.onload = () => {
    const text = String(reader.result || '').trim();
    if (!text) return;

    const lines = text.split(/\r?\n/).filter(Boolean);

    // first line: Operator Name,Code,WeakOff,Shift,Hall,
    const head = lines[0]
      .split(',')
      .map((s) => s.replaceAll('"', '').trim());

    const next = lines.slice(1).map((line) => {
      const cols =
        line
          .match(/("[^"]*(?:""[^"]*)*"|[^,]+)/g)
          ?.map((v) => v.replace(/^"|"$/g, '').replaceAll('""', '"')) || [];

      const obj = {};
      head.forEach((h, i) => {
        obj[h] = cols[i] || '';
      });

      // map tumhare column names → internal fields
      const name = obj['Operator Name'] || obj.name || '';
      const code = obj['Code'] || obj.code || '';
      const weekOff = obj['WeakOff'] || obj['weekOff'] || 'Sunday';
      const shift = obj['Shift'] || obj.shift || 'A';
      const hallRaw = obj['Hall'] || obj.hallName || '';

      // Hall 1 → hall object (id + name)
      const hall =
        state.halls.find(
          (h) =>
            h.name.toLowerCase() === String(hallRaw).toLowerCase() ||
            h.id.toLowerCase() === String(hallRaw).toLowerCase()
        ) || state.halls[0];

      return {
        id: Date.now() + Math.random(),
        name,
        code,
        weekOff,
        shift,
        hallId: hall.id,
        hallName: hall.name
      };
    });

    setState((prev) => ({ ...prev, employees: [...next, ...prev.employees] }));
    setMessage(`${next.length} records imported.`);
  };

  reader.readAsText(file);
};
  const stats = useMemo(() => {
    const byHall = new Map();
    state.employees.forEach((e) => byHall.set(e.hallId, (byHall.get(e.hallId) || 0) + 1));
    return { total: state.employees.length, hallsUsed: byHall.size };
  }, [state.employees]);

  return (
    <div className="card overflow-hidden border border-slate-200 bg-white shadow-xl">
      <div className="border-b border-slate-200 bg-gradient-to-r from-blue-700 to-red-600 px-5 py-4 text-white">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Roster Manager</h2>
            <p className="text-sm text-blue-100">Hall-attached employee master</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary bg-white/10 text-white border-white/20 hover:bg-white/20" type="button" onClick={exportCsv}>
              <Download className="h-4 w-4" />
              Export CSV
            </button>
            <button className="btn-secondary bg-white/10 text-white border-white/20 hover:bg-white/20" type="button" onClick={exportExcel}>
              <FileSpreadsheet className="h-4 w-4" />
              Export Excel
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-5">
        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500"><Users className="h-4 w-4" />Total Employees</div>
            <div className="mt-1 text-lg font-semibold text-slate-900">{stats.total}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500"><Building2 className="h-4 w-4" />Halls Used</div>
            <div className="mt-1 text-lg font-semibold text-slate-900">{stats.hallsUsed}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Mode</div>
            <div className="mt-1 text-lg font-semibold text-slate-900">{editingId ? 'Edit' : 'Add'}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Visible</div>
            <div className="mt-1 text-lg font-semibold text-slate-900">{rows.length}</div>
          </div>
        </div>

        {message ? (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <AlertCircle className="h-4 w-4" />
            {message}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
          <input className="input md:col-span-2" placeholder="Name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          <input className="input" placeholder="Code" value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} />
          <select className="input" value={form.shift} onChange={(e) => setForm((p) => ({ ...p, shift: e.target.value }))}>
            {['A', 'B', 'C', 'AA', 'BB'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="input" value={form.weekOff} onChange={(e) => setForm((p) => ({ ...p, weekOff: e.target.value }))}>
            {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select className="input md:col-span-2" value={form.hallId} onChange={(e) => setForm((p) => ({ ...p, hallId: e.target.value }))}>
            {state.halls.map((h) => <option key={h.id} value={h.id}>{h.name} ({h.capacity})</option>)}
          </select>
          <button className="btn-primary md:col-span-3" type="button" onClick={upsertEmp}>
            {editingId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {editingId ? 'Update Employee' : 'Add Employee'}
          </button>
          <button className="btn-secondary md:col-span-3" type="button" onClick={resetForm}>
            <X className="h-4 w-4" />
            Reset
          </button>
          <label className="btn-secondary md:col-span-6 cursor-pointer inline-flex items-center justify-center gap-2">
            <FileUp className="h-4 w-4" />
            Import CSV
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && importCsv(e.target.files[0])}
            />
          </label>
        </div>

        <div className="mt-4 relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input w-full pl-9" placeholder="Search roster" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
          <div className="table-wrap max-h-[560px] overflow-auto">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="sticky top-0 bg-slate-50">Name</th>
                  <th className="sticky top-0 bg-slate-50">Code</th>
                  <th className="sticky top-0 bg-slate-50">Hall</th>
                  <th className="sticky top-0 bg-slate-50">Shift</th>
                  <th className="sticky top-0 bg-slate-50">Week Off</th>
                  <th className="sticky top-0 bg-slate-50">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.length ? rows.map((r) => (
                  <tr key={r.id}>
                    <td className="font-medium text-slate-900">{r.name}</td>
                    <td>{r.code}</td>
                    <td>{r.hallName}</td>
                    <td>{r.shift}</td>
                    <td>{r.weekOff}</td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        <button className="btn-secondary py-2 px-3" type="button" onClick={() => startEdit(r)}>
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button className="btn-danger py-2 px-3" type="button" onClick={() => removeRow(r.id)}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-sm text-slate-500">No roster records found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}