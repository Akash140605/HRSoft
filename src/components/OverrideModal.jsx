import React, { useEffect, useState } from 'react';
import { X, ShieldAlert, Save } from 'lucide-react';
import { useHR } from '../context/HRContext';

const emptyForm = {
  code: '',
  name: '',
  shift: '',
  time: '',
  weekOff: '',
  overrideReason: '',
  hallName: 'HR Override',
  overriddenBy: 'HR'
};

export default function OverrideModal({ open, onClose, employee }) {
  const { overrideEntry, SHIFT_OPTIONS } = useHR();
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (open) {
      setForm({
        code: employee?.code || '',
        name: employee?.name || '',
        shift: employee?.shift || '',
        time: '',
        weekOff: employee?.weekOff || '',
        overrideReason: '',
        hallName: 'HR Override',
        overriddenBy: 'HR'
      });
    }
  }, [open, employee]);

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const ok = overrideEntry(form);
    if (ok) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="w-full max-w-2xl rounded-none bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <ShieldAlert className="h-5 w-5 text-amber-600" />
              HR Override
            </h3>
            <p className="mt-1 text-sm text-slate-500">Rejected punch ko manual override karke save karo.</p>
          </div>
          <button onClick={onClose} className="rounded-none p-2 text-slate-500 hover:bg-slate-100" type="button">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Employee code</label>
            <input
              className="input"
              value={form.code}
              onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Employee name</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Shift</label>
            <select
              className="input"
              value={form.shift}
              onChange={(e) => setForm((p) => ({ ...p, shift: e.target.value }))}
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
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Punch time</label>
            <input
              className="input"
              type="time"
              value={form.time}
              onChange={(e) => setForm((p) => ({ ...p, time: e.target.value }))}
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-600">Override reason</label>
            <textarea
              className="input min-h-[100px]"
              value={form.overrideReason}
              onChange={(e) => setForm((p) => ({ ...p, overrideReason: e.target.value }))}
              placeholder="Why override is needed?"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Hall label</label>
            <input
              className="input"
              value={form.hallName}
              onChange={(e) => setForm((p) => ({ ...p, hallName: e.target.value }))}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Approved by</label>
            <input
              className="input"
              value={form.overriddenBy}
              onChange={(e) => setForm((p) => ({ ...p, overriddenBy: e.target.value }))}
            />
          </div>

          <div className="md:col-span-2 flex justify-end gap-2 border-t border-slate-200 pt-4">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              <Save className="h-4 w-4" />
              Save override
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}