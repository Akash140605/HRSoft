import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Search, Loader2, FilterX, RefreshCw, Copy, Eye, Trash2 } from "lucide-react";
import { useHR } from "../context/HRContext";
import hrApi from "../api/hrApi";

const getLogValue = (log, keys) => {
  for (const key of keys) {
    const val = log?.[key];
    if (val !== undefined && val !== null && String(val).trim() !== "") return String(val).trim();
  }
  return "";
};

const normalizeLog = (log) => ({
  ...log,
  id: log?.id ?? `${log?.at || log?.date || log?.createdAt || Date.now()}-${Math.random()}`,
  at: log?.at || log?.date || log?.createdAt || log?.time || "",
  type: getLogValue(log, ["type", "hrAction", "source"]),
  message: getLogValue(log, ["message", "note", "reason", "overrideReason", "override_reason"]),
  performedBy: getLogValue(log, ["performedBy", "by", "hrCode", "hr_code", "username", "user", "roleId"]),
  employeeCode: getLogValue(log, ["employeeCode", "employee_code", "code", "empCode"]),
  hallId: getLogValue(log, ["hallId", "hall_id"]),
  hallName: getLogValue(log, ["hallName", "hall_name"]),
  overrideReason: getLogValue(log, ["overrideReason", "override_reason", "reason"]),
});

const getLogsArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.logs)) return data.logs;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.rows)) return data.rows;
  if (Array.isArray(data?.result)) return data.result;
  return [];
};

const text = (v) => String(v ?? "").trim();

export default function HRLogsPanel() {
  const { state, setState } = useHR();
  const [query, setQuery] = useState("");
  const [hrCode, setHrCode] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [actionType, setActionType] = useState("");
  const [selectedHrId, setSelectedHrId] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState("");
  const [selectedRow, setSelectedRow] = useState(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await hrApi.getLogs();
      const raw = res?.success ? getLogsArray(res.data ?? res) : [];
      const normalized = raw.map(normalizeLog);
      setState((prev) => ({ ...prev, logs: normalized }));
    } catch (err) {
      console.error("getLogs failed:", err);
      setError("Logs load nahi ho paaye. API response ya backend check karo.");
      setState((prev) => ({ ...prev, logs: [] }));
    } finally {
      setLoading(false);
    }
  }, [setState]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs, refreshKey]);

  const hrIds = useMemo(() => {
    const ids = new Set();
    (state.logs || []).forEach((log) => {
      const id = text(log.performedBy || log.hrCode || log.hr_code || log.username || log.user || log.roleId);
      if (id) ids.add(id);
    });
    return Array.from(ids).sort((a, b) => a.localeCompare(b));
  }, [state.logs]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (state.logs || []).filter((log) => {
      const logHr = text(log.performedBy || log.hrCode || log.hr_code || log.username || log.user || log.roleId);
      const logEmp = text(log.employeeCode || log.employee_code || log.code || log.empCode);
      const logType = text(log.type || log.hrAction || log.source).toUpperCase();
      const logMsg = text(log.message || log.overrideReason || log.reason);
      const logHall = text(log.hallName || log.hall_name || log.hallId || log.hall_id);
      const logReason = text(log.overrideReason || log.reason);
      const hay = `${logType} ${logMsg} ${logHr} ${logEmp} ${logHall} ${logReason}`.toLowerCase();
      const hrOk = !hrCode || logHr.toUpperCase() === hrCode.trim().toUpperCase();
      const selectedHrOk = !selectedHrId || logHr.toUpperCase() === selectedHrId.trim().toUpperCase();
      const empOk = !employeeCode || logEmp.toUpperCase() === employeeCode.trim().toUpperCase();
      const actOk = !actionType || logType === actionType.trim().toUpperCase();
      const qOk = !q || hay.includes(q);
      return hrOk && selectedHrOk && empOk && actOk && qOk;
    });
  }, [actionType, employeeCode, hrCode, query, selectedHrId, state.logs]);

  const exportCsv = () => {
    const headers = ["at", "type", "message", "performedBy", "employeeCode", "hallId", "hallName", "overrideReason"];
    const csv = [headers, ...rows.map((r) => headers.map((h) => r[h] ?? ""))]
      .map((line) => line.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "hr-logs.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyRow = async (r) => {
    const t = `${r.at || ""} | ${r.type || ""} | ${r.message || ""} | ${r.performedBy || ""} | ${r.employeeCode || ""} | ${r.hallName || r.hallId || ""}`;
    try {
      await navigator.clipboard.writeText(t);
    } catch {}
  };

  const deleteLog = async (id) => {
    const ok = window.confirm("Delete this log entry?");
    if (!ok) return;
    setLoading(true);
    try {
      const res = await hrApi.deleteLog?.(id);
      if (res?.success || res?.ok) {
        setState((prev) => ({ ...prev, logs: (prev.logs || []).filter((x) => String(x.id) !== String(id)) }));
        if (String(selectedRow) === String(id)) setSelectedRow(null);
      } else if (res?.error) {
        setError(res.error);
      }
    } catch (err) {
      console.error("deleteLog failed:", err);
      setError("Log delete nahi hua.");
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setQuery("");
    setHrCode("");
    setEmployeeCode("");
    setActionType("");
    setSelectedHrId("");
  };

  return (
    <div className="overflow-hidden border border-slate-200 bg-white shadow-xl">
      <div className="border-b border-slate-200 bg-white px-5 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">HR Action Logs</h2>
            <p className="mt-1 text-sm text-slate-500">HR ID-wise actions, employee-wise filters, and audit tracking.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary" type="button" onClick={clearFilters}>
              <FilterX className="mr-1 inline h-4 w-4" />
              Clear Filters
            </button>
            <button className="btn-secondary" type="button" onClick={() => setRefreshKey((k) => k + 1)}>
              <RefreshCw className="mr-1 inline h-4 w-4" />
              Refresh
            </button>
            <button className="btn-secondary" type="button" onClick={exportCsv}>
              <Download className="mr-1 inline h-4 w-4" />
              Export CSV
            </button>
          </div>
        </div>
        {error ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : null}
      </div>

      <div className="border-b border-slate-200 bg-slate-50 p-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
          <div className="relative lg:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input w-full pl-9"
              placeholder="Search logs (type, message, HR, employee, hall)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <select className="input" value={selectedHrId} onChange={(e) => setSelectedHrId(e.target.value)}>
            <option value="">All HR IDs</option>
            {hrIds.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>

          <input
            className="input"
            placeholder="HR code"
            value={hrCode}
            onChange={(e) => setHrCode(e.target.value)}
          />

          <input
            className="input"
            placeholder="Employee code"
            value={employeeCode}
            onChange={(e) => setEmployeeCode(e.target.value)}
          />

          <select
            className="input lg:col-span-2"
            value={actionType}
            onChange={(e) => setActionType(e.target.value)}
          >
            <option value="">All actions</option>
            <option value="SCAN">SCAN</option>
            <option value="HR_OVERRIDE">HR_OVERRIDE</option>
            <option value="HR_TRANSFER">HR_TRANSFER</option>
          </select>
        </div>
      </div>

      <div className="mt-4 max-h-[520px] overflow-auto">
        <table className="min-w-full">
          <thead>
            <tr>
              <th className="sticky top-0 bg-white px-3 py-3 text-sm font-semibold text-slate-700">Time</th>
              <th className="sticky top-0 bg-white px-3 py-3 text-sm font-semibold text-slate-700">Type</th>
              <th className="sticky top-0 bg-white px-3 py-3 text-sm font-semibold text-slate-700">Message</th>
              <th className="sticky top-0 bg-white px-3 py-3 text-sm font-semibold text-slate-700">HR ID</th>
              <th className="sticky top-0 bg-white px-3 py-3 text-sm font-semibold text-slate-700">Employee</th>
              <th className="sticky top-0 bg-white px-3 py-3 text-sm font-semibold text-slate-700">Hall</th>
              <th className="sticky top-0 bg-white px-3 py-3 text-sm font-semibold text-slate-700">Reason</th>
              <th className="sticky top-0 bg-white px-3 py-3 text-sm font-semibold text-slate-700">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" className="py-10 text-center text-sm text-slate-500">
                  <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                  Loading logs...
                </td>
              </tr>
            ) : rows.length ? (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className={String(selectedRow) === String(row.id) ? "bg-slate-100" : "border-b border-slate-200"}
                  onClick={() => setSelectedRow(row.id)}
                >
                  <td className="px-3 py-3 text-sm text-slate-700">
                    {row.at ? String(row.at).slice(0, 19).replace("T", " ") : "-"}
                  </td>
                  <td className="px-3 py-3 text-sm">
                    <span className="badge border border-slate-300 bg-white text-slate-700">
                      {row.type || "-"}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-sm text-slate-700">{row.message || "-"}</td>
                  <td className="px-3 py-3 text-sm font-medium text-slate-900">
                    {row.performedBy || (row.type === "SCAN" ? "SYSTEM" : "-")}
                  </td>
                  <td className="px-3 py-3 text-sm text-slate-700">{row.employeeCode || "-"}</td>
                  <td className="px-3 py-3 text-sm text-slate-700">{row.hallName || row.hallId || "-"}</td>
                  <td className="px-3 py-3 text-sm text-slate-500">{row.overrideReason || "-"}</td>
                  <td className="px-3 py-3 text-sm">
                    <div className="flex gap-2">
                      <button
                        className="border-2 border-slate-300 bg-white px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyRow(row);
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        className="border-2 border-slate-300 bg-white px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRow(row.id);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        className="border-2 border-[#E0222A] bg-[#E0222A]/10 px-3 py-2 font-semibold text-[#E0222A] hover:bg-[#E0222A]/20"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteLog(row.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className="py-10 text-center text-sm text-slate-500">
                  No HR logs found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}