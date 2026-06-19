import React, { useMemo, useState } from 'react';
import { Download, FileUp, Plus, Search, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useHR } from '../context/HRContext';
import { DAYS, SHIFT_OPTIONS } from '../data/defaultData';
import { downloadTextFile, formatRosterCsv, parseRosterCsv } from '../utils/helpers';

const emptyForm = {
  name: '',
  code: '',
  weekOff: '',
  shift: ''
};

export default function RosterManager() {
  const { state, addEmployee, updateEmployee, replaceRoster } = useHR();
  const [query, setQuery] = useState('');
  const [form, setForm] = useState(emptyForm);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.employees.filter((emp) => {
      const name = String(emp.name ?? '').toLowerCase();
      const code = String(emp.code ?? '').toLowerCase();
      const shift = String(emp.shift ?? '').toLowerCase();
      return !q || name.includes(q) || code.includes(q) || shift.includes(q);
    });
  }, [query, state.employees]);

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const name = file.name.toLowerCase();

    if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      const normalized = rows.map((row) => ({
        name: row.name || row.Name || '',
        code: row.code || row.Code || '',
        weekOff: row.weekOff || row['Week off'] || row.weekoff || 'Sunday',
        shift: row.shift || row.Shift || row['Shift'] || 'A'
      }));

      if (normalized.length) replaceRoster(normalized);
    } else {
      const text = await file.text();
      const rows = parseRosterCsv(text);
      if (rows.length) replaceRoster(rows);
    }

    event.target.value = '';
  };

  const handleAdd = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim() || !form.weekOff || !form.shift) return;

    const done = addEmployee({
      name: form.name.trim(),
      code: form.code.trim(),
      weekOff: form.weekOff,
      shift: form.shift
    });

    if (done) setForm(emptyForm);
  };

  const exportCsv = () => {
    const data = state.employees.map((emp) => ({
      ...emp,
      shift: emp.shift || 'A'
    }));
    downloadTextFile('roster-template.csv', formatRosterCsv(data), 'text/csv;charset=utf-8;');
  };

  const exportExcel = () => {
    const data = state.employees.map((emp) => ({
      Name: emp.name || '',
      Code: emp.code || '',
      'Week off': emp.weekOff || 'Sunday',
      Shift: emp.shift || 'A'
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Roster');
    XLSX.writeFile(workbook, 'roster-template.xlsx');
  };

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-slate-200 bg-white px-5 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Roster Management</h2>
            <p className="mt-1 text-sm text-slate-500">
              CSV or Excel import bhi kar sakte ho aur manual add bhi. Name, code, week off, aur shift store hoga.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <label className="btn-secondary cursor-pointer">
              <FileUp className="h-4 w-4" />
              Import CSV / Excel
              <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleImport} />
            </label>

            <button className="btn-secondary" onClick={exportCsv} type="button">
              <Download className="h-4 w-4" />
              Export CSV
            </button>

            <button className="btn-secondary" onClick={exportExcel} type="button">
              <FileSpreadsheet className="h-4 w-4" />
              Export Excel
            </button>
          </div>
        </div>
      </div>

      <div className="p-5">
        <form
          onSubmit={handleAdd}
          className="mb-4 grid grid-cols-1 gap-3 rounded-none border border-slate-200 bg-slate-50 p-4 lg:grid-cols-5"
        >
          <input
            className="input lg:col-span-2"
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          />

          <input
            className="input"
            placeholder="Code"
            value={form.code}
            onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
          />

          <select
            className="input text-slate-500"
            value={form.weekOff}
            onChange={(e) => setForm((prev) => ({ ...prev, weekOff: e.target.value }))}
          >
            <option value="" disabled>
              Select week off
            </option>
            {DAYS.map((day) => (
              <option key={day} value={day} className="text-slate-900">
                {day}
              </option>
            ))}
          </select>

          <select
            className="input text-slate-500"
            value={form.shift}
            onChange={(e) => setForm((prev) => ({ ...prev, shift: e.target.value }))}
          >
            <option value="" disabled>
              Select shift
            </option>
            {SHIFT_OPTIONS.map((shift) => (
              <option key={shift.code} value={shift.code} className="text-slate-900">
                {shift.label} ({shift.start} - {shift.end})
              </option>
            ))}
          </select>

          <button className="btn-primary lg:col-span-5" type="submit">
            <Plus className="h-4 w-4" />
            Add employee
          </button>
        </form>

        <div className="mb-4 relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input w-full pl-9"
            placeholder="Search by name, code, or shift"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="table-wrap max-h-[560px] overflow-y-auto overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="sticky top-0 z-10 bg-slate-50">Name</th>
                <th className="sticky top-0 z-10 bg-slate-50">Code</th>
                <th className="sticky top-0 z-10 bg-slate-50">Week off</th>
                <th className="sticky top-0 z-10 bg-slate-50">Shift</th>
              </tr>
            </thead>

            <tbody>
              {filtered.length ? (
                filtered.map((emp) => (
                  <tr key={emp.code}>
                    <td className="font-medium text-slate-900">{emp.name || '-'}</td>
                    <td>{emp.code || '-'}</td>
                    <td>
                      <select
                        className="input min-w-[140px]"
                        value={emp.weekOff || ''}
                        onChange={(e) => updateEmployee(emp.code, { weekOff: e.target.value })}
                      >
                        <option value="" disabled>
                          Select week off
                        </option>
                        {DAYS.map((day) => (
                          <option key={day} value={day}>
                            {day}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        className="input min-w-[180px]"
                        value={emp.shift || ''}
                        onChange={(e) => updateEmployee(emp.code, { shift: e.target.value })}
                      >
                        <option value="" disabled>
                          Select shift
                        </option>
                        {SHIFT_OPTIONS.map((shift) => (
                          <option key={shift.code} value={shift.code}>
                            {shift.label} ({shift.start} - {shift.end})
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="py-10 text-center text-sm text-slate-500">
                    No employees found.
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