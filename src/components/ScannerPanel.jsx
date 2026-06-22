import React, { useEffect, useMemo, useRef, useState } from 'react';
import QrScanner from 'qr-scanner';
import {
  CalendarDays,
  ScanBarcode,
  Keyboard,
  Menu,
  X,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldAlert,
  Loader2,
  ScanLine,
  Copy,
  Search
} from 'lucide-react';
import { useHR } from '../context/HRContext';

function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 2200);
    return () => clearTimeout(t);
  }, [toast, onClose]);

  if (!toast) return null;

  const cls =
    toast.type === 'success'
      ? 'bg-emerald-600 text-white'
      : toast.type === 'error'
      ? 'bg-rose-600 text-white'
      : 'bg-amber-500 text-white';

  const Icon =
    toast.type === 'success'
      ? CheckCircle2
      : toast.type === 'error'
      ? XCircle
      : AlertTriangle;

  return (
    <div className={`fixed left-1/2 top-4 z-[100] -translate-x-1/2 rounded border-2 px-4 py-3 shadow-lg ${cls}`}>
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="h-4 w-4" />
        {toast.message}
      </div>
    </div>
  );
}

function MobileScanner({ onResult, onClose }) {
  const videoRef = useRef(null);
  const scannerRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    const startScanner = async () => {
      try {
        scannerRef.current = new QrScanner(
          videoRef.current,
          async (result) => {
            const text = result?.data || result;
            await onResult(text);
            if (scannerRef.current) {
              scannerRef.current.stop();
            }
            onClose();
          }
        );

        if (mounted) {
          await scannerRef.current.start();
        }
      } catch (err) {
        console.error('QR Scanner Error:', err);
      }
    };

    startScanner();

    return () => {
      mounted = false;
      if (scannerRef.current) {
        scannerRef.current.stop();
        scannerRef.current.destroy();
        scannerRef.current = null;
      }
    };
  }, [onResult, onClose]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md border-2 border-[#23205C] bg-white p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">QR Scanner</h3>
          <button
            type="button"
            onClick={onClose}
            className="border-2 border-[#E0222A] bg-[#E0222A] px-3 py-1 text-white"
          >
            Close
          </button>
        </div>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full border-2 border-slate-300"
          style={{ height: '350px' }}
        />
      </div>
    </div>
  );
}

export default function ScannerPanel() {
  const {
    state,
    processEntry,
    hrOverrideEntry,
    moveEmployeeToHall,
    hallUsage,
    totals,
    activeEntries
  } = useHR();

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
  const [showMobileScanner, setShowMobileScanner] = useState(false);
  const [isHrLogin, setIsHrLogin] = useState(false);

  const canScan = !totals.locked;
  const codeInputRef = useRef(null);
  const successBeepRef = useRef(null);
  const errorBeepRef = useRef(null);

  const empResult = useMemo(
    () => state.employees.find((e) => String(e.code).trim() === String(code).trim()),
    [code, state.employees]
  );

  const recentRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return activeEntries.filter((e) =>
      !q ||
      `${e.name} ${e.code} ${e.designation} ${e.hallName} ${e.source} ${e.overrideReason}`
        .toLowerCase()
        .includes(q)
    );
  }, [activeEntries, query]);

  const playSuccess = () => {
    try {
      if (successBeepRef.current) {
        successBeepRef.current.currentTime = 0;
        successBeepRef.current.play();
      }
    } catch {}
  };

  const playError = () => {
    try {
      if (errorBeepRef.current) {
        errorBeepRef.current.currentTime = 0;
        errorBeepRef.current.play();
      }
    } catch {}
  };

  const pushToast = (type, message) => {
    setToast({ type, message });
    if (type === 'success') playSuccess();
    else playError();
  };

  const focusCode = () => codeInputRef.current?.focus();

  const handleSuccessProcess = (ok) => {
    if (ok) setCode('');
    focusCode();
  };

  const onProcess = async (value) => {
    const finalCode = String(value ?? code).trim();
    if (!finalCode) return pushToast('error', 'Please enter code.');
    if (!canScan) return pushToast('error', 'Capacity locked.');

    setBusy(true);
    try {
      const res = await processEntry(finalCode);
      pushToast(res.ok ? 'success' : res.type || 'error', res.text || 'Done');

      if (!res.ok && res.weekOff && state.currentRole === 'HR') {
        const ok = window.confirm('Week off hai. HR override karna hai?');
        if (ok) {
          const ov = await hrOverrideEntry({
            code: finalCode,
            hallId: selectedHall,
            reason: reason || 'Week off override by HR'
          });
          pushToast(ov.ok ? 'success' : 'error', ov.text || 'Override done');
          handleSuccessProcess(ov.ok);
          return;
        }
      }

      handleSuccessProcess(res.ok);
    } finally {
      setBusy(false);
    }
  };

  const handleScannedCode = async (val) => {
    const value = String(val || '').trim();
    if (!value) return;
    setCode(value);
    await onProcess(value);
  };

  const onMove = async () => {
    if (!isHrLogin) return pushToast('error', 'Pehle HR login karo.');
    if (!code.trim() || !selectedHall || !reason.trim()) {
      return pushToast('error', 'Code, hall, reason sab required hain.');
    }

    setBusy(true);
    try {
      const res = await moveEmployeeToHall({
        code: code.trim(),
        hallId: selectedHall,
        reason: reason.trim()
      });
      pushToast(res.ok ? 'success' : 'error', res.text || 'Done');
      handleSuccessProcess(res.ok);
    } finally {
      setBusy(false);
    }
  };

  const onHrLogin = () => {
    const ok = String(hrLoginCode).trim() === '123456';
    setIsHrLogin(ok);
    pushToast(ok ? 'success' : 'error', ok ? 'HR login success.' : 'Invalid HR code.');
  };

  const onQuickCopy = async () => {
    try {
      await navigator.clipboard.writeText(code.trim());
      pushToast('success', 'Code copied.');
    } catch {
      pushToast('error', 'Copy failed.');
    }
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleScannedCode(code);
    }
  };

  const showHRControls = state.currentRole === 'HR' || state.currentRole === 'ADMIN';

  return (
    <div className="overflow-hidden border-2 border-slate-300 bg-white shadow-xl">
      <audio ref={successBeepRef} src="/beep.wav" preload="auto" />
      <audio ref={errorBeepRef} src="/error.wav" preload="auto" />
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="border-b border-slate-300 bg-[#23205C] px-4 py-4 text-white sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold sm:text-xl">Dixon Dehradun Attendance</h2>
            <p className="truncate text-xs text-white/70 sm:text-sm">Scanner panel with hall control</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="md:hidden" onClick={() => setMenuOpen((v) => !v)}>
              {menuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </div>

      <div className={`${menuOpen ? 'block' : 'hidden'} border-b border-slate-300 bg-slate-50 p-4 md:block sm:p-5`}>
        {showHRControls && (
          <div className="mb-5 border-2 border-[#E0222A] bg-[#E0222A]/5 p-4">
            <div className="mb-3 text-sm font-bold text-[#E0222A]">HR Controls</div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <input
                className="border-2 border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none hover:border-slate-400 focus:border-[#E0222A] focus:ring-4 focus:ring-[#E0222A]/10"
                placeholder="HR 6-digit code"
                value={hrLoginCode}
                onChange={(e) => setHrLoginCode(e.target.value)}
              />
              <button
                className="bg-[#E0222A] px-4 py-3 font-semibold text-white shadow-lg shadow-[#E0222A]/25 hover:scale-[1.02] hover:shadow-[#E0222A]/30 active:scale-[0.98]"
                type="button"
                onClick={onHrLogin}
              >
                HR Login
              </button>
              <input
                className="border-2 border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none hover:border-slate-400 focus:border-[#E0222A] focus:ring-4 focus:ring-[#E0222A]/10"
                placeholder="Reason / override note"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <select
                className="border-2 border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none hover:border-slate-400 focus:border-[#E0222A] focus:ring-4 focus:ring-[#E0222A]/10"
                value={selectedHall}
                onChange={(e) => setSelectedHall(e.target.value)}
              >
                {state.halls.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} ({h.capacity})
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                className="border-2 border-[#E0222A] bg-[#E0222A]/10 px-4 py-3 font-semibold text-[#E0222A] hover:bg-[#E0222A]/20"
                type="button"
                onClick={onMove}
                disabled={busy}
              >
                <ShieldAlert className="mr-1 inline h-4 w-4" />
                Move Hall
              </button>
              <span
                className={`border-2 px-4 py-3 text-sm font-semibold ${
                  isHrLogin
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                    : 'border-slate-300 bg-white text-slate-600'
                }`}
              >
                {isHrLogin ? 'HR unlocked' : 'HR locked'}
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <input
            className="border-2 border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none hover:border-slate-400 focus:border-[#E0222A] focus:ring-4 focus:ring-[#E0222A]/10"
            placeholder="Select employee code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={handleInputKeyDown}
            ref={codeInputRef}
          />
          <button
            className="border-2 border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50"
            type="button"
            onClick={() => setMode(mode === 'scan' ? 'manual' : 'scan')}
          >
            <Keyboard className="mr-1 inline h-4 w-4" />
            {mode === 'scan' ? 'Manual Mode' : 'Scan Mode'}
          </button>
          <button
            className="bg-[#E0222A] px-4 py-3 font-semibold text-white shadow-lg shadow-[#E0222A]/25 hover:scale-[1.02] hover:shadow-[#E0222A]/30 active:scale-[0.98] disabled:opacity-50"
            type="button"
            onClick={() => onProcess()}
            disabled={busy || !canScan}
          >
            {busy ? <Loader2 className="mr-1 inline h-4 w-4 animate-spin" /> : <ScanLine className="mr-1 inline h-4 w-4" />}
            Process Entry
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="border-2 border-slate-300 bg-white p-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Role</div>
            <div className="mt-2 text-xl font-bold text-slate-900">{state.currentRole}</div>
          </div>
          <div className="border-2 border-slate-300 bg-white p-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Selected Count</div>
            <div className="mt-2 text-xl font-bold text-slate-900">{totals.selectedCount}</div>
          </div>
          <div className="border-2 border-slate-300 bg-white p-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Capacity</div>
            <div className="mt-2 text-xl font-bold text-slate-900">{totals.totalCapacity}</div>
          </div>
          <div className="border-2 border-slate-300 bg-white p-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Status</div>
            <div className={`mt-2 text-xl font-bold ${totals.locked ? 'text-[#E0222A]' : 'text-emerald-600'}`}>
              {totals.locked ? 'Locked' : 'Open'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="border-2 border-slate-300 bg-white p-5">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <ScanBarcode className="h-4 w-4" />
              Scanner / Manual Entry
            </div>
            <div className="mt-4 flex gap-3">
              <input
                ref={codeInputRef}
                className="w-full border-2 border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none hover:border-slate-400 focus:border-[#E0222A] focus:ring-4 focus:ring-[#E0222A]/10"
                placeholder={mode === 'manual' ? 'Type punch code manually' : 'Scan or type code'}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={handleInputKeyDown}
              />
              <button
                className="border-2 border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50"
                type="button"
                onClick={onQuickCopy}
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                className="border-2 border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50"
                type="button"
                onClick={() => onProcess()}
              >
                Verify
              </button>
              <button
                className="bg-[#E0222A] px-4 py-3 font-semibold text-white shadow-lg shadow-[#E0222A]/25 hover:scale-[1.02] hover:shadow-[#E0222A]/30 active:scale-[0.98] disabled:opacity-50"
                type="button"
                onClick={() => onProcess()}
                disabled={busy || !canScan}
              >
                {busy ? 'Saving...' : 'Save Entry'}
              </button>
            </div>
            <div className="mt-4 border-2 border-slate-300 bg-slate-50 px-4 py-2 text-sm text-slate-700">
              Current hall of employee will be used automatically if space is available.
            </div>
            <div className="mt-4 text-sm text-slate-600">
              Matched employee: <span className="font-bold text-slate-900">{empResult ? `${empResult.name} (${empResult.code}) - ${empResult.designation || 'No designation'}` : '-'}</span>
            </div>
          </div>

          <div className="border-2 border-slate-300 bg-white p-5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <CalendarDays className="h-4 w-4" />
                Hall Load
              </div>
              <button
                className="border-2 border-slate-300 bg-white px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50"
                type="button"
                onClick={() => setShowHistory((v) => !v)}
              >
                <Search className="mr-1 inline h-4 w-4" />
                {showHistory ? 'Hide Logs' : 'Show Logs'}
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {hallUsage.map((h) => (
                <div key={h.id} className="border-2 border-slate-300 p-4">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-slate-900">{h.name}</div>
                    <div className={`text-sm font-bold ${h.full ? 'text-[#E0222A]' : 'text-slate-700'}`}>
                      {h.used}/{h.capacity}
                    </div>
                  </div>
                  <div className="mt-3 h-2 border-2 border-slate-300 bg-white">
                    <div
                      className={`h-2 ${h.full ? 'bg-[#E0222A]' : 'bg-slate-700'}`}
                      style={{
                        width: `${Math.min(100, Math.round((h.used / Math.max(h.capacity, 1)) * 100))}%`
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {showHistory && (showHRControls || state.currentRole === 'ADMIN') && (
          <div className="mt-5 border-2 border-slate-300 bg-white p-5">
            <div className="mb-4 text-sm font-bold text-slate-900">Recent Entries</div>
            <div className="mb-4">
              <input
                className="w-full border-2 border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none hover:border-slate-400 focus:border-[#E0222A] focus:ring-4 focus:ring-[#E0222A]/10"
                placeholder="Search entries (name, code, designation, hall)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="max-h-[360px] overflow-auto">
              <table className="min-w-full">
                <thead>
                  <tr>
                    <th className="sticky top-0 border-b-2 border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700">Time</th>
                    <th className="sticky top-0 border-b-2 border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700">Code</th>
                    <th className="sticky top-0 border-b-2 border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700">Name</th>
                    <th className="sticky top-0 border-b-2 border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700">Designation</th>
                    <th className="sticky top-0 border-b-2 border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700">Hall</th>
                    <th className="sticky top-0 border-b-2 border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700">Source</th>
                    <th className="sticky top-0 border-b-2 border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRows.length ? (
                    recentRows.slice(0, 25).map((r) => (
                      <tr key={r.id} className="border-b border-slate-200">
                        <td className="px-3 py-2 text-sm text-slate-700">{r.time || '-'}</td>
                        <td className="px-3 py-2 text-sm font-semibold text-slate-900">{r.code}</td>
                        <td className="px-3 py-2 text-sm text-slate-900">{r.name}</td>
                        <td className="px-3 py-2 text-sm text-slate-700">{r.designation || '-'}</td>
                        <td className="px-3 py-2 text-sm text-slate-700">{r.hallName}</td>
                        <td className="px-3 py-2 text-sm text-slate-700">{r.source}</td>
                        <td className="px-3 py-2 text-sm text-slate-500">{r.overrideReason || '-'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="py-8 text-center text-sm text-slate-500">No records found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}