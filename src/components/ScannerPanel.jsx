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
    const t = setTimeout(onClose, 2400);
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
    <div
      className={`fixed left-1/2 top-16 z-[1000] w-[calc(100vw-1rem)] max-w-lg -translate-x-1/2 rounded-xl border px-4 py-3 shadow-2xl ${cls}`}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-center gap-2 text-xs font-semibold sm:text-sm">
        <Icon className="h-4 w-4 shrink-0" />
        <span>{toast.message}</span>
      </div>
    </div>
  );
}

function MobileScanner({ onResult, onClose }) {
  const videoRef = useRef(null);
  const scannerRef = useRef(null);
  const lockedRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    const start = async () => {
      try {
        if (!videoRef.current) return;

        lockedRef.current = false;

        scannerRef.current = new QrScanner(
          videoRef.current,
          async (result) => {
            const text = String(result?.data || result || "").trim();
            if (!text) return;
            if (lockedRef.current) return;

            lockedRef.current = true;
            scannerRef.current?.stop();
            await onResult(text);
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

    start();

    return () => {
      mounted = false;
      if (scannerRef.current) {
        scannerRef.current.stop();
        scannerRef.current.destroy();
        scannerRef.current = null;
      }
    };
  }, [onResult]);

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

function StatusCard({ label, value, valueClass = "text-slate-900" }) {
  return (
    <div className="border-2 border-slate-300 bg-white p-4 sm:p-5">
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className={`mt-2 text-xl font-bold ${valueClass}`}>{value}</div>
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
  const [scannerPaused, setScannerPaused] = useState(false);

  const canScan = !totals.locked;
  const codeInputRef = useRef(null);
  const successBeepRef = useRef(null);
  const errorBeepRef = useRef(null);
  const topAnchorRef = useRef(null);

  const isHR = state.currentRole === "HR" || state.currentRole === "ADMIN";

  const empResult = useMemo(
    () =>
      state.employees.find(
        (e) => String(e.code).trim() === String(code).trim()
      ),
    [code, state.employees]
  );

  const recentRows = useMemo(() => {
    const mapped = (Array.isArray(activeEntries) ? activeEntries : []).map(
      (entry) => ({
        ...entry,
        hallName:
          entry.hall_name ||
          entry.hallName ||
          `Hall ${entry.hall_id || entry.hallId || "?"}`,
        overrideReason: entry.override_reason || entry.overrideReason || "",
      })
    );

    const q = query.trim().toLowerCase();
    return mapped.filter((e) => {
      if (!q) return true;
      return `${e.name || ""} ${e.code || ""} ${e.designation || ""} ${
        e.hallName || ""
      } ${e.source || ""} ${e.overrideReason || ""}`
        .toLowerCase()
        .includes(q);
    });
  }, [activeEntries, query]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    topAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

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
    if (type === "error") scrollToTop();
    setToast({ type, message });
    if (type === "success") playSuccess();
    else playError();
  };

  const focusCode = () => {
    requestAnimationFrame(() => {
      codeInputRef.current?.focus();
    });
  };

  const hardClearCode = () => {
    setCode("");
    requestAnimationFrame(() => {
      if (codeInputRef.current) codeInputRef.current.value = "";
      codeInputRef.current?.focus();
    });
  };

  const resetAfterDone = () => {
    setReason("");
    setScannerPaused(false);
    hardClearCode();
  };

  useEffect(() => {
    focusCode();
  }, []);

 const onProcess = async (inputCode) => {
  const finalCode = String(inputCode ?? code).trim();

  if (!finalCode) {
    pushToast("error", "Please enter code.");
    return;
  }
  if (!canScan) {
    pushToast("error", "Capacity locked.");
    return;
  }
  if (busy || scannerPaused) return;

  setBusy(true);
  setScannerPaused(true);

  try {
    const res = await processEntry(finalCode);
    const text = String(res?.text || "").toLowerCase();
    const alreadyScanned =
      res?.alreadyScanned ||
      text.includes("already scanned") ||
      text.includes("already");

    if (res?.ok) {
      pushToast("success", res.text || "Done");
      resetAfterDone();
      return;
    }

    if (alreadyScanned) {
      pushToast("error", res.text || "Already scanned");
      setTimeout(() => {
        hardClearCode();
        setScannerPaused(false);
      }, 120);
      return;
    }

    if (!res?.ok && res?.weekOff && isHR) {
      pushToast(res?.type || "error", res?.text || "Week off");

      const ok = window.confirm("Week off hai. HR override karna hai?");
      if (ok) {
        const ov = await hrOverrideEntry({
          code: finalCode,
          hallId: selectedHall,
          reason: reason.trim() || "Week off override by HR",
        });

        if (ov.ok) {
          pushToast("success", ov.text || "Override done");
          resetAfterDone();
        } else {
          pushToast("error", ov.text || "Override failed");
          setTimeout(() => {
            hardClearCode();
            setScannerPaused(false);
          }, 120);
        }
        return;
      }

      setScannerPaused(false);
      focusCode();
      return;
    }

    pushToast(res?.type || "error", res?.text || "Done");
    setScannerPaused(false);
    focusCode();
  } catch (err) {
    pushToast("error", err?.message || "Processing failed");
    setScannerPaused(false);
    focusCode();
  } finally {
    setBusy(false);
  }
};

const handleScannedCode = async (val) => {
  const value = String(val || "").trim();
  if (!value) return;
  if (busy || scannerPaused) return;

  setCode(value);
  await onProcess(value);
};
  const onMove = async () => {
    const finalCode = String(code || "").trim();
    const finalReason = String(reason || "").trim();

    if (!finalCode || !selectedHall || !finalReason) {
      pushToast("error", "Code, hall, reason sab required hain.");
      return;
    }

    if (busy) return;

    setBusy(true);
    try {
      const res = await moveEmployeeToHall({
        code: finalCode,
        hallId: selectedHall,
        reason: finalReason,
      });

      pushToast(res.ok ? "success" : "error", res.text || "Done");

      if (res.ok) {
        resetAfterDone();
      } else {
        setScannerPaused(false);
        focusCode();
      }
    } catch (err) {
      pushToast("error", err?.message || "Move failed");
      setScannerPaused(false);
      focusCode();
    } finally {
      setBusy(false);
    }
  };

  const onQuickCopy = async () => {
    try {
      await navigator.clipboard.writeText(String(code || "").trim());
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

  const openScanner = () => {
    setScannerPaused(false);
    setMobileScannerOpen(true);
  };

  const closeScanner = () => {
    setMobileScannerOpen(false);
    setScannerPaused(false);
    hardClearCode();
  };

  return (
    <div ref={topAnchorRef} className="min-h-dvh w-full overflow-hidden bg-slate-100">
      <audio ref={successBeepRef} src="/beep.wav" preload="auto" />
      <audio ref={errorBeepRef} src="/error.wav" preload="auto" />
      <Toast toast={toast} onClose={() => setToast(null)} />

      {mobileScannerOpen && (
        <MobileScanner onResult={handleScannedCode} onClose={closeScanner} />
      )}

      <div className="mx-auto min-h-dvh w-full max-w-8xl overflow-hidden bg-white shadow-xl">
        <div className="hidden md:block">
          <div className="border-b border-slate-300 bg-[#23205C] px-4 py-4 text-white sm:px-5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-lg font-bold sm:text-xl">
                  Dixon Dehradun Attendance
                </h2>
                <p className="truncate text-xs text-white/70 sm:text-sm">
                  Scanner panel with hall control
                </p>
              </div>
            </div>
          </div>

          {isHR && showHrControls && (
            <div className="border-b border-slate-300 bg-slate-50 p-4 sm:p-5">
              <div className="mb-5 border-2 border-[#E0222A] bg-[#E0222A]/5 p-4">
                <div className="mb-3 text-sm font-bold text-[#E0222A]">
                  HR Controls
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <input
                    className="border-2 border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-[#E0222A] focus:ring-4 focus:ring-[#E0222A]/10"
                    placeholder="Reason / override note"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                  <select
                    className="border-2 border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-[#E0222A] focus:ring-4 focus:ring-[#E0222A]/10"
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
                    className="bg-[#E0222A] px-4 py-3 font-semibold text-white disabled:opacity-50"
                    type="button"
                    onClick={onMove}
                    disabled={busy}
                  >
                    <ShieldAlert className="mr-1 inline h-4 w-4" />
                    Move Hall
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="p-4 sm:p-5">
            <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-4">
              <StatusCard label="Role" value={state.currentRole} />
              <StatusCard label="Selected Count" value={totals.selectedCount} />
              <StatusCard label="Capacity" value={totals.totalCapacity} />
              <StatusCard
                label="Status"
                value={totals.locked ? "Locked" : "Open"}
                valueClass={totals.locked ? "text-[#E0222A]" : "text-emerald-600"}
              />
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
                    className="w-full border-2 border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-[#E0222A] focus:ring-4 focus:ring-[#E0222A]/10"
                    placeholder={
                      mode === "manual"
                        ? "Type punch code manually"
                        : "Scan or type code"
                    }
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    onKeyDown={handleInputKeyDown}
                  />
                  <button
                    className="border-2 border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700"
                    type="button"
                    onClick={onQuickCopy}
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    className="border-2 border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700"
                    type="button"
                    onClick={() => setMode(mode === "scan" ? "manual" : "scan")}
                  >
                    <Keyboard className="mr-1 inline h-4 w-4" />
                    {mode === "scan" ? "Manual Mode" : "Scan Mode"}
                  </button>
                  <button
                    className="border-2 border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700"
                    type="button"
                    onClick={openScanner}
                  >
                    <Camera className="mr-1 inline h-4 w-4" />
                    Camera Scan
                  </button>
                  <button
                    className="bg-[#E0222A] px-4 py-3 font-semibold text-white disabled:opacity-50"
                    type="button"
                    onClick={() => onProcess()}
                    disabled={busy || !canScan}
                  >
                    {busy ? (
                      <Loader2 className="mr-1 inline h-4 w-4 animate-spin" />
                    ) : (
                      <ScanLine className="mr-1 inline h-4 w-4" />
                    )}
                    Process Entry
                  </button>
                </div>
              </div>

              <div className="border-2 border-slate-300 bg-white p-5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-bold text-slate-900">
                    <CalendarDays className="h-4 w-4" />
                    Hall Load
                  </div>
                  <button
                    className="border-2 border-slate-300 bg-white px-3 py-2 font-semibold text-slate-700"
                    type="button"
                    onClick={() => setShowHistory((v) => !v)}
                  >
                    <Search className="mr-1 inline h-4 w-4" />
                    {showHistory ? "Hide Logs" : "Show Logs"}
                  </button>
                </div>

                <div className="mt-4 space-y-4">
                  {hallUsage.map((h) => (
                    <div key={h.id} className="border-2 border-slate-300 p-4">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-slate-900">{h.name}</div>
                        <div
                          className={`text-sm font-bold ${
                            h.full ? "text-[#E0222A]" : "text-slate-700"
                          }`}
                        >
                          {h.used}/{h.capacity}
                        </div>
                      </div>
                      <div className="mt-3 h-2 border-2 border-slate-300 bg-white">
                        <div
                          className={`h-2 ${
                            h.full ? "bg-[#E0222A]" : "bg-slate-700"
                          }`}
                          style={{
                            width: `${Math.min(
                              100,
                              Math.round(
                                (h.used / Math.max(h.capacity, 1)) * 100
                              )
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {showHistory && (showHrControls || state.currentRole === "ADMIN") && (
              <div className="mt-5 border-2 border-slate-300 bg-white p-5">
                <div className="mb-4 text-sm font-bold text-slate-900">
                  Recent Entries
                </div>
                <div className="mb-4">
                  <input
                    className="w-full border-2 border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-[#E0222A] focus:ring-4 focus:ring-[#E0222A]/10"
                    placeholder="Search entries (name, code, designation, hall)"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
                <div className="max-h-[360px] overflow-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr>
                        <th className="sticky top-0 border-b-2 border-slate-300 bg-white px-3 py-2 text-left text-sm font-semibold text-slate-700">
                          Time
                        </th>
                        <th className="sticky top-0 border-b-2 border-slate-300 bg-white px-3 py-2 text-left text-sm font-semibold text-slate-700">
                          Code
                        </th>
                        <th className="sticky top-0 border-b-2 border-slate-300 bg-white px-3 py-2 text-left text-sm font-semibold text-slate-700">
                          Name
                        </th>
                        <th className="sticky top-0 border-b-2 border-slate-300 bg-white px-3 py-2 text-left text-sm font-semibold text-slate-700">
                          Designation
                        </th>
                        <th className="sticky top-0 border-b-2 border-slate-300 bg-white px-3 py-2 text-left text-sm font-semibold text-slate-700">
                          Hall
                        </th>
                        <th className="sticky top-0 border-b-2 border-slate-300 bg-white px-3 py-2 text-left text-sm font-semibold text-slate-700">
                          Source
                        </th>
                        <th className="sticky top-0 border-b-2 border-slate-300 bg-white px-3 py-2 text-left text-sm font-semibold text-slate-700">
                          Reason
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentRows.length ? (
                        recentRows.slice(0, 25).map((r) => (
                          <tr key={r.id} className="border-b border-slate-200">
                            <td className="px-3 py-2 text-sm text-slate-700">
                              {r.time || "-"}
                            </td>
                            <td className="px-3 py-2 text-sm font-semibold text-slate-900">
                              {r.code}
                            </td>
                            <td className="px-3 py-2 text-sm text-slate-900">
                              {r.name}
                            </td>
                            <td className="px-3 py-2 text-sm text-slate-700">
                              {r.designation || "-"}
                            </td>
                            <td className="px-3 py-2 text-sm text-slate-700">
                              {r.hallName}
                            </td>
                            <td className="px-3 py-2 text-sm text-slate-700">
                              {r.source}
                            </td>
                            <td className="px-3 py-2 text-sm text-slate-500">
                              {r.overrideReason || "-"}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan="7"
                            className="py-8 text-center text-sm text-slate-500"
                          >
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

        <div className="md:hidden">
          <div className="grid grid-cols-2 gap-2 p-2">
            <div className="rounded border border-slate-200 bg-white p-2">
              <div className="text-[10px] font-semibold text-slate-500">Role</div>
              <div className="text-sm font-bold text-slate-900">
                {state.currentRole}
              </div>
            </div>
            <div className="rounded border border-slate-200 bg-white p-2">
              <div className="text-[10px] font-semibold text-slate-500">
                Capacity
              </div>
              <div className="text-sm font-bold text-slate-900">
                {totals.totalCapacity}
              </div>
            </div>
          </div>

          {isHR && showHrControls && (
            <div className="mx-2 rounded border border-slate-200 bg-white p-2">
              <button
                type="button"
                className="mb-2 flex w-full items-center justify-between text-left text-xs font-bold text-[#E0222A]"
                onClick={() => setShowHrControls((v) => !v)}
              >
                <span>HR</span>
                {showHrControls ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>

              <div className="grid grid-cols-1 gap-2">
                <input
                  className="rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#E0222A]"
                  placeholder="Reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
                <select
                  className="rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#E0222A]"
                  value={selectedHall}
                  onChange={(e) => setSelectedHall(e.target.value)}
                >
                  {state.halls.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
                <button
                  className="rounded bg-[#E0222A] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  type="button"
                  onClick={onMove}
                  disabled={busy}
                >
                  Move
                </button>
              </div>
            </div>
          )}

          <div className="mx-2 mt-2 rounded border border-slate-200 bg-white p-2">
            <div className="text-xs font-bold text-slate-900">Entry</div>
            <div className="mt-2 flex gap-2">
              <input
                ref={codeInputRef}
                className="min-w-0 flex-1 rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#E0222A]"
                placeholder={mode === "manual" ? "Code" : "Scan or type"}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={handleInputKeyDown}
              />
              <button
                className="rounded border border-slate-300 bg-white px-3 py-2 text-slate-700"
                type="button"
                onClick={onQuickCopy}
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-2 flex gap-2">
              <button
                className="flex-1 rounded border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                type="button"
                onClick={() => onProcess()}
                disabled={busy || scannerPaused}
              >
                Verify
              </button>
              <button
                className="flex-1 rounded bg-[#E0222A] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                type="button"
                onClick={() => onProcess()}
                disabled={busy || !canScan || scannerPaused}
              >
                {busy ? (
                  <Loader2 className="mr-1 inline h-4 w-4 animate-spin" />
                ) : (
                  <ScanLine className="mr-1 inline h-4 w-4" />
                )}
                Save
              </button>
            </div>

            <div className="mt-2 flex gap-2">
              <button
                className="flex-1 rounded border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                type="button"
                onClick={openScanner}
              >
                <Camera className="mr-1 inline h-4 w-4" />
                Scan
              </button>
              <button
                className="flex-1 rounded border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                type="button"
                onClick={() => {
                  hardClearCode();
                  setScannerPaused(false);
                }}
              >
                Clear
              </button>
            </div>
          </div>

          <div className="mx-2 mt-2 rounded border border-slate-200 bg-white p-2">
            <button
              className="flex w-full items-center justify-between text-left text-xs font-bold text-slate-900"
              type="button"
              onClick={() => setShowHistory((v) => !v)}
            >
              <span>Hall Load</span>
              {showHistory ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>

            <div className="mt-2 space-y-2">
              {hallUsage.map((h) => (
                <div key={h.id} className="rounded border border-slate-200 p-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-slate-900">
                      {h.name}
                    </div>
                    <div className="text-[11px] font-bold text-slate-700">
                      {h.used}/{h.capacity}
                    </div>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded border border-slate-200 bg-white">
                    <div
                      className={`h-2 ${h.full ? "bg-[#E0222A]" : "bg-slate-700"}`}
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round((h.used / Math.max(h.capacity, 1)) * 100)
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mx-2 mt-2 rounded border border-slate-200 bg-white p-2 text-[11px] text-slate-600">
            {empResult ? `${empResult.name} (${empResult.code})` : "No match"}
          </div>

          {showHistory && (isHR || state.currentRole === "ADMIN") && (
            <div className="mx-2 mt-2 rounded border border-slate-200 bg-white p-2">
              <input
                className="mb-2 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#E0222A]"
                placeholder="Search logs"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <div className="max-h-[28vh] overflow-auto">
                <table className="min-w-full">
                  <thead>
                    <tr>
                      <th className="sticky top-0 border-b bg-white px-2 py-2 text-left text-[10px] font-semibold text-slate-700">
                        Code
                      </th>
                      <th className="sticky top-0 border-b bg-white px-2 py-2 text-left text-[10px] font-semibold text-slate-700">
                        Name
                      </th>
                      <th className="sticky top-0 border-b bg-white px-2 py-2 text-left text-[10px] font-semibold text-slate-700">
                        Hall
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentRows.length ? (
                      recentRows.slice(0, 10).map((r) => (
                        <tr key={r.id} className="border-b border-slate-200">
                          <td className="px-2 py-2 text-[10px] text-slate-900">
                            {r.code}
                          </td>
                          <td className="px-2 py-2 text-[10px] text-slate-900">
                            {r.name}
                          </td>
                          <td className="px-2 py-2 text-[10px] text-slate-700">
                            {r.hallName}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan="3"
                          className="py-4 text-center text-xs text-slate-500"
                        >
                          No logs.
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