import React, {
  useCallback,
  useDeferredValue,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Download,
  Search,
  Trash2,
  ShieldAlert,
  Filter,
  Copy,
  Loader2,
  RefreshCw,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  CalendarDays,
} from "lucide-react";
import { useHR } from "../context/HRContext";
import hrApi from "../api/hrApi";
import * as XLSX from "xlsx";

const PAGE_SIZE = 40;

/* ------------------------------ Helpers ------------------------------ */

const pad = (n) => String(n).padStart(2, "0");
const localKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayKey = () => localKey(new Date());
const daysAgoKey = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return localKey(d);
};

const dateKeyOf = (v) => {
  if (!v) return "";
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? "" : localKey(d);
};

const normalizeEntry = (entry) => {
  const hallId = entry.hall_id || entry.hallId || "";
  const hallName = entry.hall_name || entry.hallName || `Hall ${hallId || "?"}`;
  const overrideReason = entry.override_reason || entry.overrideReason || "";
  const hrCode = entry.hr_code || entry.hrCode || "";
  const hrAction = entry.hr_action || entry.hrAction || "";
  const row = {
    ...entry,
    id: entry.id,
    hallId,
    hallName,
    overrideReason,
    hrCode,
    hrAction,
    date: entry.date || "",
    time: entry.time || "",
    day: entry.day || "",
    weekOff: entry.week_off || entry.weekOff || "Sunday",
    _dateKey: dateKeyOf(entry.date),
  };
  row._search = [
    row.code,
    row.name,
    row.designation,
    hallName,
    row.shift,
    row.day,
    row.status,
    overrideReason,
    hrCode,
    hrAction,
  ]
    .join(" ")
    .toLowerCase();
  return row;
};

/* -------- Viewport-fit: sheet screen ki height me hi rehti hai, andar table scroll hota hai -------- */

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
    const t = setTimeout(calc, 250);
    window.addEventListener("resize", calc);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", calc);
    };
  }, [enabled, gap]);

  return [ref, height];
}

/* ------------------------------ Styles ------------------------------ */

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-[#23205C] focus:ring-4 focus:ring-[#23205C]/10";

const headerBtn =
  "inline-flex items-center gap-1.5 rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm";

const thCls =
  "sticky top-0 z-10 border-b-2 border-slate-300 bg-slate-50 px-3 py-2.5 text-left text-xs font-semibold text-slate-600";

/* ------------------------- Memoized rows ------------------------- */

const TableRow = React.memo(function TableRow({ r, selected, active, onToggle, onSelect, onCopy, onRemove }) {
  return (
    <tr
      className={`border-b border-slate-100 ${
        selected ? "bg-red-50" : active ? "bg-slate-100" : "hover:bg-slate-50"
      }`}
      onClick={() => onSelect(r.id)}
    >
      <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggle(r.id)}
          className="h-4 w-4 cursor-pointer accent-[#E0222A]"
        />
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-sm text-slate-700">{String(r.date).slice(0, 10)}</td>
      <td className="px-3 py-2 text-sm text-slate-700">{r.day}</td>
      <td className="px-3 py-2 text-sm font-bold text-slate-900">{r.code}</td>
      <td className="px-3 py-2 text-sm text-slate-900">{r.name}</td>
      <td className="px-3 py-2 text-sm text-slate-700">{r.designation || "-"}</td>
      <td className="px-3 py-2 text-sm text-slate-700">{r.shift}</td>
      <td className="px-3 py-2 text-sm">
        <span className="whitespace-nowrap rounded border border-slate-300 bg-white px-2 py-0.5 text-slate-700">
          {r.hallName}
        </span>
      </td>
      <td className="max-w-[200px] truncate px-3 py-2 text-sm text-slate-500" title={r.overrideReason}>
        {r.overrideReason || "-"}
      </td>
      <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
        <div className="flex gap-1.5">
          <button
            className="rounded-md border border-slate-300 bg-white p-1.5 text-slate-700 hover:bg-slate-50"
            type="button"
            title="Copy"
            onClick={() => onCopy(r)}
          >
            <Copy className="h-4 w-4" />
          </button>
          <button
            className="rounded-md border border-[#E0222A] bg-[#E0222A]/10 p-1.5 text-[#E0222A] hover:bg-[#E0222A]/20"
            type="button"
            title="Delete"
            onClick={() => onRemove(r.id)}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
});

const MobileCard = React.memo(function MobileCard({ r, selected, active, onToggle, onSelect, onCopy, onRemove }) {
  return (
    <div
      className={`rounded-lg border p-3 ${
        selected
          ? "border-red-200 bg-red-50"
          : active
          ? "border-slate-400 bg-slate-50"
          : "border-slate-200 bg-white"
      }`}
      onClick={() => onSelect(r.id)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggle(r.id)}
            onClick={(e) => e.stopPropagation()}
            className="mt-1 h-4 w-4 cursor-pointer accent-[#E0222A]"
          />
          <div className="min-w-0">
            <div className="text-xs text-slate-500">
              {String(r.date).slice(0, 10)} • {r.day}
            </div>
            <div className="mt-0.5 truncate text-sm font-bold text-slate-900">{r.name}</div>
            <div className="text-xs text-slate-700">
              {r.code} • {r.designation || "-"} • {r.shift || "-"}
            </div>
          </div>
        </div>
        <span className="shrink-0 rounded border border-slate-300 bg-white px-2 py-0.5 text-xs text-slate-700">
          {r.hallName}
        </span>
      </div>
      {r.overrideReason && <div className="mt-2 text-xs text-amber-700">Reason: {r.overrideReason}</div>}
      <div className="mt-2 flex gap-2" onClick={(e) => e.stopPropagation()}>
        <button
          className="flex flex-1 items-center justify-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700"
          type="button"
          onClick={() => onCopy(r)}
        >
          <Copy className="h-4 w-4" /> Copy
        </button>
        <button
          className="flex flex-1 items-center justify-center gap-1 rounded-md border border-[#E0222A] bg-[#E0222A]/10 px-3 py-1.5 text-sm font-semibold text-[#E0222A]"
          type="button"
          onClick={() => onRemove(r.id)}
        >
          <Trash2 className="h-4 w-4" /> Delete
        </button>
      </div>
    </div>
  );
});

/* ------------------------------- Main ------------------------------- */

export default function EntryTable() {
  const { state, setState, moveEmployeeToHall, refreshAfterWrite } = useHR();

  const [query, setQuery] = useState("");
  const [dateFrom, setDateFrom] = useState(todayKey);
  const [dateTo, setDateTo] = useState(todayKey);
  const [hallFilter, setHallFilter] = useState("");
  const [shiftFilter, setShiftFilter] = useState("");
  const [reasonFilter, setReasonFilter] = useState("");
  const [moveHallId, setMoveHallId] = useState("");
  const [moveCode, setMoveCode] = useState("");
  const [moveReason, setMoveReason] = useState("");
  const [moveOpen, setMoveOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [moveMsg, setMoveMsg] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);

  const isWide = useMediaQuery("(min-width: 768px)");
  const [rootRef, fitHeight] = useFitHeight(isWide, 12);

  const deferredQuery = useDeferredValue(query);
  const halls = state.halls || [];

  useEffect(() => {
    if (!moveHallId && halls.length) setMoveHallId(String(halls[0].id));
  }, [halls, moveHallId]);

  useEffect(() => {
    setLimit(PAGE_SIZE);
  }, [deferredQuery, dateFrom, dateTo, hallFilter, shiftFilter, reasonFilter]);

  /* Step 1: date range (default aaj) — sasta string compare, phir sirf matching rows normalize */
  const normalized = useMemo(() => {
    const src = Array.isArray(state.entries) ? state.entries : [];
    const out = [];
    for (const e of src) {
      const k = dateKeyOf(e.date);
      if (dateFrom && (!k || k < dateFrom)) continue;
      if (dateTo && (!k || k > dateTo)) continue;
      out.push(normalizeEntry(e));
    }
    out.sort((a, b) => {
      if (a._dateKey !== b._dateKey) return a._dateKey < b._dateKey ? 1 : -1;
      return String(b.time).localeCompare(String(a.time));
    });
    return out;
  }, [state.entries, dateFrom, dateTo]);

  /* Step 2: baaki filters */
  const rows = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    const reasonQ = reasonFilter.trim().toLowerCase();
    return normalized.filter((r) => {
      if (q && !r._search.includes(q)) return false;
      if (hallFilter && String(r.hallId || "") !== hallFilter) return false;
      if (shiftFilter && String(r.shift || "") !== shiftFilter) return false;
      if (reasonQ && !String(r.overrideReason).toLowerCase().includes(reasonQ)) return false;
      return true;
    });
  }, [normalized, deferredQuery, hallFilter, shiftFilter, reasonFilter]);

  const visibleRows = useMemo(() => rows.slice(0, limit), [rows, limit]);
  const selectedSet = useMemo(() => new Set(selectedIds.map(String)), [selectedIds]);
  const hallsUsed = useMemo(() => new Set(rows.map((r) => r.hallId)).size, [rows]);
  const allSelected = rows.length > 0 && rows.every((r) => selectedSet.has(String(r.id)));

  const today = todayKey();
  const presets = [
    { label: "Today", from: today, to: today },
    { label: "Yesterday", from: daysAgoKey(1), to: daysAgoKey(1) },
    { label: "Last 7 days", from: daysAgoKey(6), to: today },
    { label: "All", from: "", to: "" },
  ];

  /* ------------------------------ Exports ------------------------------ */

  const fileSuffix = `${dateFrom || "all"}${dateTo && dateTo !== dateFrom ? `_to_${dateTo}` : ""}`;

  const exportCsv = () => {
    const headers = [
      "date", "day", "time", "code", "name", "designation", "shift",
      "weekOff", "hallId", "hallName", "hrCode", "hrAction", "overrideReason",
    ];
    const csv = [headers, ...rows.map((r) => headers.map((h) => r[h] ?? ""))]
      .map((line) => line.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-${fileSuffix}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportExcel = () => {
    const data = rows.map((r) => ({
      Date: String(r.date).slice(0, 10),
      Day: r.day || "",
      Time: r.time || "",
      Code: r.code || "",
      Name: r.name || "",
      Designation: r.designation || "",
      Shift: r.shift || "",
      WeekOff: r.weekOff || "",
      HallId: r.hallId || "",
      HallName: r.hallName || "",
      HrCode: r.hrCode || "",
      HrAction: r.hrAction || "",
      OverrideReason: r.overrideReason || "",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    XLSX.writeFile(wb, `attendance-${fileSuffix}.xlsx`);
  };

  /* ------------- Stable callbacks (taaki memo rows re-render na hon) ------------- */

  const copyRow = useCallback(async (r) => {
    try {
      await navigator.clipboard.writeText(`${r.code} | ${r.name} | ${r.designation} | ${r.hallName}`);
    } catch {}
  }, []);

  const toggleSelect = useCallback((id) => {
    const key = String(id);
    setSelectedIds((prev) =>
      prev.some((x) => String(x) === key) ? prev.filter((x) => String(x) !== key) : [...prev, id]
    );
  }, []);

  const selectRow = useCallback((id) => setSelectedRow(id), []);

  const toggleSelectAll = () => {
    if (!rows.length) return;
    setSelectedIds(allSelected ? [] : rows.map((r) => r.id));
  };

  const removeEntry = useCallback(
    async (id) => {
      if (!window.confirm("Delete this attendance entry?")) return;
      setLoading(true);
      setDeleteError("");
      try {
        const res = await hrApi.deleteEntry(id);
        if (res?.success) {
          setState((prev) => ({
            ...prev,
            entries: prev.entries.filter((x) => String(x.id) !== String(id)),
          }));
          setSelectedRow((cur) => (String(cur) === String(id) ? null : cur));
        } else {
          setDeleteError(res?.error || "Delete failed");
        }
      } finally {
        setLoading(false);
      }
    },
    [setState]
  );

  const deleteSelected = async () => {
    if (!selectedIds.length) return;
    const ok = window.confirm(
      `Delete ${selectedIds.length} selected attendance entr${selectedIds.length === 1 ? "y" : "ies"}?`
    );
    if (!ok) return;

    setLoading(true);
    setDeleteError("");
    try {
      const results = await Promise.all(selectedIds.map((id) => hrApi.deleteEntry(id)));
      const failed = results.filter((res) => !res?.success);
      if (failed.length) {
        setDeleteError(`${failed.length} entr${failed.length === 1 ? "y" : "ies"} could not be deleted.`);
      }
      const deleted = new Set(selectedIds.filter((_, i) => results[i]?.success).map(String));
      if (deleted.size) {
        setState((prev) => ({
          ...prev,
          entries: prev.entries.filter((x) => !deleted.has(String(x.id))),
        }));
      }
      setSelectedIds([]);
      setSelectedRow(null);
    } catch (err) {
      setDeleteError(err?.message || "Bulk delete failed");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------------------- HR hall move ---------------------------- */

  const onMove = async () => {
    if (!moveCode.trim() || !moveReason.trim()) {
      setMoveMsg({ type: "error", text: "Code aur reason required hai." });
      return;
    }
    setLoading(true);
    setMoveMsg(null);
    try {
      const res = await moveEmployeeToHall({
        code: moveCode.trim(),
        hallId: moveHallId,
        reason: moveReason.trim(),
      });
      setMoveMsg({
        type: res?.ok ? "success" : "error",
        text: res?.text || (res?.ok ? "Moved successfully" : "Failed"),
      });
      if (res?.ok) {
        setMoveCode("");
        setMoveReason("");
        await refreshAfterWrite();
      }
    } finally {
      setLoading(false);
    }
  };

  const applyPreset = (p) => {
    setDateFrom(p.from);
    setDateTo(p.to);
  };

  const clearFilters = () => {
    setQuery("");
    setDateFrom(todayKey());
    setDateTo(todayKey());
    setHallFilter("");
    setShiftFilter("");
    setReasonFilter("");
    setSelectedIds([]);
    setSelectedRow(null);
  };

  const refresh = async () => {
    setLoading(true);
    try {
      await refreshAfterWrite();
    } finally {
      setLoading(false);
    }
  };

  const dateLabel =
    dateFrom && dateFrom === dateTo
      ? ` on ${dateFrom}`
      : dateFrom || dateTo
      ? ` (${dateFrom || "…"} to ${dateTo || "…"})`
      : " (all dates)";

  /* ------------------------------- UI ------------------------------- */

  return (
    <div
      ref={rootRef}
      style={fitHeight ? { height: fitHeight } : undefined}
      className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      {/* Header */}
      <div className="shrink-0 border-b border-slate-200 bg-[#23205C] px-3 py-3 sm:px-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-bold text-white sm:text-xl">Attendance Sheet</h2>
            <p className="mt-0.5 text-xs text-white/70 sm:text-sm">
              {rows.length} record{rows.length === 1 ? "" : "s"}
              {dateLabel} · {hallsUsed} hall{hallsUsed === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedIds.length > 0 && (
              <button
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-500 px-3 py-2 text-xs font-bold text-white transition hover:bg-red-600 disabled:opacity-50 sm:text-sm"
                onClick={deleteSelected}
                type="button"
                disabled={loading}
              >
                <Trash2 className="h-4 w-4" />
                Delete ({selectedIds.length})
              </button>
            )}
            <button className={headerBtn} onClick={refresh} type="button" disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button className={headerBtn} onClick={exportCsv} type="button" disabled={!rows.length}>
              <Download className="h-4 w-4" />
              CSV
            </button>
            <button className={headerBtn} onClick={exportExcel} type="button" disabled={!rows.length}>
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </button>
          </div>
        </div>
      </div>

      {deleteError && (
        <div
          className="mx-3 mt-3 shrink-0 rounded-lg border border-[#E0222A]/20 bg-[#E0222A]/5 px-4 py-2.5 text-sm font-medium text-[#E0222A] sm:mx-4"
          role="alert"
        >
          {deleteError}
        </div>
      )}

      {/* Filters */}
      <div className="shrink-0 space-y-2 border-b border-slate-200 bg-slate-50 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <CalendarDays className="h-4 w-4 text-slate-500" />
          {presets.map((p) => {
            const active = dateFrom === p.from && dateTo === p.to;
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => applyPreset(p)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition sm:text-sm ${
                  active
                    ? "border-[#23205C] bg-[#23205C] text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                }`}
              >
                {p.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={clearFilters}
            className="ml-auto inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 sm:text-sm"
          >
            <Filter className="h-3.5 w-3.5" />
            Reset
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
          <div className="relative col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className={`${inputCls} pl-9`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, code, hall…"
            />
          </div>
          <input type="date" className={inputCls} value={dateFrom} max={dateTo || undefined} onChange={(e) => setDateFrom(e.target.value)} aria-label="From date" />
          <input type="date" className={inputCls} value={dateTo} min={dateFrom || undefined} onChange={(e) => setDateTo(e.target.value)} aria-label="To date" />
          <select className={inputCls} value={hallFilter} onChange={(e) => setHallFilter(e.target.value)}>
            <option value="">All halls</option>
            {halls.map((h) => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
          <select className={inputCls} value={shiftFilter} onChange={(e) => setShiftFilter(e.target.value)}>
            <option value="">All shifts</option>
            {["A", "B", "C", "AA", "BB"].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <input
            className={`${inputCls} col-span-2 md:col-span-6`}
            value={reasonFilter}
            onChange={(e) => setReasonFilter(e.target.value)}
            placeholder="Filter by reason"
          />
        </div>
      </div>

      {/* HR move (collapsible) */}
      <div className="shrink-0 border-b border-slate-200 bg-amber-50">
        <button
          type="button"
          onClick={() => setMoveOpen((v) => !v)}
          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-bold text-amber-800"
        >
          <span className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" />
            HR hall transfer
          </span>
          {moveOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {moveOpen && (
          <div className="px-3 pb-3">
            {moveMsg && (
              <div
                className={`mb-2 rounded-lg px-3 py-2 text-sm font-medium ${
                  moveMsg.type === "success" ? "bg-emerald-100 text-emerald-700" : "bg-[#E0222A]/10 text-[#E0222A]"
                }`}
              >
                {moveMsg.text}
              </div>
            )}
            <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
              <input
                className={`${inputCls} focus:!border-amber-500 focus:!ring-amber-500/10`}
                value={moveCode}
                onChange={(e) => setMoveCode(e.target.value)}
                placeholder="Employee code"
              />
              <select
                className={`${inputCls} focus:!border-amber-500 focus:!ring-amber-500/10`}
                value={moveHallId}
                onChange={(e) => setMoveHallId(e.target.value)}
              >
                {halls.map((h) => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
              <input
                className={`${inputCls} focus:!border-amber-500 focus:!ring-amber-500/10`}
                value={moveReason}
                onChange={(e) => setMoveReason(e.target.value)}
                placeholder="Reason for hall move"
              />
              <button
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                type="button"
                onClick={onMove}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
                HR Move
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Data area: desktop pe bachi hui poori height, sirf yahi scroll hota hai */}
      <div className="flex min-h-0 flex-1 flex-col p-3">
        {isWide ? (
          <div className="min-h-0 flex-1 overflow-auto overscroll-contain rounded-lg border border-slate-200">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className={`${thCls} w-10 text-center`}>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      title={`Select all ${rows.length}`}
                      className="h-4 w-4 cursor-pointer accent-[#23205C]"
                    />
                  </th>
                  <th className={thCls}>Date</th>
                  <th className={thCls}>Day</th>
                  <th className={thCls}>Code</th>
                  <th className={thCls}>Name</th>
                  <th className={thCls}>Designation</th>
                  <th className={thCls}>Shift</th>
                  <th className={thCls}>Hall</th>
                  <th className={thCls}>Reason</th>
                  <th className={thCls}>Action</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.length ? (
                  visibleRows.map((r, i) => (
                    <TableRow
                      key={r.id ?? `${r.code}-${r.time}-${i}`}
                      r={r}
                      selected={selectedSet.has(String(r.id))}
                      active={String(selectedRow) === String(r.id)}
                      onToggle={toggleSelect}
                      onSelect={selectRow}
                      onCopy={copyRow}
                      onRemove={removeEntry}
                    />
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-sm text-slate-500">
                      Is filter me koi attendance record nahi mila.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {rows.length > visibleRows.length && (
              <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                <span>
                  Showing {visibleRows.length} of {rows.length}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setLimit((l) => l + PAGE_SIZE)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Show {Math.min(PAGE_SIZE, rows.length - visibleRows.length)} more
                  </button>
                  <button
                    type="button"
                    onClick={() => setLimit(rows.length)}
                    className="rounded-lg bg-[#23205C] px-3 py-1.5 font-semibold text-white hover:bg-[#1a1847]"
                  >
                    Show all
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="max-h-[70dvh] space-y-2 overflow-y-auto overscroll-contain">
            {visibleRows.length ? (
              visibleRows.map((r, i) => (
                <MobileCard
                  key={r.id ?? `${r.code}-${r.time}-${i}`}
                  r={r}
                  selected={selectedSet.has(String(r.id))}
                  active={String(selectedRow) === String(r.id)}
                  onToggle={toggleSelect}
                  onSelect={selectRow}
                  onCopy={copyRow}
                  onRemove={removeEntry}
                />
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
                Is filter me koi attendance record nahi mila.
              </div>
            )}

            {rows.length > visibleRows.length && (
              <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                <span>
                  {visibleRows.length} / {rows.length}
                </span>
                <button
                  type="button"
                  onClick={() => setLimit((l) => l + PAGE_SIZE)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-700"
                >
                  Show more
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}