import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  Download,
  Search,
  Trash2,
  ShieldAlert,
  Filter,
  Copy,
  Eye,
  Loader2,
  RefreshCw,
  FileSpreadsheet,
} from "lucide-react";
import { useHR } from "../context/HRContext";
import hrApi from "../api/hrApi";
import * as XLSX from "xlsx";

const normalizeEntry = (entry) => ({
  ...entry,
  id: entry.id,
  hallId: entry.hall_id || entry.hallId || "",
  hallName: entry.hall_name || entry.hallName || `Hall ${entry.hall_id || entry.hallId || "?"}`,
  overrideReason: entry.override_reason || entry.overrideReason || "",
  hrCode: entry.hr_code || entry.hrCode || "",
  hrAction: entry.hr_action || entry.hrAction || "",
  source: entry.source || "",
  date: entry.date || "",
  time: entry.time || "",
  day: entry.day || "",
  weekOff: entry.week_off || entry.weekOff || "Sunday",
});

const toTime = (dateStr, endOfDay = false) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  if (endOfDay) d.setHours(23, 59, 59, 999);
  else d.setHours(0, 0, 0, 0);
  return d.getTime();
};

export default function EntryTable() {
  const { state, setState, moveEmployeeToHall, refreshAfterWrite } = useHR();

  const [query, setQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [hallFilter, setHallFilter] = useState("");
  const [shiftFilter, setShiftFilter] = useState("");
  const [reasonFilter, setReasonFilter] = useState("");
  const [moveHallId, setMoveHallId] = useState("");
  const [moveCode, setMoveCode] = useState("");
  const [moveReason, setMoveReason] = useState("");
  const [selectedRow, setSelectedRow] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!moveHallId && state.halls?.length) {
      setMoveHallId(String(state.halls[0].id));
    }
  }, [state.halls, moveHallId]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = (Array.isArray(state.entries) ? state.entries : []).map(normalizeEntry);

    const fromTime = toTime(dateFrom, false);
    const toTimeValue = toTime(dateTo, true);

    return base.filter((r) => {
      const vals = [
        r.code,
        r.name,
        r.designation,
        r.hallName,
        r.shift,
        r.source,
        r.day,
        r.status,
        r.overrideReason,
        r.hrCode,
        r.hrAction,
      ]
        .join(" ")
        .toLowerCase();

      const qOk = !q || vals.includes(q);
      const sourceOk = !sourceFilter || String(r.source || "") === sourceFilter;
      const hallOk = !hallFilter || String(r.hallId || "") === hallFilter;
      const shiftOk = !shiftFilter || String(r.shift || "") === shiftFilter;

      const reasonText = String(r.overrideReason || "").toLowerCase();
      const reasonOk =
        !reasonFilter || reasonText.includes(reasonFilter.trim().toLowerCase());

      const rowTime = toTime(r.date, false);
      const dateOk =
        (!fromTime || (rowTime !== null && rowTime >= fromTime)) &&
        (!toTimeValue || (rowTime !== null && rowTime <= toTimeValue));

      return qOk && sourceOk && hallOk && shiftOk && reasonOk && dateOk;
    });
  }, [state.entries, hallFilter, query, reasonFilter, shiftFilter, sourceFilter, dateFrom, dateTo]);

  const exportCsv = () => {
    const headers = [
      "date",
      "day",
      "time",
      "code",
      "name",
      "designation",
      "shift",
      "weekOff",
      "hallId",
      "hallName",
      "source",
      "hrCode",
      "hrAction",
      "overrideReason",
    ];

    const csv = [headers, ...rows.map((r) => headers.map((h) => r[h] ?? ""))]
      .map((line) => line.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "attendance-sheet.csv";
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
      Source: r.source || "",
      HrCode: r.hrCode || "",
      HrAction: r.hrAction || "",
      OverrideReason: r.overrideReason || "",
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    XLSX.writeFile(wb, "attendance-sheet.xlsx");
  };

  const copyRow = async (r) => {
    const text = `${r.code} | ${r.name} | ${r.designation} | ${r.hallName} | ${r.source}`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
  };

  const removeEntry = async (id) => {
    const ok = window.confirm("Delete this attendance entry?");
    if (!ok) return;

    setLoading(true);
    try {
      const res = await hrApi.deleteEntry(id);
      if (res?.success) {
        setState((prev) => ({
          ...prev,
          entries: prev.entries.filter((x) => String(x.id) !== String(id)),
        }));
        if (String(selectedRow) === String(id)) setSelectedRow(null);
      } else {
        alert(res?.error || "Delete failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const onMove = async () => {
    if (!moveCode.trim() || !moveReason.trim()) {
      alert("Code aur reason required hai.");
      return;
    }

    setLoading(true);
    try {
      const res = await moveEmployeeToHall({
        code: moveCode.trim(),
        hallId: moveHallId,
        reason: moveReason.trim(),
      });

      alert(res?.text || (res?.ok ? "Moved successfully" : "Failed"));

      if (res?.ok) {
        setMoveCode("");
        setMoveReason("");
        await refreshAfterWrite();
      }
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setQuery("");
    setDateFrom("");
    setDateTo("");
    setSourceFilter("");
    setHallFilter("");
    setShiftFilter("");
    setReasonFilter("");
  };

  const refresh = async () => {
    setLoading(true);
    try {
      await refreshAfterWrite();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!moveHallId && state.halls.length) {
      setMoveHallId(String(state.halls[0].id));
    }
  }, [state.halls, moveHallId]);

  const mobileRows = rows;

  return (
    <div className="overflow-hidden border-2 border-slate-300 bg-white shadow-xl">
      <div className="border-b border-slate-300 bg-[#23205C] px-3 py-3 sm:px-5 sm:py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-bold text-white sm:text-xl">Attendance Sheet</h2>
            <p className="mt-1 text-xs text-white/70 sm:text-sm">
              Search, filter, export, and HR hall transfer.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="border border-white/30 bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/20 sm:px-4 sm:text-sm"
              onClick={clearFilters}
              type="button"
            >
              <Filter className="mr-1 inline h-4 w-4" />
              Clear
            </button>
            <button
              className="border border-white/30 bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/20 sm:px-4 sm:text-sm"
              onClick={refresh}
              type="button"
            >
              <RefreshCw className="mr-1 inline h-4 w-4" />
              Refresh
            </button>
            <button
              className="border border-white/30 bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/20 sm:px-4 sm:text-sm"
              onClick={exportCsv}
              type="button"
            >
              <Download className="mr-1 inline h-4 w-4" />
              CSV
            </button>
            <button
              className="border border-white/30 bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/20 sm:px-4 sm:text-sm"
              onClick={exportExcel}
              type="button"
            >
              <FileSpreadsheet className="mr-1 inline h-4 w-4" />
              Excel
            </button>
          </div>
        </div>
      </div>

      <div className="border-b border-slate-300 bg-slate-50 p-3 sm:p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
          <div className="relative md:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full rounded border-2 border-slate-300 bg-white px-4 py-3 pl-9 text-slate-900 outline-none focus:border-[#E0222A] focus:ring-4 focus:ring-[#E0222A]/10"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search attendance"
            />
          </div>

          <input type="date" className="rounded border-2 border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-[#E0222A]" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <input type="date" className="rounded border-2 border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-[#E0222A]" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />

          <select className="rounded border-2 border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-[#E0222A]" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
            <option value="">All sources</option>
            <option value="SCAN">SCAN</option>
            <option value="HR_OVERRIDE">HR_OVERRIDE</option>
            <option value="HR_TRANSFER">HR_TRANSFER</option>
          </select>

          <select className="rounded border-2 border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-[#E0222A]" value={hallFilter} onChange={(e) => setHallFilter(e.target.value)}>
            <option value="">All halls</option>
            {state.halls.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>

          <select className="rounded border-2 border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-[#E0222A]" value={shiftFilter} onChange={(e) => setShiftFilter(e.target.value)}>
            <option value="">All shifts</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
            <option value="AA">AA</option>
            <option value="BB">BB</option>
          </select>

          <input className="rounded border-2 border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-[#E0222A] md:col-span-2" value={reasonFilter} onChange={(e) => setReasonFilter(e.target.value)} placeholder="Filter by reason" />

          <input className="rounded border-2 border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-[#E0222A]" value={moveCode} onChange={(e) => setMoveCode(e.target.value)} placeholder="Employee code for transfer" />

          <select className="rounded border-2 border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-[#E0222A]" value={moveHallId} onChange={(e) => setMoveHallId(e.target.value)}>
            {state.halls.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>

          <input className="rounded border-2 border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-[#E0222A] md:col-span-2" value={moveReason} onChange={(e) => setMoveReason(e.target.value)} placeholder="Reason for hall move" />

          <button
            className="bg-[#E0222A] px-4 py-3 font-semibold text-white shadow-lg shadow-[#E0222A]/25 disabled:opacity-50 md:col-span-2"
            type="button"
            onClick={onMove}
            disabled={loading}
          >
            {loading ? <Loader2 className="mr-1 inline h-4 w-4 animate-spin" /> : <ShieldAlert className="mr-1 inline h-4 w-4" />}
            HR Move
          </button>
        </div>
      </div>

      <div className="px-3 pt-3 sm:px-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="border-2 border-slate-300 bg-white p-3 sm:p-4">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 sm:text-xs">
              Total Rows
            </div>
            <div className="mt-2 text-lg font-bold text-slate-900 sm:text-xl">{rows.length}</div>
          </div>
          <div className="border-2 border-slate-300 bg-white p-3 sm:p-4">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 sm:text-xs">
              Halls Used
            </div>
            <div className="mt-2 text-lg font-bold text-slate-900 sm:text-xl">
              {new Set(rows.map((r) => r.hallId)).size}
            </div>
          </div>
          <div className="border-2 border-slate-300 bg-white p-3 sm:p-4">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 sm:text-xs">
              HR Entries
            </div>
            <div className="mt-2 text-lg font-bold text-slate-900 sm:text-xl">
              {rows.filter((r) => r.source !== "SCAN").length}
            </div>
          </div>
          <div className="border-2 border-slate-300 bg-white p-3 sm:p-4">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 sm:text-xs">
              Scan Entries
            </div>
            <div className="mt-2 text-lg font-bold text-slate-900 sm:text-xl">
              {rows.filter((r) => r.source === "SCAN").length}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 px-3 pb-3 sm:px-4">
        <div className="hidden md:block">
          <div className="max-h-[520px] overflow-auto rounded border border-slate-200">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="sticky top-0 border-b-2 border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-700">Date</th>
                  <th className="sticky top-0 border-b-2 border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-700">Day</th>
                  <th className="sticky top-0 border-b-2 border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-700">Time</th>
                  <th className="sticky top-0 border-b-2 border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-700">Code</th>
                  <th className="sticky top-0 border-b-2 border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-700">Name</th>
                  <th className="sticky top-0 border-b-2 border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-700">Designation</th>
                  <th className="sticky top-0 border-b-2 border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-700">Shift</th>
                  <th className="sticky top-0 border-b-2 border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-700">Hall</th>
                  <th className="sticky top-0 border-b-2 border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-700">Source</th>
                  <th className="sticky top-0 border-b-2 border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-700">Reason</th>
                  <th className="sticky top-0 border-b-2 border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-700">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.length ? (
                  rows.map((r) => (
                    <tr
                      key={`${r.id}-${r.code}-${r.time}-${r.name}-${r.hallId}`}
                      className={String(selectedRow) === String(r.id) ? "bg-slate-100" : "border-b border-slate-200"}
                      onClick={() => setSelectedRow(r.id)}
                    >
                      <td className="px-3 py-3 text-sm text-slate-700">{String(r.date).slice(0, 10)}</td>
                      <td className="px-3 py-3 text-sm text-slate-700">{r.day}</td>
                      <td className="px-3 py-3 text-sm text-slate-700">{r.time}</td>
                      <td className="px-3 py-3 text-sm font-bold text-slate-900">{r.code}</td>
                      <td className="px-3 py-3 text-sm text-slate-900">{r.name}</td>
                      <td className="px-3 py-3 text-sm text-slate-700">{r.designation || "-"}</td>
                      <td className="px-3 py-3 text-sm text-slate-700">{r.shift}</td>
                      <td className="px-3 py-3 text-sm">
                        <span className="border border-slate-300 bg-white px-2 py-1 text-slate-700">
                          {r.hallName}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-sm">
                        <span
                          className={
                            r.source === "SCAN"
                              ? "border border-emerald-300 bg-emerald-50 px-2 py-1 text-emerald-700"
                              : "border border-[#E0222A] bg-[#E0222A]/10 px-2 py-1 text-[#E0222A]"
                          }
                        >
                          {r.source}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-sm text-slate-500">{r.overrideReason || "-"}</td>
                      <td className="px-3 py-3 text-sm">
                        <div className="flex gap-2">
                          <button className="border border-slate-300 bg-white px-3 py-2 font-semibold text-slate-700" type="button" onClick={() => copyRow(r)}>
                            <Copy className="h-4 w-4" />
                          </button>
                          <button className="border border-slate-300 bg-white px-3 py-2 font-semibold text-slate-700" type="button" onClick={() => setSelectedRow(r.id)}>
                            <Eye className="h-4 w-4" />
                          </button>
                          <button className="border border-[#E0222A] bg-[#E0222A]/10 px-3 py-2 font-semibold text-[#E0222A]" onClick={() => removeEntry(r.id)} type="button">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="11" className="py-10 text-center text-sm text-slate-500">
                      No attendance records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid gap-3 md:hidden">
          {mobileRows.length ? (
            mobileRows.map((r) => (
              <div
                key={`${r.id}-${r.code}-${r.time}-${r.name}`}
                className={`rounded border p-3 ${String(selectedRow) === String(r.id) ? "border-slate-400 bg-slate-50" : "border-slate-200 bg-white"}`}
                onClick={() => setSelectedRow(r.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs text-slate-500">
                      {String(r.date).slice(0, 10)} • {r.day} • {r.time}
                    </div>
                    <div className="mt-1 text-sm font-bold text-slate-900">{r.name}</div>
                    <div className="text-xs text-slate-700">
                      {r.code} • {r.designation || "-"} • {r.shift || "-"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700">
                      {r.hallName}
                    </div>
                    <div
                      className={`mt-2 inline-block rounded px-2 py-1 text-[10px] font-semibold ${
                        r.source === "SCAN"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-[#E0222A]/10 text-[#E0222A]"
                      }`}
                    >
                      {r.source}
                    </div>
                  </div>
                </div>

                <div className="mt-2 text-xs text-slate-500">{r.overrideReason || "-"}</div>

                <div className="mt-3 flex gap-2">
                  <button className="flex-1 rounded border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700" type="button" onClick={() => copyRow(r)}>
                    <Copy className="mr-1 inline h-4 w-4" />
                    Copy
                  </button>
                  <button className="flex-1 rounded border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700" type="button" onClick={() => setSelectedRow(r.id)}>
                    <Eye className="mr-1 inline h-4 w-4" />
                    View
                  </button>
                  <button className="flex-1 rounded border border-[#E0222A] bg-[#E0222A]/10 px-3 py-2 text-sm font-semibold text-[#E0222A]" onClick={() => removeEntry(r.id)} type="button">
                    <Trash2 className="mr-1 inline h-4 w-4" />
                    Delete
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded border border-slate-200 bg-white p-4 text-center text-sm text-slate-500">
              No attendance records found.
            </div>
          )}
        </div>
      </div>

      {selectedRow ? (
        <div className="border-t border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          Selected entry highlighted. Use export, delete, or HR move actions.
        </div>
      ) : null}
    </div>
  );
}