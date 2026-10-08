import React, {
  useCallback,
  useDeferredValue,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
  Camera,
  ChevronDown,
  ChevronUp,
  X,
  UserCircle2,
} from "lucide-react";
import { useHR } from "../context/HRContext";

const RECENT_PAGE = 30;

/* ------------------------------ Helpers ------------------------------ */

const pad = (n) => String(n).padStart(2, "0");
const localKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayKey = () => localKey(new Date());

const dateKey = (v) => {
  if (!v) return "";
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s.slice(0, 10) : localKey(d);
};

const weekdayOf = (key) => {
  const [y, m, d] = String(key).split("-").map(Number);
  if (!y || !m || !d) return "";
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
};

const norm = (v) => String(v || "").trim().toLowerCase();
const entryDateOf = (e) => dateKey(e?.date || e?.createdAt || e?.at || e?.timestamp);
const entryHallIdOf = (e) => String(e?.hallId || e?.hall_id || "").trim();
const entryShiftOf = (e) => String(e?.shift || "A").trim();

// Default view me C8 nahi dikhta (HR "Halls" menu se add kar sakta hai)
const isC8 = (hall) => /(^|[^a-z0-9])c[\s-]?8($|[^a-z0-9])/i.test(String(hall?.name || "").trim());
const defaultHallIds = (halls) =>
  (halls || []).filter((h) => !isC8(h)).slice(0, 4).map((h) => String(h.id));

/* -------- Viewport-fit: panel ko screen ki height me hi rakhta hai -------- */
// Desktop pe panel ka top position naapke height = screen - top set karta hai,
// isliye navbar ho ya na ho, panel neeche tak lamba nahi hota; sirf andar ki lists scroll hoti hain.

function useMediaQuery(query) {
  const [matches, setMatches] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

function useFitHeight(enabled, gap = 12) {
  const ref = useRef(null);
  const [height, setHeight] = useState(null);

  useLayoutEffect(() => {
    if (!enabled) {
      setHeight(null);
      return undefined;
    }
    const calc = () => {
      const el = ref.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY;
      setHeight(Math.max(480, Math.floor(window.innerHeight - top - gap)));
    };
    calc();
    const t = setTimeout(calc, 250); // layout settle hone ke baad ek baar aur
    window.addEventListener("resize", calc);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", calc);
    };
  }, [enabled, gap]);

  return [ref, height];
}

/* ----------------------------- Toast ----------------------------- */

function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return undefined;
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
    toast.type === "success" ? CheckCircle2 : toast.type === "error" ? XCircle : AlertTriangle;

  return (
    <div
      className={`fixed left-1/2 top-3 z-[1000] w-[calc(100vw-1rem)] max-w-lg -translate-x-1/2 rounded-xl border px-3 py-2.5 shadow-2xl sm:top-6 sm:px-4 sm:py-3 ${cls}`}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="h-4 w-4 shrink-0" />
        <span>{toast.message}</span>
      </div>
    </div>
  );
}

/* ------------------------- Camera Scanner ------------------------- */

function MobileScanner({ onResult, onClose }) {
  const videoRef = useRef(null);
  const scannerRef = useRef(null);
  const lockedRef = useRef(false);
  const onResultRef = useRef(onResult);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

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
            if (!text || lockedRef.current) return;
            lockedRef.current = true;
            scannerRef.current?.stop();
            await onResultRef.current?.(text);
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
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-2">
      <div className="flex h-[92dvh] w-full max-w-sm flex-col overflow-hidden rounded-xl border border-[#23205C] bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <h3 className="text-base font-semibold text-slate-900">QR Scanner</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-[#E0222A] px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-[#c01d24]"
          >
            Close
          </button>
        </div>
        <div className="min-h-0 flex-1 p-2">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full rounded-lg border border-slate-300 object-cover"
          />
        </div>
      </div>
    </div>
  );
}

/* --------------------------- Header Badge --------------------------- */

function HeaderBadge({ label, value, tone = "default" }) {
  const tones = {
    default: "bg-white/10 text-white",
    good: "bg-emerald-500/90 text-white",
    bad: "bg-[#E0222A] text-white",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-sm font-semibold ${tones[tone]}`}
    >
      <span className="opacity-70">{label}</span>
      <span>{value}</span>
    </span>
  );
}

/* ------------------------- Override Modal -------------------------- */

function OverrideModal({
  open,
  employee,
  code,
  message,
  halls,
  hallId,
  setHallId,
  reason,
  setReason,
  busy,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1100] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-amber-50 px-4 py-3 sm:rounded-t-2xl sm:px-5 sm:py-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-full bg-amber-100 p-2 text-amber-700">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Week-off override required</h3>
              <p className="mt-1 text-sm leading-5 text-slate-600">
                {message || "This employee's roster shows today as a scheduled week off."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 px-4 py-3 sm:space-y-4 sm:px-5 sm:py-4">
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
            <UserCircle2 className="h-8 w-8 shrink-0 text-slate-400" />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-slate-900">
                {employee?.name || "Unknown employee"}
              </div>
              <div className="text-sm text-slate-500">
                Code {code} {employee?.designation ? `• ${employee.designation}` : ""}
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Hall for this entry</label>
            <select
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
              value={hallId}
              onChange={(e) => setHallId(e.target.value)}
            >
              <option value="" disabled>
                Select a hall
              </option>
              {(halls || []).map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} ({h.capacity})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Reason for override</label>
            <input
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
              placeholder="e.g. Called in to cover an urgent shift"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-3 border-t border-slate-200 px-4 py-3 sm:px-5 sm:py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy || !hallId}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
            Confirm override
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------- Memoized list items ------------------------- */

const HallCard = React.memo(function HallCard({ h, shifts }) {
  const percent =
    h.effectiveCapacity > 0 ? Math.min(100, Math.round((h.used / h.effectiveCapacity) * 100)) : 0;

  return (
    <div className="rounded-lg border border-slate-200 p-2.5 transition hover:border-slate-300 hover:shadow-sm">
      <div className="flex items-center justify-between gap-1">
        <div className="min-w-0 truncate text-sm font-bold text-slate-900">{h.name}</div>
        <span
          className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
            h.full
              ? "bg-red-50 text-[#E0222A]"
              : h.effectiveCapacity === 0
              ? "bg-slate-100 text-slate-500"
              : "bg-emerald-50 text-emerald-700"
          }`}
        >
          {h.full ? "Full" : `${h.remaining} left`}
        </span>
      </div>
      <div className="text-xs text-slate-500">
        {h.used}/{h.effectiveCapacity} used
      </div>

      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-1.5 rounded-full transition-all ${h.full ? "bg-[#E0222A]" : "bg-[#23205C]"}`}
          style={{ width: `${percent}%` }}
        />
      </div>

      {shifts.length > 0 && (
        <div className="mt-2 grid grid-cols-2 gap-1">
          {shifts.map((shift) => {
            const info = h.shiftDetails?.[shift.code] || { capacity: 0, used: 0, full: false };
            return (
              <div
                key={shift.code}
                className={`rounded px-1 py-1 text-center ${
                  info.full
                    ? "border border-red-200 bg-red-50"
                    : info.capacity > 0
                    ? "border border-emerald-200 bg-emerald-50/60"
                    : "border border-slate-200 bg-slate-50"
                }`}
              >
                <div className="truncate text-[11px] font-semibold text-slate-500">
                  {shift.label || shift.code}
                </div>
                <div
                  className={`text-sm font-bold ${
                    info.full ? "text-[#E0222A]" : info.capacity > 0 ? "text-emerald-700" : "text-slate-400"
                  }`}
                >
                  {info.used}/{info.capacity}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

const RecentRow = React.memo(function RecentRow({ row }) {
  const override = row.overrideReason || row.override_reason;
  return (
    <div className="rounded-lg border border-slate-200 p-2.5 transition hover:bg-slate-50">
      <div className="truncate font-semibold text-slate-900">
        {row.name} <span className="text-slate-500">({row.code})</span>
      </div>
      <div className="truncate text-sm text-slate-500">
        {row.hallName || row.hall_name} • {row.shift || "A"} • {row.source || row.type || ""}
        {override && <span className="ml-1 text-amber-600">• Override: {override}</span>}
      </div>
    </div>
  );
});

/* ------------------------------- Main ------------------------------- */

export default function ScannerPanel() {
  const { state, processEntry, hrOverrideEntry, moveEmployeeToHall } = useHR();

  const [code, setCode] = useState("");
  const [selectedHall, setSelectedHall] = useState("");
  const [hallFilter, setHallFilter] = useState([]);
  const [reason, setReason] = useState("");
  const [toast, setToast] = useState(null);
  const [lastScan, setLastScan] = useState(null);
  const [mode, setMode] = useState("scan");
  const [busy, setBusy] = useState(false);
  const [mobileScannerOpen, setMobileScannerOpen] = useState(false);
  const [scannerPaused, setScannerPaused] = useState(false);
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [pendingHrMove, setPendingHrMove] = useState(false);
  const [query, setQuery] = useState("");
  const [recentLimit, setRecentLimit] = useState(RECENT_PAGE);

  const [overrideModal, setOverrideModal] = useState(null);
  const [overrideHallId, setOverrideHallId] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideBusy, setOverrideBusy] = useState(false);

  const codeInputRef = useRef(null);
  const successBeepRef = useRef(null);
  const errorBeepRef = useRef(null);
  const topAnchorRef = useRef(null);
  const hallInitRef = useRef(false);

  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [rootRef, fitHeight] = useFitHeight(isDesktop, 12);

  const deferredQuery = useDeferredValue(query);
  const isHR = state.currentRole === "HR" || state.currentRole === "ADMIN";
  const canScan = !state?.totals?.locked;
  const halls = state.halls || [];
  const shifts = state.SHIFT_OPTIONS || [];
  const isToday = selectedDate === todayKey();

  useEffect(() => {
    if (!selectedHall && halls.length) setSelectedHall(String(halls[0].id));
  }, [halls, selectedHall]);

  // Default: C8 chhod ke pehle 4 halls, sirf ek baar (refresh pe HR ka selection reset nahi hoga)
  useEffect(() => {
    if (hallInitRef.current || !halls.length) return;
    hallInitRef.current = true;
    setHallFilter(defaultHallIds(halls));
  }, [halls]);

  useEffect(() => {
    requestAnimationFrame(() => codeInputRef.current?.focus());
  }, []);

  useEffect(() => {
    setRecentLimit(RECENT_PAGE);
  }, [selectedDate, deferredQuery]);

  const findEmployee = useCallback(
    (c) => {
      const key = String(c || "").trim();
      if (!key) return null;
      return (
        (state.roster || []).find((e) => String(e.code).trim() === key) ||
        (state.employees || []).find((e) => String(e.code).trim() === key) ||
        null
      );
    },
    [state.roster, state.employees]
  );

  const empResult = useMemo(() => findEmployee(code), [code, findEmployee]);
  const overrideEmployee = useMemo(() => findEmployee(overrideModal?.code), [overrideModal, findEmployee]);

  /* Sirf selected date (default aaj) ki entries */
  const selectedEntries = useMemo(() => {
    const src = Array.isArray(state.entries) ? state.entries : [];
    const key = dateKey(selectedDate);
    return src.filter((e) => entryDateOf(e) === key);
  }, [state.entries, selectedDate]);

  /* Hall summary: roster + entries pe ek-ek pass */
  const hallSummary = useMemo(() => {
    const dayName = weekdayOf(selectedDate);

    const capMap = new Map();
    (Array.isArray(state.roster) ? state.roster : []).forEach((e) => {
      if (norm(e.weekOff || e.week_off || "Sunday") === dayName) return;
      const key = `${String(e.hallId || e.hall_id || "").trim()}__${String(e.shift || "A").trim()}`;
      capMap.set(key, (capMap.get(key) || 0) + 1);
    });

    const usedMap = new Map();
    selectedEntries.forEach((e) => {
      const key = `${entryHallIdOf(e)}__${entryShiftOf(e)}`;
      usedMap.set(key, (usedMap.get(key) || 0) + 1);
    });

    return halls.map((hall) => {
      const hid = String(hall.id).trim();
      const shiftDetails = {};
      let effectiveCapacity = 0;
      let used = 0;

      shifts.forEach((shift) => {
        const key = `${hid}__${shift.code}`;
        const capacity = capMap.get(key) || 0;
        const usedCount = usedMap.get(key) || 0;
        shiftDetails[shift.code] = {
          capacity,
          used: usedCount,
          remaining: Math.max(0, capacity - usedCount),
          full: capacity > 0 && usedCount >= capacity,
        };
        effectiveCapacity += capacity;
        used += usedCount;
      });

      return {
        ...hall,
        used,
        effectiveCapacity,
        remaining: Math.max(0, effectiveCapacity - used),
        full: effectiveCapacity > 0 && used >= effectiveCapacity,
        shiftDetails,
      };
    });
  }, [halls, shifts, state.roster, selectedEntries, selectedDate]);

  const visibleHallSummary = useMemo(() => {
    if (!hallFilter.length) return [];
    const ids = new Set(hallFilter.map(String));
    return hallSummary.filter((h) => ids.has(String(h.id)));
  }, [hallSummary, hallFilter]);

  const toggleHallFilter = (hallId) => {
    const id = String(hallId);
    setHallFilter((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  };
  const selectDefaultHalls = () => setHallFilter(defaultHallIds(halls));
  const selectAllHalls = () => setHallFilter(halls.map((h) => String(h.id)));
  const clearHallSelection = () => setHallFilter([]);

  const totals = useMemo(() => {
    const totalCapacity = hallSummary.reduce((s, h) => s + Number(h.effectiveCapacity || 0), 0);
    const totalUsed = hallSummary.reduce((s, h) => s + Number(h.used || 0), 0);
    return {
      totalCapacity,
      locked: state?.totals?.locked || false,
      selectedCount: selectedEntries.length,
      occupancy: totalCapacity > 0 ? Math.round((totalUsed / totalCapacity) * 100) : 0,
    };
  }, [hallSummary, state?.totals, selectedEntries.length]);

  /* Recent entries: latest pehle, search, 30-30 ka page */
  const recentAll = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    const list = q
      ? selectedEntries.filter((e) =>
          `${e.name || ""} ${e.code || ""} ${e.designation || ""} ${e.hallName || e.hall_name || ""} ${
            e.source || e.type || ""
          } ${e.overrideReason || e.override_reason || ""}`
            .toLowerCase()
            .includes(q)
        )
      : selectedEntries.slice();
    return list.sort((a, b) => String(b.time || "").localeCompare(String(a.time || "")));
  }, [selectedEntries, deferredQuery]);

  const recentRows = useMemo(() => recentAll.slice(0, recentLimit), [recentAll, recentLimit]);

  /* ---- UI helpers ---- */

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    topAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const playBeep = (ref) => {
    try {
      if (ref.current) {
        ref.current.currentTime = 0;
        ref.current.play();
      }
    } catch {}
  };

  const clearToast = useCallback(() => setToast(null), []);

  const pushToast = (type, message) => {
    if (type === "error") scrollToTop();
    setToast({ type, message });
    setLastScan({ type, message });
    playBeep(type === "success" ? successBeepRef : errorBeepRef);
  };

  const focusCode = () => requestAnimationFrame(() => codeInputRef.current?.focus());

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

  const closeOverrideModal = () => {
    setOverrideModal(null);
    setOverrideReason("");
    setOverrideBusy(false);
    setScannerPaused(false);
    focusCode();
  };

  const confirmOverride = async () => {
    if (!overrideModal) return;
    if (!overrideHallId) {
      pushToast("error", "Please select a hall for this override.");
      return;
    }
    setOverrideBusy(true);
    try {
      const ov = await hrOverrideEntry({
        code: overrideModal.code,
        hallId: overrideHallId,
        reason: overrideReason.trim() || "Week-off override by HR",
      });
      if (ov?.ok) {
        pushToast("success", ov.text || "Override recorded.");
        setOverrideModal(null);
        setOverrideReason("");
        resetAfterDone();
      } else {
        pushToast("error", ov?.text || "Override failed.");
        setOverrideModal(null);
        hardClearCode();
        setScannerPaused(false);
      }
    } catch (err) {
      pushToast("error", err?.message || "Override failed.");
      setOverrideModal(null);
      setScannerPaused(false);
      focusCode();
    } finally {
      setOverrideBusy(false);
    }
  };

  const onProcess = async (inputCode) => {
    const finalCode = String(inputCode ?? code).trim();
    if (!finalCode) return pushToast("error", "Please enter a code.");
    if (!canScan) return pushToast("error", "Capacity is locked for today.");
    if (busy || scannerPaused) return;

    setBusy(true);
    setScannerPaused(true);

    try {
      const res = await processEntry(finalCode);
      const text = String(res?.text || "").toLowerCase();
      const alreadyScanned = res?.alreadyScanned || text.includes("already");

      if (res?.ok) {
        pushToast("success", res.text || "Entry recorded.");
        setTimeout(resetAfterDone, 150);
        return;
      }

      if (alreadyScanned) {
        pushToast("error", res.text || "This code has already been scanned.");
        setTimeout(() => {
          hardClearCode();
          setScannerPaused(false);
        }, 120);
        return;
      }

      if (!res?.ok && res?.weekOff && isHR) {
        setOverrideModal({
          code: finalCode,
          message: res?.text || "This employee is scheduled off today.",
        });
        setOverrideHallId(selectedHall || String(halls?.[0]?.id || ""));
        setOverrideReason("");
        setScannerPaused(true);
        return;
      }

      pushToast(res?.type || "error", res?.text || "Could not process this entry.");
      setScannerPaused(false);
      focusCode();
    } catch (err) {
      pushToast("error", err?.message || "Processing failed.");
      setScannerPaused(false);
      focusCode();
    } finally {
      setBusy(false);
    }
  };

  const handleScannedCode = async (val) => {
    const value = String(val || "").trim();
    if (!value || busy || scannerPaused) return;
    setCode(value);
    await onProcess(value);
  };

  const onMove = async () => {
    const finalCode = String(code || "").trim();
    const finalReason = String(reason || "").trim();
    if (!finalCode || !selectedHall || !finalReason) {
      return pushToast("error", "Code, hall and reason are all required.");
    }
    if (busy) return;

    setBusy(true);
    try {
      const res = await moveEmployeeToHall({
        code: finalCode,
        hallId: selectedHall,
        reason: finalReason,
      });
      pushToast(res?.ok ? "success" : "error", res?.text || "Done.");
      if (res?.ok) {
        setPendingHrMove(false);
        resetAfterDone();
      } else {
        setScannerPaused(false);
        focusCode();
      }
    } catch (err) {
      pushToast("error", err?.message || "Hall move failed.");
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
    setBusy(false);
    hardClearCode();
  };

  /* ------------------------------- UI ------------------------------- */

  return (
    <div
      ref={(node) => {
        rootRef.current = node;
        topAnchorRef.current = node;
      }}
      style={fitHeight ? { height: fitHeight } : undefined}
      className="flex w-full flex-col overflow-hidden bg-white"
    >
      <audio ref={successBeepRef} src="/beep.wav" preload="auto" />
      <audio ref={errorBeepRef} src="/error.wav" preload="auto" />
      <Toast toast={toast} onClose={clearToast} />

      {mobileScannerOpen && <MobileScanner onResult={handleScannedCode} onClose={closeScanner} />}

      <OverrideModal
        open={!!overrideModal}
        employee={overrideEmployee}
        code={overrideModal?.code}
        message={overrideModal?.message}
        halls={halls}
        hallId={overrideHallId}
        setHallId={setOverrideHallId}
        reason={overrideReason}
        setReason={setOverrideReason}
        busy={overrideBusy}
        onConfirm={confirmOverride}
        onCancel={closeOverrideModal}
      />

      {/* Header */}
      <div className="shrink-0 border-b border-slate-300 bg-[#23205C] px-3 py-2.5 text-white sm:px-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="truncate text-lg font-bold sm:text-xl">Dixon Dehradun Attendance</h2>
          <div className="flex flex-wrap items-center gap-2">
            <HeaderBadge label="Role" value={state.currentRole} />
            <HeaderBadge
              label="Status"
              value={totals.locked ? "Locked" : "Open"}
              tone={totals.locked ? "bad" : "good"}
            />
            <HeaderBadge label="Scanned" value={totals.selectedCount} />
            <HeaderBadge label="Capacity" value={totals.totalCapacity} />
            <HeaderBadge label="Occupancy" value={`${totals.occupancy}%`} />
          </div>
        </div>
      </div>

      {/* Body: mobile pe stack (page scroll), desktop pe fixed 3 columns (sirf lists scroll) */}
      <div className="p-2 sm:p-3 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:overflow-hidden">
        <div className="flex flex-col gap-3 lg:min-h-0 lg:flex-1 lg:flex-row lg:overflow-hidden">
          {/* Left: scanner + HR */}
          <div className="flex flex-col gap-2 lg:min-h-0 lg:w-[25%] lg:shrink-0 lg:overflow-y-auto lg:pr-1">
            <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm">
              <div className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <ScanBarcode className="h-5 w-5" />
                Scanner / Manual Entry
              </div>

              <div className="mt-2 flex gap-2">
                <input
                  ref={codeInputRef}
                  className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-lg text-slate-900 outline-none transition focus:border-[#23205C] focus:ring-4 focus:ring-[#23205C]/10"
                  placeholder={mode === "manual" ? "Type the punch code manually" : "Scan or type a code"}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  onKeyDown={handleInputKeyDown}
                  autoComplete="off"
                />
                <button
                  className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-semibold text-slate-700 transition hover:bg-slate-50"
                  type="button"
                  onClick={onQuickCopy}
                  title="Copy code"
                  aria-label="Copy code"
                >
                  <Copy className="h-5 w-5" />
                </button>
              </div>

              {code.trim() && (
                <div
                  className={`mt-2 rounded-lg border px-3 py-2 text-sm font-medium ${
                    empResult
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-slate-50 text-slate-500"
                  }`}
                >
                  {empResult ? `${empResult.name} (${empResult.code})` : "No roster match for this code"}
                </div>
              )}

              <button
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#23205C] px-4 py-2.5 text-base font-semibold text-white transition hover:bg-[#1a1847] disabled:cursor-not-allowed disabled:opacity-50"
                type="button"
                onClick={() => onProcess()}
                disabled={busy || !canScan}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
                Process Entry
              </button>

              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  className="flex items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  type="button"
                  onClick={() => setMode(mode === "scan" ? "manual" : "scan")}
                >
                  <Keyboard className="h-4 w-4" />
                  {mode === "scan" ? "Manual" : "Scan"}
                </button>
                <button
                  className="flex items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  type="button"
                  onClick={openScanner}
                >
                  <Camera className="h-4 w-4" />
                  Camera
                </button>
              </div>

              {!canScan && (
                <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-[#E0222A]">
                  <AlertTriangle className="h-4 w-4" />
                  Capacity locked — no more entries allowed today.
                </p>
              )}

              {lastScan && (
                <div
                  className={`mt-2 rounded-lg border px-3 py-2 text-sm font-semibold ${
                    lastScan.type === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : lastScan.type === "error"
                      ? "border-red-200 bg-red-50 text-[#E0222A]"
                      : "border-amber-200 bg-amber-50 text-amber-700"
                  }`}
                >
                  <div className="text-[11px] font-medium opacity-70">Last scan</div>
                  {lastScan.message}
                </div>
              )}
            </div>

            {isHR && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-3">
                <button
                  type="button"
                  onClick={() => setPendingHrMove((v) => !v)}
                  className="flex w-full items-center justify-between gap-2 text-left text-sm font-bold text-amber-800"
                >
                  <span className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 shrink-0" />
                    HR: move employee to another hall
                  </span>
                  {pendingHrMove ? (
                    <ChevronUp className="h-4 w-4 shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 shrink-0" />
                  )}
                </button>

                {pendingHrMove && (
                  <div className="mt-3 flex flex-col gap-2">
                    <p className="text-xs text-amber-800/80">
                      Upar scanner box me employee code daalo, phir hall aur reason chuno.
                    </p>
                    <input
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
                      placeholder="Reason for the move"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                    <select
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
                      value={selectedHall}
                      onChange={(e) => setSelectedHall(e.target.value)}
                    >
                      {halls.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.name} ({h.capacity})
                        </option>
                      ))}
                    </select>
                    <button
                      className="flex items-center justify-center gap-1 rounded-lg bg-amber-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                      type="button"
                      onClick={onMove}
                      disabled={busy || !selectedHall}
                    >
                      <ShieldAlert className="h-4 w-4" />
                      Move hall
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Middle: Hall load */}
          <div className="flex min-w-0 flex-col rounded-lg border border-slate-200 bg-white p-3 shadow-sm lg:min-h-0 lg:w-[45%] lg:shrink-0 lg:overflow-hidden">
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <CalendarDays className="h-5 w-5" />
                Hall Load
                <span className="text-sm font-medium text-slate-500">
                  {isToday ? "· Today" : `· ${selectedDate}`}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {isHR && (
                  <details className="group relative">
                    <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
                      <span>Halls</span>
                      <span className="rounded-full bg-[#23205C] px-2 py-0.5 text-xs text-white">
                        {hallFilter.length}
                      </span>
                      <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
                    </summary>

                    <div className="absolute right-0 top-full z-30 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-slate-900">Select halls</span>
                        <span className="text-xs font-medium text-slate-500">{hallFilter.length} selected</span>
                      </div>

                      <div className="mb-3 flex gap-1.5">
                        <button
                          type="button"
                          onClick={selectDefaultHalls}
                          title="Pehle 4 halls (C8 ke bina)"
                          className="flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Default
                        </button>
                        <button
                          type="button"
                          onClick={selectAllHalls}
                          className="flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          All
                        </button>
                        <button
                          type="button"
                          onClick={clearHallSelection}
                          className="flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Clear
                        </button>
                      </div>

                      <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
                        {halls.map((hall) => {
                          const id = String(hall.id);
                          return (
                            <label
                              key={hall.id}
                              className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                            >
                              <input
                                type="checkbox"
                                checked={hallFilter.includes(id)}
                                onChange={() => toggleHallFilter(hall.id)}
                                className="h-4 w-4 accent-[#23205C]"
                              />
                              <span className="min-w-0 flex-1 truncate">{hall.name}</span>
                              <span className="text-xs text-slate-400">{hall.capacity}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </details>
                )}

                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value || todayKey())}
                  className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-base outline-none transition focus:border-[#23205C] focus:ring-2 focus:ring-[#23205C]/10"
                />
                {!isToday && (
                  <button
                    type="button"
                    onClick={() => setSelectedDate(todayKey())}
                    className="rounded-lg bg-[#23205C] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#1a1847]"
                  >
                    Today
                  </button>
                )}
              </div>
            </div>

            <div className="mt-3 grid max-h-[460px] grid-cols-1 content-start gap-2 overflow-y-auto overscroll-contain pr-1 sm:grid-cols-2 lg:max-h-none lg:min-h-0 lg:flex-1">
              {visibleHallSummary.length ? (
                visibleHallSummary.map((h) => <HallCard key={h.id} h={h} shifts={shifts} />)
              ) : (
                <div className="col-span-full rounded-lg border border-dashed border-slate-200 py-8 text-center text-base text-slate-500">
                  {isHR ? "Halls menu se kam se kam ek hall select karo." : "No halls to display."}
                </div>
              )}
            </div>
          </div>

          {/* Right: Recent entries */}
          <div className="flex min-w-0 flex-col rounded-lg border border-slate-200 bg-white p-3 shadow-sm lg:min-h-0 lg:flex-1 lg:overflow-hidden">
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <ScanBarcode className="h-5 w-5" />
                Recent Entries
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                  {recentAll.length}
                </span>
              </div>
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-base outline-none transition focus:border-[#23205C] focus:ring-2 focus:ring-[#23205C]/10 sm:w-52"
                placeholder="Search entries"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <div className="mt-3 h-[380px] max-h-[65vh] space-y-2 overflow-y-auto overscroll-contain pr-1 sm:h-[440px] lg:h-auto lg:max-h-none lg:min-h-0 lg:flex-1">
              {recentRows.length ? (
                recentRows.map((row, i) => (
                  <RecentRow key={row.id || `${row.code}_${entryDateOf(row)}_${i}`} row={row} />
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-slate-200 py-8 text-center text-sm text-slate-500">
                  {query ? "No entries match your search." : "No entries yet for this date."}
                </div>
              )}

              {recentAll.length > recentRows.length && (
                <button
                  type="button"
                  onClick={() => setRecentLimit((l) => l + RECENT_PAGE)}
                  className="w-full rounded-lg border border-slate-300 bg-white py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Show {Math.min(RECENT_PAGE, recentAll.length - recentRows.length)} more (
                  {recentAll.length - recentRows.length} left)
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}