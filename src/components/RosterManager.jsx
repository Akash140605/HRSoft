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
    setEditingId(null);
    setForm({ name: '', code: '', weekOff: 'Sunday', shift: 'A', hallId: state.halls?.[0]?.id || 'H1' });
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
    if (editingId === id) {
      setEditingId(null);
      setForm({ name: '', code: '', weekOff: 'Sunday', shift: 'A', hallId: state.halls?.[0]?.id || 'H1' });
    }
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

        const name = obj['Operator Name'] || obj.name || '';
        const code = obj['Code'] || obj.code || '';
        const weekOff = obj['WeakOff'] || obj['weekOff'] || 'Sunday';
        const shift = obj['Shift'] || obj.shift || 'A';
        const hallRaw = obj['Hall'] || obj.hallName || '';

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
    <div className="overflow-hidden border-2 border-slate-300 bg-white shadow-xl">
      {/* Header - PURE #23205C */}
      <div className="border-b border-slate-300 bg-[#23205C] px-5 py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Roster Manager</h2>
            <p className="mt-1 text-sm text-white/70">Hall-attached employee master</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="border-2 border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20" type="button" onClick={exportCsv}>
              <Download className="h-4 w-4 inline mr-1" />
              Export CSV
            </button>
            <button className="border-2 border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20" type="button" onClick={exportExcel}>
              <FileSpreadsheet className="h-4 w-4 inline mr-1" />
              Export Excel
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-5">
        {/* Stats */}
        <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="border-2 border-slate-300 bg-white p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <Users className="h-4 w-4" />
              Total Employees
            </div>
            <div className="mt-2 text-xl font-bold text-slate-900">{stats.total}</div>
          </div>
          <div className="border-2 border-slate-300 bg-white p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <Building2 className="h-4 w-4" />
              Halls Used
            </div>
            <div className="mt-2 text-xl font-bold text-slate-900">{stats.hallsUsed}</div>
          </div>
          <div className="border-2 border-slate-300 bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Mode</div>
            <div className="mt-2 text-xl font-bold text-slate-900">{editingId ? 'Edit' : 'Add'}</div>
          </div>
          <div className="border-2 border-slate-300 bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Visible</div>
            <div className="mt-2 text-xl font-bold text-slate-900">{rows.length}</div>
          </div>
        </div>

        {/* Message */}
        {message ? (
          <div className="mb-5 flex items-center gap-2 border-2 border-[#E0222A] bg-[#E0222A]/10 px-4 py-3 text-sm text-[#E0222A]">
            <AlertCircle className="h-4 w-4" />
            {message}
          </div>
        ) : null}

        {/* Form */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
          <input className="border-2 border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none hover:border-slate-400 focus:border-[#E0222A] focus:ring-4 focus:ring-[#E0222A]/10 md:col-span-2" placeholder="Name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          <input className="border-2 border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none hover:border-slate-400 focus:border-[#E0222A] focus:ring-4 focus:ring-[#E0222A]/10" placeholder="Code" value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} />
          <select className="border-2 border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none hover:border-slate-400 focus:border-[#E0222A] focus:ring-4 focus:ring-[#E0222A]/10" value={form.shift} onChange={(e) => setForm((p) => ({ ...p, shift: e.target.value }))}>
            {['A', 'B', 'C', 'AA', 'BB'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="border-2 border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none hover:border-slate-400 focus:border-[#E0222A] focus:ring-4 focus:ring-[#E0222A]/10" value={form.weekOff} onChange={(e) => setForm((p) => ({ ...p, weekOff: e.target.value }))}>
            {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select className="border-2 border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none hover:border-slate-400 focus:border-[#E0222A] focus:ring-4 focus:ring-[#E0222A]/10 md:col-span-2" value={form.hallId} onChange={(e) => setForm((p) => ({ ...p, hallId: e.target.value }))}>
            {state.halls.map((h) => <option key={h.id} value={h.id}>{h.name} ({h.capacity})</option>)}
          </select>
          <button className="bg-[#E0222A] px-4 py-3 font-semibold text-white shadow-lg shadow-[#E0222A]/25 hover:scale-[1.02] hover:shadow-[#E0222A]/30 active:scale-[0.98] md:col-span-2" type="button" onClick={upsertEmp}>
            {editingId ? <Save className="h-4 w-4 inline mr-1" /> : <Plus className="h-4 w-4 inline mr-1" />}
            {editingId ? 'Update Employee' : 'Add Employee'}
          </button>
          <button className="border-2 border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50 md:col-span-2" type="button" onClick={() => { setEditingId(null); setForm({ name: '', code: '', weekOff: 'Sunday', shift: 'A', hallId: state.halls?.[0]?.id || 'H1' }); }}>
            <X className="h-4 w-4 inline mr-1" />
            Reset
          </button>
          <label className="border-2 border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50 md:col-span-6 cursor-pointer inline-flex items-center justify-center gap-2">
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

        {/* Search */}
        <div className="mt-5 relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="border-2 border-slate-300 bg-white px-4 py-3 pl-9 text-slate-900 placeholder:text-slate-400 outline-none hover:border-slate-400 focus:border-[#E0222A] focus:ring-4 focus:ring-[#E0222A]/10 w-full" placeholder="Search roster" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>

        {/* Table */}
        <div className="mt-5 overflow-hidden border-2 border-slate-300">
          <div className="table-wrap max-h-[560px] overflow-auto">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="sticky top-0 border-b-2 border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-700">Name</th>
                  <th className="sticky top-0 border-b-2 border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-700">Code</th>
                  <th className="sticky top-0 border-b-2 border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-700">Hall</th>
                  <th className="sticky top-0 border-b-2 border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-700">Shift</th>
                  <th className="sticky top-0 border-b-2 border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-700">Week Off</th>
                  <th className="sticky top-0 border-b-2 border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-700">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.length ? rows.map((r) => (
                  <tr key={r.id} className="border-b border-slate-200">
                    <td className="px-3 py-3 text-sm font-bold text-slate-900">{r.name}</td>
                    <td className="px-3 py-3 text-sm text-slate-700">{r.code}</td>
                    <td className="px-3 py-3 text-sm">
                      <span className="border-2 border-slate-300 bg-white px-2 py-1 text-slate-700">{r.hallName}</span>
                    </td>
                    <td className="px-3 py-3 text-sm text-slate-700">{r.shift}</td>
                    <td className="px-3 py-3 text-sm text-slate-700">{r.weekOff}</td>
                    <td className="px-3 py-3 text-sm">
                      <div className="flex flex-wrap gap-2">
                        <button className="border-2 border-slate-300 bg-white px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50" type="button" onClick={() => startEdit(r)}>
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button className="border-2 border-[#E0222A] bg-[#E0222A]/10 px-3 py-2 font-semibold text-[#E0222A] hover:bg-[#E0222A]/20" type="button" onClick={() => removeRow(r.id)}>
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