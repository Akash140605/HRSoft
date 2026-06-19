import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, ScanBarcode, Keyboard, Menu, X, CheckCircle2, XCircle, AlertTriangle, ShieldAlert, Loader2, ScanLine, Copy, Search } from 'lucide-react';
import { useHR } from '../context/HRContext';

function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 2200);
    return () => clearTimeout(t);
  }, [toast, onClose]);

  if (!toast) return null;
  const cls = toast.type === 'success' ? 'bg-emerald-600 text-white' : toast.type === 'error' ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white';
  const Icon = toast.type === 'success' ? CheckCircle2 : toast.type === 'error' ? XCircle : AlertTriangle;

  return (
    <div className={`fixed left-1/2 top-4 z-[100] -translate-x-1/2 rounded-xl px-4 py-3 shadow-lg ${cls}`}>
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="h-4 w-4" />
        {toast.message}
      </div>
    </div>
  );
}

export default function ScannerPanel() {
  const { state, loginHr, processEntry, hrOverrideEntry, moveEmployeeToHall, hallUsage, totals, activeEntries } = useHR();
  const [code, setCode] = useState('');
  const [hrLoginCode, setHrLoginCode] = useState('');
  const [selectedHall, setSelectedHall] = useState('H1');
  const [reason, setReason] = useState('');
  const [toast, setToast] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mode, setMode] = useState('scan');
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const canScan = !totals.locked;
  const codeInputRef = useRef(null);
  const empResult = useMemo(() => state.employees.find((e) => String(e.code).trim() === String(code).trim()), [code, state.employees]);
  const recentRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return activeEntries.filter((e) => !q || `${e.name} ${e.code} ${e.hallName} ${e.source} ${e.overrideReason}`.toLowerCase().includes(q));
  }, [activeEntries, query]);

  const pushToast = (type, message) => setToast({ type, message });

  const focusCode = () => codeInputRef.current?.focus();

  const onHrLogin = () => {
    const ok = loginHr(hrLoginCode);
    pushToast(ok ? 'success' : 'error', ok ? 'HR login successful.' : 'Invalid HR code.');
  };

  const onProcess = async () => {
    if (!code.trim()) return pushToast('error', 'Code enter karo.');
    setBusy(true);
    const res = await processEntry(code.trim());
    pushToast(res.ok ? 'success' : res.type || 'error', res.text || 'Done');
    if (!res.ok && res.weekOff && state.currentRole === 'HR') {
      const ok = window.confirm('Week off hai. HR override karna hai?');
      if (ok) {
        const ov = hrOverrideEntry({ code: code.trim(), hallId: selectedHall, reason: reason || 'Week off override by HR' });
        pushToast(ov.ok ? 'success' : 'error', ov.text);
        if (ov.ok) setCode('');
      }
    }
    if (res.ok) setCode('');
    setBusy(false);
    focusCode();
  };

  const onMove = async () => {
    if (!code.trim() || !selectedHall || !reason.trim()) return pushToast('error', 'Code, hall, reason sab required hain.');
    const res = moveEmployeeToHall({ code: code.trim(), hallId: selectedHall, reason: reason.trim() });
    pushToast(res.ok ? 'success' : 'error', res.text);
    if (res.ok) setCode('');
    focusCode();
  };

  const onQuickCopy = async () => {
    try {
      await navigator.clipboard.writeText(code.trim());
      pushToast('success', 'Code copied.');
    } catch {
      pushToast('error', 'Copy failed.');
    }
  };

  return (
    <div className="card overflow-hidden border border-slate-200 bg-white shadow-xl">
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="border-b border-slate-200 bg-gradient-to-r from-blue-700 to-red-600 px-5 py-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Dixon Dehradun Attendance</h2>
            <p className="text-sm text-blue-100">Blue-red demo panel with hall control</p>
          </div>
          <button type="button" className="md:hidden" onClick={() => setMenuOpen((v) => !v)}>
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      <div className={`${menuOpen ? 'block' : 'hidden'} border-b border-slate-200 bg-slate-50 p-4 md:block`}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <input className="input" placeholder="HR 6-digit code" value={hrLoginCode} onChange={(e) => setHrLoginCode(e.target.value)} />
          <button className="btn-primary" type="button" onClick={onHrLogin}>HR Login</button>
          <input className="input" placeholder="Select employee code" value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && onProcess()} ref={codeInputRef} />
          <input className="input" placeholder="Reason / override note" value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
          <select className="input" value={selectedHall} onChange={(e) => setSelectedHall(e.target.value)}>
            {state.halls.map((h) => (
              <option key={h.id} value={h.id}>{h.name} ({h.capacity})</option>
            ))}
          </select>
          <button className="btn-secondary" type="button" onClick={() => setMode(mode === 'scan' ? 'manual' : 'scan')}>
            <Keyboard className="h-4 w-4" />
            {mode === 'scan' ? 'Manual Mode' : 'Scan Mode'}
          </button>
          <button className="btn-primary" type="button" onClick={onProcess} disabled={busy || !canScan}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
            Process Entry
          </button>
          <button className="btn-danger" type="button" onClick={onMove}>
            <ShieldAlert className="h-4 w-4" />
            Move Hall
          </button>
        </div>
      </div>

      <div className="p-5">
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Role</div>
            <div className="mt-1 text-lg font-semibold text-slate-900">{state.currentRole}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Selected Count</div>
            <div className="mt-1 text-lg font-semibold text-slate-900">{totals.selectedCount}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Capacity</div>
            <div className="mt-1 text-lg font-semibold text-slate-900">{totals.totalCapacity}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Status</div>
            <div className={`mt-1 text-lg font-semibold ${totals.locked ? 'text-rose-600' : 'text-emerald-600'}`}>{totals.locked ? 'Locked' : 'Open'}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 font-semibold text-slate-900">
              <ScanBarcode className="h-4 w-4 text-blue-700" />
              Scanner / Manual Entry
            </div>
            <div className="mt-3 flex gap-2">
              <input
                ref={codeInputRef}
                className="input w-full"
                placeholder={mode === 'manual' ? 'Type punch code manually' : 'Scan or type code'}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onProcess()}
              />
              <button className="btn-secondary" type="button" onClick={onQuickCopy}>
                <Copy className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 flex gap-2">
              <button className="btn-secondary" type="button" onClick={onProcess}>Verify</button>
              <button className="btn-primary" type="button" onClick={onProcess} disabled={busy || !canScan}>{busy ? 'Saving...' : 'Save Entry'}</button>
            </div>
            <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
              Current hall of employee will be used automatically if space is available.
            </div>
            <div className="mt-3 text-sm text-slate-600">
              Matched employee: <span className="font-semibold text-slate-900">{empResult ? `${empResult.name} (${empResult.code})` : '-'}</span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-semibold text-slate-900">
                <CalendarDays className="h-4 w-4 text-red-600" />
                Hall Load
              </div>
              <button className="btn-secondary py-2 px-3" type="button" onClick={() => setShowHistory((v) => !v)}>
                <Search className="h-4 w-4" />
                {showHistory ? 'Hide Logs' : 'Show Logs'}
              </button>
            </div>
            <div className="mt-3 space-y-3">
              {hallUsage.map((h) => (
                <div key={h.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-slate-900">{h.name}</div>
                    <div className={`text-sm font-semibold ${h.full ? 'text-red-600' : 'text-blue-700'}`}>{h.used}/{h.capacity}</div>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-100">
                    <div
                      className={`h-2 rounded-full ${h.full ? 'bg-red-500' : 'bg-blue-600'}`}
                      style={{ width: `${Math.min(100, Math.round((h.used / Math.max(h.capacity, 1)) * 100))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {showHistory ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 text-sm font-semibold text-slate-900">Recent Entries</div>
            <div className="mb-3">
              <input className="input w-full" placeholder="Search entries" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <div className="table-wrap max-h-[360px] overflow-auto">
              <table className="min-w-full">
                <thead>
                  <tr>
                    <th className="sticky top-0 bg-slate-50">Time</th>
                    <th className="sticky top-0 bg-slate-50">Code</th>
                    <th className="sticky top-0 bg-slate-50">Name</th>
                    <th className="sticky top-0 bg-slate-50">Hall</th>
                    <th className="sticky top-0 bg-slate-50">Source</th>
                    <th className="sticky top-0 bg-slate-50">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRows.length ? recentRows.slice(0, 25).map((r) => (
                    <tr key={r.id}>
                      <td>{r.time || '-'}</td>
                      <td>{r.code}</td>
                      <td>{r.name}</td>
                      <td>{r.hallName}</td>
                      <td>{r.source}</td>
                      <td>{r.overrideReason || '-'}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan="6" className="py-8 text-center text-sm text-slate-500">No records found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}