import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Search, Loader2 } from "lucide-react";
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
  at: log?.at || log?.date || log?.createdAt || "",
  type: getLogValue(log, ["type"]) || "",
  message: getLogValue(log, ["message"]) || "",
  by: getLogValue(log, ["by", "hrCode", "hr_code"]) || "",
  employeeCode: getLogValue(log, ["employeeCode", "employee_code", "code"]) || "",
  hallId: getLogValue(log, ["hallId", "hall_id"]) || "",
  hallName: getLogValue(log, ["hallName", "hall_name"]) || "",
  overrideReason: getLogValue(log, ["overrideReason", "override_reason"]) || "",
});

const getLogsArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.logs)) return data.logs;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.rows)) return data.rows;
  return [];
};

export default function HRLogsPanel() {
  const { state, setState } = useHR();
  const [query, setQuery] = useState("");
  const [hrCode, setHrCode] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [actionType, setActionType] = useState("");
  const [selectedHrId, setSelectedHrId] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await hrApi.getLogs();
      const raw = res?.success ? getLogsArray(res.data ?? res) : [];
      const normalized = raw.map(normalizeLog);
      setState((prev) => ({
        ...prev,
        logs: normalized,
      }));
    } catch (err) {
      console.error("getLogs failed:", err);
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
      const id = log.by || getLogValue(log, ["by", "hrCode", "hr_code"]);
      if (id) ids.add(id);
    });
    return Array.from(ids).sort();
  }, [state.logs]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();

    return (state.logs || []).filter((log) => {
      const logHr = (log.by || getLogValue(log, ["by", "hrCode", "hr_code"])).trim();
      const logEmp = (log.employeeCode || getLogValue(log, ["employeeCode", "employee_code", "code"])).trim();
      const logType = (log.type || getLogValue(log, ["type"])).trim();
      const logMsg = (log.message || getLogValue(log, ["message"])).trim();
      const logHall = (log.hallName || getLogValue(log, ["hallName", "hall_name"])).trim();
      const logReason = (log.overrideReason || getLogValue(log, ["overrideReason", "override_reason"])).trim();
      const text = `${logType} ${logMsg} ${logHr} ${logEmp} ${logHall} ${logReason}`.toLowerCase();

      const hrOk = !hrCode || logHr.toUpperCase() === hrCode.trim().toUpperCase();
      const selectedHrOk = !selectedHrId || logHr.toUpperCase() === selectedHrId.trim().toUpperCase();
      const empOk = !employeeCode || logEmp.toUpperCase() === employeeCode.trim().toUpperCase();
      const actOk = !actionType || logType.toUpperCase() === actionType.trim().toUpperCase();
      const qOk = !q || text.includes(q);

      return hrOk && selectedHrOk && empOk && actOk && qOk;
    });
  }, [actionType, employeeCode, hrCode, query, selectedHrId, state.logs]);

  const exportCsv = () => {
    const headers = ["at", "type", "message", "by", "employeeCode", "hallId", "hallName", "overrideReason"];
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

  const clearFilters = () => {
    setQuery("");
    setHrCode("");
    setEmployeeCode("");
    setActionType("");
    setSelectedHrId("");
  };

  const refreshLogs = () => setRefreshKey((k) => k + 1);

  return (
    <div className="overflow-hidden border border-slate-200 bg-white shadow-xl">
      <div className="border-b border-slate-200 bg-white px-5 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">HR Action Logs</h2>
            <p className="mt-1 text-sm text-slate-500">
              HR ID-wise actions, employee-wise filters, and audit tracking.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary" type="button" onClick={clearFilters}>
              Clear Filters
            </button>
            <button className="btn-secondary" type="button" onClick={refreshLogs}>
              Refresh
            </button>
            <button className="btn-secondary" type="button" onClick={exportCsv}>
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        </div>
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

          <select
            className="input"
            value={selectedHrId}
            onChange={(e) => setSelectedHrId(e.target.value)}
          >
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

      <div className="max-h-[520px] overflow-auto">
        <table className="min-w-full">
          <thead>
            <tr>
              <th className="sticky top-0 bg-slate-50">Time</th>
              <th className="sticky top-0 bg-slate-50">Type</th>
              <th className="sticky top-0 bg-slate-50">Message</th>
              <th className="sticky top-0 bg-slate-50">HR ID</th>
              <th className="sticky top-0 bg-slate-50">Employee</th>
              <th className="sticky top-0 bg-slate-50">Hall</th>
              <th className="sticky top-0 bg-slate-50">Reason</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" className="py-10 text-center text-sm text-slate-500">
                  <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                  Loading logs...
                </td>
              </tr>
            ) : rows.length ? (
              rows.map((row) => (
                <tr key={row.id || `${row.at}-${row.by}-${row.employeeCode}`}>
                  <td>{row.at ? String(row.at).slice(0, 19).replace("T", " ") : "-"}</td>
                  <td>
                    <span className="badge border border-slate-300 bg-white text-slate-700">
                      {row.type || "-"}
                    </span>
                  </td>
                  <td>{row.message || "-"}</td>
                  <td className="font-medium text-slate-900">
                    {row.by || (row.type === "SCAN" ? "SYSTEM" : "-")}
                  </td>
                  <td>{row.employeeCode || "-"}</td>
                  <td>{row.hallName || "-"}</td>
                  <td>{row.overrideReason || "-"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="py-10 text-center text-sm text-slate-500">
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