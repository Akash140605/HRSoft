import React, { useEffect, useMemo, useRef, useState } from "react";
import QrScanner from "qr-scanner";
import {
  CalendarDays,
  ScanBarcode,
  Keyboard,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldAlert,
  Loader2,
  ScanLine,
  Copy,
  Search,
  Camera,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useHR } from "../context/HRContext";

function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 2200);
    return () => clearTimeout(t);
  }, [toast, onClose]);

  if (!toast) return null;

  const cls =
    toast.type === "success"
      ? "bg-emerald-600 text-white"
      : toast.type === "error"
      ? "bg-rose-600 text-white"
      : "bg-amber-500 text-white";

  const Icon =
    toast.type === "success"
      ? CheckCircle2
      : toast.type === "error"
      ? XCircle
      : AlertTriangle;

  return (
    <div className={`fixed left-1/2 top-2 z-[100] -translate-x-1/2 rounded border px-3 py-2 shadow-lg ${cls}`}>
      <div className="flex items-center gap-2 text-xs font-semibold sm:text-sm">
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
        if (!videoRef.current) return;

        scannerRef.current = new QrScanner(
          videoRef.current,
          async (result) => {
            const text = result?.data || result;
            if (!text) return;
            await onResult(text);
            if (scannerRef.current) scannerRef.current.stop();
            onClose();
          },
          {
            preferredCamera: "environment",
            highlightScanRegion: true,
            highlightCodeOutline: true,
          }
        );

        if (mounted) await scannerRef.current.start();
      } catch (err) {
        console.error("QR Scanner Error:", err);
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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-2">
      <div className="flex h-[92vh] w-full max-w-sm flex-col overflow-hidden border border-[#23205C] bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <h3 className="text-sm font-semibold text-slate-900">QR Scanner</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded bg-[#E0222A] px-3 py-1.5 text-xs font-semibold text-white"
          >
            Close
          </button>
        </div>
        <div className="flex-1 p-2">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full rounded border border-slate-300 object-cover"
          />
        </div>
      </div>
    </div>
  );
}

function CompactStat({ label, value, tone = "slate" }) {
  const cls =
    tone === "danger"
      ? "border-[#E0222A] text-[#E0222A]"
      : tone === "success"
      ? "border-emerald-600 text-emerald-600"
      : "border-slate-300 text-slate-900";

  return (
    <div className={`shrink-0 rounded-full border bg-white px-2.5 py-1 ${cls}`}>
      <div className="text-[9px] font-semibold uppercase leading-none text-slate-500">{label}</div>
      <div className="mt-0.5 text-[11px] font-bold leading-none">{value}</div>
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
    activeEntries,
  } = useHR();

  const [code, setCode] = useState("");
  const [selectedHall, setSelectedHall] = useState("H1");
  const [reason, setReason] = useState("");
  const [toast, setToast] = useState(null);
  const [mode, setMode] = useState("scan");
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [mobileScannerOpen, setMobileScannerOpen] = useState(false);
  const [showHrControls, setShowHrControls] = useState(true);

  const canScan = !totals.locked;
  const codeInputRef = useRef(null);
  const successBeepRef = useRef(null);
  const errorBeepRef = useRef(null);

  const isHR = state.currentRole === "HR" || state.currentRole === "ADMIN";

  const empResult = useMemo(
    () => state.employees.find((e) => String(e.code).trim() === String(code).trim()),
    [code, state.employees]
  );

  const recentRows = useMemo(() => {
    const mapped = (Array.isArray(activeEntries) ? activeEntries : []).map((entry) => ({
      ...entry,
      hallName: entry.hall_name || entry.hallName || `Hall ${entry.hall_id || entry.hallId || "?"}`,
      overrideReason: entry.override_reason || entry.overrideReason || "",
    }));

    const q = query.trim().toLowerCase();
    return mapped.filter((e) => {
      if (!q) return true;
      return `${e.name || ""} ${e.code || ""} ${e.designation || ""} ${e.hallName || ""} ${e.source || ""} ${e.overrideReason || ""}`
        .toLowerCase()
        .includes(q);
    });
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
    if (type === "success") playSuccess();
    else playError();
  };

  const focusCode = () => {
    requestAnimationFrame(() => {
      codeInputRef.current?.focus();
    });
  };

  const handleSuccessProcess = (ok) => {
    if (ok) setCode("");
    focusCode();
  };

  useEffect(() => {
    focusCode();
  }, []);

  const onProcess = async (value) => {
    const finalCode = String(value ?? code).trim();
    if (!finalCode) return pushToast("error", "Please enter code.");
    if (!canScan) return pushToast("error", "Capacity locked.");

    setBusy(true);
    try {
      const res = await processEntry(finalCode);
      pushToast(res.ok ? "success" : res.type || "error", res.text || "Done");

      if (!res.ok && res.weekOff && isHR) {
        const ok = window.confirm("Week off hai. HR override karna hai?");
        if (ok) {
          const ov = await hrOverrideEntry({
            code: finalCode,
            hallId: selectedHall,
            reason: reason.trim() || "Week off override by HR",
          });
          pushToast(ov.ok ? "success" : "error", ov.text || "Override done");
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
    const value = String(val || "").trim();
    if (!value) return;
    setCode(value);
    await onProcess(value);
  };

  const onMove = async () => {
    const finalCode = code.trim();
    const finalReason = reason.trim();

    if (!finalCode || !selectedHall || !finalReason) {
      return pushToast("error", "Code, hall, reason sab required hain.");
    }

    setBusy(true);
    try {
      const res = await moveEmployeeToHall({
        code: finalCode,
        hallId: selectedHall,
        reason: finalReason,
      });
      pushToast(res.ok ? "success" : "error", res.text || "Done");
      handleSuccessProcess(res.ok);
    } finally {
      setBusy(false);
    }
  };

  const onQuickCopy = async () => {
    try {
      await navigator.clipboard.writeText(code.trim());
      pushToast("success", "Code copied.");
    } catch {
      pushToast("error", "Copy failed.");
    }
  };

  const handleInputKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onProcess();
    }
  };

  return (
    <div className="min-h-dvh w-full overflow-x-hidden bg-slate-100">
      <div className="mx-auto flex min-h-dvh w-full max-w-7xl flex-col overflow-hidden bg-white shadow-xl">
        <audio ref={successBeepRef} src="/beep.wav" preload="auto" />
        <audio ref={errorBeepRef} src="/error.wav" preload="auto" />
        <Toast toast={toast} onClose={() => setToast(null)} />

        {mobileScannerOpen && (
          <MobileScanner
            onResult={handleScannedCode}
            onClose={() => setMobileScannerOpen(false)}
          />
        )}

        {/* <div className="sticky top-0 z-50 border-b border-slate-200 bg-white px-2 py-2">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-500">
                Attendance
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setMode((m) => (m === "scan" ? "manual" : "scan"))}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700"
                title={mode === "scan" ? "Manual Mode" : "Scan Mode"}
              >
                <Keyboard className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setMobileScannerOpen(true)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700"
                title="Camera Scan"
              >
                <Camera className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div> */}

        <div className="border-b border-slate-200 bg-slate-50 px-3 py-1">
          <div className="flex gap-2 overflow-x-auto pb-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <CompactStat label="Role" value={state.currentRole} />
            {/* <CompactStat label="Selected" value={totals.selectedCount} /> */}
            <CompactStat label="Capacity" value={totals.totalCapacity} />
            <CompactStat
              label="Status"
              value={totals.locked ? "Locked" : "Open"}
              tone={totals.locked ? "danger" : "success"}
            />

            <button
              type="button"
              onClick={() => setMode((m) => (m === "scan" ? "manual" : "scan"))}
              className="shrink-0 rounded-full border border-slate-300 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700"
            >
              <Keyboard className="mr-1 inline h-3.5 w-3.5" />
              {mode === "scan" ? "Manual" : "Scan"}
            </button>

            <button
              type="button"
              onClick={() => setMobileScannerOpen(true)}
              className="shrink-0 rounded-full border border-slate-300 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700"
            >
              <Camera className="mr-1 inline h-3.5 w-3.5" />
              Camera
            </button>
          </div>
        </div>

        {isHR && (
          <div className="border-b border-slate-200 bg-slate-50 px-2 py-1">
            <button
              type="button"
              className="mb-1 flex w-full items-center justify-between rounded border border-[#E0222A]/25 bg-white px-2.5 py-2 text-left text-xs font-bold text-[#E0222A]"
              onClick={() => setShowHrControls((v) => !v)}
            >
              <span>HR Controls</span>
              {showHrControls ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {showHrControls && (
              <div className="grid grid-cols-1 gap-2">
                <input
                  className="w-full min-w-0 rounded border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-900 outline-none focus:border-[#E0222A]"
                  placeholder="Reason / override note"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
                <select
                  className="w-full min-w-0 rounded border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-900 outline-none focus:border-[#E0222A]"
                  value={selectedHall}
                  onChange={(e) => setSelectedHall(e.target.value)}
                >
                  {state.halls.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.capacity})
                    </option>
                  ))}
                </select>
                <button
                  className="inline-flex items-center justify-center rounded bg-[#E0222A] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  type="button"
                  onClick={onMove}
                  disabled={busy}
                >
                  <ShieldAlert className="mr-1 inline h-4 w-4" />
                  Move Hall
                </button>
              </div>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-2 py-2">
          <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
            <div className="border border-slate-200 bg-white p-2.5">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <ScanBarcode className="h-4 w-4" />
                Scanner / Manual Entry
              </div>

              <div className="mt-2 flex gap-2">
                <input
                  className="min-w-0 flex-1 rounded border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-900 outline-none focus:border-[#E0222A]"
                  placeholder={mode === "manual" ? "Type punch code manually" : "Scan or type code"}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  onKeyDown={handleInputKeyDown}
                  ref={codeInputRef}
                />
                <button
                  className="inline-flex items-center justify-center rounded border border-slate-300 bg-white px-2.5 py-2 text-slate-700"
                  type="button"
                  onClick={onQuickCopy}
                  title="Copy code"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-2 flex gap-2">
                <button
                  className="flex-1 rounded border border-slate-300 bg-white px-2.5 py-2 text-sm font-semibold text-slate-700"
                  type="button"
                  onClick={() => onProcess()}
                >
                  Verify
                </button>
                <button
                  className="flex-1 rounded bg-[#E0222A] px-2.5 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  type="button"
                  onClick={() => onProcess()}
                  disabled={busy || !canScan}
                >
                  {busy ? <Loader2 className="mr-1 inline h-4 w-4 animate-spin" /> : <ScanLine className="mr-1 inline h-4 w-4" />}
                  Process
                </button>
              </div>

            
              <div className="mt-2 text-[11px] text-slate-600">
                Matched: <span className="font-bold text-slate-900">{empResult ? `${empResult.name} (${empResult.code})` : "-"}</span>
              </div>
            </div>

            <div className="border border-slate-200 bg-white p-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <CalendarDays className="h-4 w-4" />
                  Hall Load
                </div>
                <button
                  className="inline-flex items-center justify-center rounded border border-slate-300 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-700"
                  type="button"
                  onClick={() => setShowHistory((v) => !v)}
                >
                  <Search className="mr-1 inline h-4 w-4" />
                  {showHistory ? "Hide" : "Logs"}
                </button>
              </div>

              <div className="mt-2 max-h-[36vh] space-y-2 overflow-auto pr-1">
                {hallUsage.map((h) => (
                  <div key={h.id} className="border border-slate-200 p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs font-bold text-slate-900">{h.name}</div>
                      <div className={`text-[11px] font-bold ${h.full ? "text-[#E0222A]" : "text-slate-700"}`}>
                        {h.used}/{h.capacity}
                      </div>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded border border-slate-200 bg-white">
                      <div
                        className={`h-2 ${h.full ? "bg-[#E0222A]" : "bg-slate-700"}`}
                        style={{ width: `${Math.min(100, Math.round((h.used / Math.max(h.capacity, 1)) * 100))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {showHistory && (isHR || state.currentRole === "ADMIN") && (
            <div className="mt-2 border border-slate-200 bg-white p-2.5">
              <div className="mb-2 text-sm font-bold text-slate-900">Recent Entries</div>
              <input
                className="mb-2 w-full rounded border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-900 outline-none focus:border-[#E0222A]"
                placeholder="Search entries"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />

              <div className="max-h-[22vh] overflow-auto rounded border border-slate-200">
                <table className="min-w-full">
                  <thead>
                    <tr>
                      <th className="sticky top-0 border-b bg-white px-2 py-2 text-left text-[10px] font-semibold text-slate-700">Time</th>
                      <th className="sticky top-0 border-b bg-white px-2 py-2 text-left text-[10px] font-semibold text-slate-700">Code</th>
                      <th className="sticky top-0 border-b bg-white px-2 py-2 text-left text-[10px] font-semibold text-slate-700">Name</th>
                      <th className="sticky top-0 border-b bg-white px-2 py-2 text-left text-[10px] font-semibold text-slate-700">Hall</th>
                      <th className="sticky top-0 border-b bg-white px-2 py-2 text-left text-[10px] font-semibold text-slate-700">Src</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentRows.length ? (
                      recentRows.slice(0, 12).map((r) => (
                        <tr key={r.id} className="border-b border-slate-200">
                          <td className="px-2 py-2 text-[10px] text-slate-700">{r.time || "-"}</td>
                          <td className="px-2 py-2 text-[10px] font-semibold text-slate-900">{r.code}</td>
                          <td className="px-2 py-2 text-[10px] text-slate-900">{r.name}</td>
                          <td className="px-2 py-2 text-[10px] text-slate-700">{r.hallName}</td>
                          <td className="px-2 py-2 text-[10px] text-slate-700">{r.source}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="py-5 text-center text-xs text-slate-500">
                          No records found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}