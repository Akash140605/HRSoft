import React, { useEffect, useRef, useState } from "react";
import { X, ShieldAlert, Save, Loader2 } from "lucide-react";
import { useHR } from "../context/HRContext";

const emptyForm = {
  code: "",
  name: "",
  shift: "",
  time: "",
  weekOff: "",
  overrideReason: "",
  hallName: "HR Override",
  overriddenBy: "HR",
};

export default function OverrideModal({ open, onClose, employee }) {
  const { overrideEntry, SHIFT_OPTIONS } = useHR();
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const firstInputRef = useRef(null);
  const closeBtnRef = useRef(null);

  useEffect(() => {
    if (open) {
      setForm({
        code: employee?.code || "",
        name: employee?.name || "",
        shift: employee?.shift || "",
        time: "",
        weekOff: employee?.weekOff || "",
        overrideReason: "",
        hallName: "HR Override",
        overriddenBy: "HR",
      });
      setTimeout(() => firstInputRef.current?.focus(), 0);
    } else {
      setForm(emptyForm);
    }
  }, [open, employee]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (!open) return;
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.code.trim() || !form.name.trim() || !form.shift.trim() || !form.overrideReason.trim()) {
      alert("Code, name, shift aur reason required hain.");
      return;
    }

    setLoading(true);
    try {
      const res = await overrideEntry(form);
      if (res?.ok) onClose();
      else alert(res?.text || "Override failed");
    } finally {
      setLoading(false);
    }
  };

  const stopBackdropClose = (e) => e.stopPropagation();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="override-title"
      aria-describedby="override-desc"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-none bg-white shadow-xl outline-none"
        onMouseDown={stopBackdropClose}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h3 id="override-title" className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <ShieldAlert className="h-5 w-5 text-amber-600" />
              HR Override
            </h3>
            <p id="override-desc" className="mt-1 text-sm text-slate-500">
              Rejected punch ko manual override karke save karo.
            </p>
          </div>

          <button
            ref={closeBtnRef}
            onClick={onClose}
            className="rounded-none p-2 text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#E0222A]"
            type="button"
            disabled={loading}
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
          <div>
            <label htmlFor="override-code" className="mb-1 block text-xs font-medium text-slate-600">
              Employee code
            </label>
            <input
              id="override-code"
              ref={firstInputRef}
              className="input"
              value={form.code}
              onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="override-name" className="mb-1 block text-xs font-medium text-slate-600">
              Employee name
            </label>
            <input
              id="override-name"
              className="input"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="override-shift" className="mb-1 block text-xs font-medium text-slate-600">
              Shift
            </label>
            <select
              id="override-shift"
              className="input"
              value={form.shift}
              onChange={(e) => setForm((p) => ({ ...p, shift: e.target.value }))}
              disabled={loading}
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
            <label htmlFor="override-time" className="mb-1 block text-xs font-medium text-slate-600">
              Punch time
            </label>
            <input
              id="override-time"
              className="input"
              type="time"
              value={form.time}
              onChange={(e) => setForm((p) => ({ ...p, time: e.target.value }))}
              disabled={loading}
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="override-reason" className="mb-1 block text-xs font-medium text-slate-600">
              Override reason
            </label>
            <textarea
              id="override-reason"
              className="input min-h-[100px]"
              value={form.overrideReason}
              onChange={(e) => setForm((p) => ({ ...p, overrideReason: e.target.value }))}
              placeholder="Why override is needed?"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="override-hall" className="mb-1 block text-xs font-medium text-slate-600">
              Hall label
            </label>
            <input
              id="override-hall"
              className="input"
              value={form.hallName}
              onChange={(e) => setForm((p) => ({ ...p, hallName: e.target.value }))}
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="override-approved" className="mb-1 block text-xs font-medium text-slate-600">
              Approved by
            </label>
            <input
              id="override-approved"
              className="input"
              value={form.overriddenBy}
              onChange={(e) => setForm((p) => ({ ...p, overriddenBy: e.target.value }))}
              disabled={loading}
            />
          </div>

          <div className="md:col-span-2 flex justify-end gap-2 border-t border-slate-200 pt-4">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save override
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}