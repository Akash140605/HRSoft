import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Search, Loader2, RefreshCw, FilterX } from "lucide-react";
import { useHR } from "../context/HRContext";
import hrApi from "../api/hrApi";

const normalizeTracker = (row) => ({
  ...row,
  id: row.id || row.code,
  code: String(row.code || "").trim(),
  name: row.name || "",
  designation: row.designation || "",
  hallId: row.hallId || row.hall_id || "",
  hallName: row.hallName || row.hall_name || "",
  shift: row.shift || "",
  weekOff: row.weekOff || row.week_off || "",
  presentDays: Number(row.presentDays || 0),
  absentDays: Number(row.absentDays || 0),
  totalRecords: Number(row.totalRecords || 0),
  lastSeen: row.lastSeen || "",
});

export default function EmployeeTracker() {
  const { state, setState } = useHR();
  const [query, setQuery] = useState("");
  const [hallId, setHallId] = useState("");
  const [shift, setShift] = useState("");
  const [absentDaysMin, setAbsentDaysMin] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchTracker = useCallback(async () => {
    setLoading(true);
    try {
      const res = await hrApi.getAttendanceTracker();
      if (res.success) {
        setState((prev) => ({
          ...prev,
          attendanceTracker: Array.isArray(res.data) ? res.data.map(normalizeTracker) : [],
        }));
      }
    } finally {
      setLoading(false);
    }
  }, [setState]);

  useEffect(() => {
    fetchTracker();
  }, [fetchTracker, refreshKey]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = Array.isArray(state.attendanceTracker) ? state.attendanceTracker.map(normalizeTracker) : [];

    return base.filter((e) => {
      const text = `${e.name || ""} ${e.code || ""} ${e.designation || ""} ${e.hallName || ""} ${e.shift || ""} ${e.weekOff || ""}`.toLowerCase();
      const hallOk = !hallId || String(e.hallId || "") === String(hallId);
      const shiftOk = !shift || String(e.shift || "") === String(shift);
      const absentOk = !absentDaysMin || Number(e.absentDays || 0) >= Number(absentDaysMin);
      const queryOk = !q || text.includes(q);
      return hallOk && shiftOk && absentOk && queryOk;
    });
  }, [absentDaysMin, hallId, query, shift, state.attendanceTracker]);

  const clearFilters = () => {
    setQuery("");
    setHallId("");
    setShift("");
    setAbsentDaysMin("");
  };

  return (
    <div className="overflow-hidden border border-slate-200 bg-white shadow-xl">
      <div className="border-b border-slate-200 bg-white px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Employee Tracker</h2>
            <p className="mt-1 text-sm text-slate-500">Absent, hall, shift, and week-off tracking</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-2 border-2 border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <FilterX className="h-4 w-4" />
              Clear
            </button>
            <button
              type="button"
              onClick={() => setRefreshKey((k) => k + 1)}
              className="inline-flex items-center gap-2 border-2 border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="border-b border-slate-200 bg-slate-50 p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <div className="relative md:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input w-full pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search employee (name, code, designation, hall)"
            />
          </div>

          <select className="input" value={hallId} onChange={(e) => setHallId(e.target.value)}>
            <option value="">All halls</option>
            {state.halls.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>

          <select className="input" value={shift} onChange={(e) => setShift(e.target.value)}>
            <option value="">All shifts</option>
            {["A", "B", "C", "AA", "BB"].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <input
            className="input"
            value={absentDaysMin}
            onChange={(e) => setAbsentDaysMin(e.target.value)}
            placeholder="Min absent days"
            inputMode="numeric"
          />
        </div>
      </div>

      <div className="max-h-[520px] overflow-auto">
        <table className="min-w-full">
          <thead>
            <tr>
              <th className="sticky top-0 bg-slate-50">Code</th>
              <th className="sticky top-0 bg-slate-50">Name</th>
              <th className="sticky top-0 bg-slate-50">Designation</th>
              <th className="sticky top-0 bg-slate-50">Hall</th>
              <th className="sticky top-0 bg-slate-50">Shift</th>
              <th className="sticky top-0 bg-slate-50">Week Off</th>
              <th className="sticky top-0 bg-slate-50">Present Days</th>
              <th className="sticky top-0 bg-slate-50">Absent Days</th>
              <th className="sticky top-0 bg-slate-50">Last Seen</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9" className="py-10 text-center text-sm text-slate-500">
                  <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                  Loading tracker...
                </td>
              </tr>
            ) : rows.length ? (
              rows.map((r) => (
                <tr key={String(r.id) || String(r.code)}>
                  <td className="font-medium text-slate-900">{r.code}</td>
                  <td>{r.name}</td>
                  <td>{r.designation || "-"}</td>
                  <td>{r.hallName || "-"}</td>
                  <td>{r.shift || "-"}</td>
                  <td>{r.weekOff || "-"}</td>
                  <td>{Number(r.presentDays || 0)}</td>
                  <td>{Number(r.absentDays || 0)}</td>
                  <td>{r.lastSeen ? String(r.lastSeen).slice(0, 10) : "-"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="9" className="py-10 text-center text-sm text-slate-500">
                  No tracker data found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}