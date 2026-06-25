import React, { useEffect, useMemo, useState } from "react";
import {
  FileUp,
  Plus,
  Search,
  Trash2,
  Edit3,
  Save,
  X,
  AlertCircle,
  Copy,
  Filter,
  HelpCircle,
} from "lucide-react";
import { useHR } from "../context/HRContext";
import hrApi from "../api/hrApi";

const normalizeRow = (row, fallbackHall = null) => ({
  id: row.id ?? row.code ?? Date.now(),
  week_key: row.week_key ?? row.weekKey ?? "",
  week_start: row.week_start ?? row.weekStart ?? "",
  week_end: row.week_end ?? row.weekEnd ?? "",
  name: row.name ?? "",
  code: String(row.code ?? "").trim(),
  designation: row.designation ?? "",
  weekOff: row.weekOff ?? row.week_off ?? "Sunday",
  shift: row.shift ?? "A",
  hallId: row.hallId ?? row.hall_id ?? fallbackHall?.id ?? "",
  hallName: row.hallName ?? row.hall_name ?? fallbackHall?.name ?? "",
});

const pad2 = (n) => String(n).padStart(2, "0");
const formatDate = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const getIsoWeekInfo = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() + 4 - day);
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  const weekKey = `${d.getFullYear()}-W${pad2(weekNo)}`;
  const start = new Date(d);
  start.setDate(d.getDate() - 3);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { weekKey, weekStart: formatDate(start), weekEnd: formatDate(end) };
};

const parseCsvLine = (line) => {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const next = line[i + 1];
    if (ch === '"' && inQuotes && next === '"') {
      cur += '"';
      i++;
    } else if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur.trim());
  return out;
};

function Field({ label, className = "", ...props }) {
  return (
    <div className="space-y-1 min-w-0">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </div>
      <input
        {...props}
        className={`h-9 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#E0222A] ${className}`}
      />
    </div>
  );
}

function SelectField({ label, children, className = "", ...props }) {
  return (
    <div className="space-y-1 min-w-0">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </div>
      <select
        {...props}
        className={`h-9 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#E0222A] ${className}`}
      >
        {children}
      </select>
    </div>
  );
}

export default function RosterManager() {
  const { state, setState } = useHR();
  const weekInfo = useMemo(() => getIsoWeekInfo(), []);

  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [weekKey, setWeekKey] = useState(weekInfo.weekKey);
  const [sourceWeekKey, setSourceWeekKey] = useState("");
  const [form, setForm] = useState({
    weekKey: weekInfo.weekKey,
    weekStart: weekInfo.weekStart,
    weekEnd: weekInfo.weekEnd,
    name: "",
    code: "",
    designation: "",
    weekOff: "Sunday",
    shift: "A",
    hallId: "",
    hallName: "",
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [filters, setFilters] = useState({
    hallId: "",
    shift: "",
    weekOff: "",
    designation: "",
  });

  const rosterRows = state.roster || [];
  const halls = state.halls || [];

  useEffect(() => {
    if (!form.hallId && halls.length) {
      setForm((p) => ({
        ...p,
        hallId: String(halls[0].id),
        hallName: halls[0].name || "",
      }));
    }
  }, [form.hallId, halls]);

  useEffect(() => {
    const info = getIsoWeekInfo();
    setWeekKey(info.weekKey);
    setForm((p) => ({
      ...p,
      weekKey: info.weekKey,
      weekStart: info.weekStart,
      weekEnd: info.weekEnd,
    }));
  }, []);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rosterRows.filter((e) => {
      const matchesSearch =
        !q ||
        `${e.name || ""} ${e.code || ""} ${e.designation || ""} ${e.hallName || ""} ${e.shift || ""} ${e.weekOff || ""}`
          .toLowerCase()
          .includes(q);

      const matchesHall = !filters.hallId || String(e.hallId || "") === String(filters.hallId);
      const matchesShift = !filters.shift || String(e.shift || "") === String(filters.shift);
      const matchesWeekOff =
        !filters.weekOff ||
        String(e.weekOff || "").toLowerCase() === String(filters.weekOff).toLowerCase();
      const matchesDesignation =
        !filters.designation ||
        String(e.designation || "").toLowerCase().includes(String(filters.designation).toLowerCase());

      return matchesSearch && matchesHall && matchesShift && matchesWeekOff && matchesDesignation;
    });
  }, [query, rosterRows, filters]);

  const clearForm = () => {
    const info = getIsoWeekInfo();
    setEditingId(null);
    setForm({
      weekKey: info.weekKey,
      weekStart: info.weekStart,
      weekEnd: info.weekEnd,
      name: "",
      code: "",
      designation: "",
      weekOff: "Sunday",
      shift: "A",
      hallId: String(halls[0]?.id || ""),
      hallName: halls[0]?.name || "",
    });
  };

  const refreshRoster = async (wk = weekKey) => {
    setLoading(true);
    try {
      const res = await hrApi.getRoster(wk);
      if (res.success) {
        const list = Array.isArray(res.data) ? res.data.map((r) => normalizeRow(r)) : [];
        setState((prev) => ({ ...prev, roster: list }));
      } else {
        setMessage(res.error || "Roster load failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshRoster(weekKey);
  }, [weekKey]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const visibleIds = rows.map((r) => r.id);
    const allSelected =
      visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));

    setSelectedIds((prev) =>
      allSelected
        ? prev.filter((id) => !visibleIds.includes(id))
        : Array.from(new Set([...prev, ...visibleIds]))
    );
  };

  const deleteSelectedEmployees = async () => {
    const targetIds = selectedIds.length ? selectedIds : rows.map((r) => r.id);
    if (!targetIds.length) {
      setMessage("No roster rows to delete.");
      return;
    }

    const ok = window.confirm(`⚠️ WARNING: ${targetIds.length} roster rows delete ho jayenge! Continue?`);
    if (!ok) return;

    setLoading(true);
    try {
      const results = await Promise.allSettled(targetIds.map((id) => hrApi.deleteRosterRow(id)));
      const successCount = results.filter((r) => r.status === "fulfilled" && r.value?.success).length;

      setState((prev) => ({
        ...prev,
        roster: prev.roster.filter((e) => !targetIds.includes(e.id)),
      }));

      setSelectedIds([]);
      setEditingId(null);
      clearForm();

      setMessage(
        successCount === targetIds.length
          ? `✅ ${successCount} roster rows deleted successfully!`
          : `⚠️ ${successCount} of ${targetIds.length} rows deleted.`
      );
    } catch (error) {
      setMessage("❌ Failed to delete roster rows: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const upsertEmp = async () => {
    if (!form.name.trim() || !form.code.trim()) {
      setMessage("Name aur code required hai.");
      return;
    }

    setLoading(true);
    const hall = halls.find((h) => String(h.id) === String(form.hallId)) || null;

    const rosterData = {
      week_key: form.weekKey || weekKey,
      week_start: form.weekStart || "",
      week_end: form.weekEnd || "",
      code: form.code.trim(),
      name: form.name.trim(),
      designation: form.designation.trim(),
      week_off: form.weekOff,
      shift: form.shift,
      hall_id: hall?.id || form.hallId || "",
      hall_name: hall?.name || form.hallName || "",
    };

    try {
      const response = editingId
        ? await hrApi.updateRosterRow(editingId, rosterData)
        : await hrApi.addRosterRow(rosterData);

      if (response.success) {
        const returned = normalizeRow(response.data || {}, hall);

        setState((prev) => {
          const nextRoster = editingId
            ? prev.roster.map((e) => (String(e.id) === String(editingId) ? returned : e))
            : [returned, ...prev.roster.filter((e) => String(e.code) !== String(returned.code))];
          return { ...prev, roster: nextRoster };
        });

        setMessage(editingId ? "Roster updated successfully!" : "Roster row added successfully!");
        setEditingId(null);
        clearForm();
      } else {
        setMessage("Error: " + (response.error || "Save failed"));
      }
    } catch (error) {
      setMessage("Failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (row) => {
    const wk = row.week_key || weekKey;
    setEditingId(row.id);
    setWeekKey(wk);
    setForm({
      weekKey: wk,
      weekStart: row.week_start || "",
      weekEnd: row.week_end || "",
      name: row.name || "",
      code: row.code || "",
      designation: row.designation || "",
      weekOff: row.weekOff || "Sunday",
      shift: row.shift || "A",
      hallId: row.hallId || "",
      hallName: row.hallName || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const removeRow = async (id) => {
    const ok = window.confirm("Is roster row ko delete karna hai?");
    if (!ok) return;

    setLoading(true);
    try {
      const response = await hrApi.deleteRosterRow(id);
      if (response.success) {
        setState((prev) => ({
          ...prev,
          roster: prev.roster.filter((e) => String(e.id) !== String(id)),
        }));
        setSelectedIds((prev) => prev.filter((x) => String(x) !== String(id)));
        setMessage("Roster row deleted!");
      } else {
        setMessage("Delete Error: " + (response.error || "Failed"));
      }
    } catch (error) {
      setMessage("Failed to delete: " + error.message);
    } finally {
      setLoading(false);
    }

    if (String(editingId) === String(id)) {
      setEditingId(null);
      clearForm();
    }
  };

  const headers = ["week_key", "week_start", "week_end", "name", "code", "designation", "weekOff", "shift", "hallName"];

  const resetFilters = () => setFilters({ hallId: "", shift: "", weekOff: "", designation: "" });

  return (
    <div className="overflow-hidden border-2 border-slate-300 bg-white shadow-xl">
      <div className="border-b border-slate-300 bg-[#23205C] px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">Roster Manager</h2>
            <p className="mt-0.5 text-xs text-white/70">Weekly roster master</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-3 py-2 text-sm font-semibold text-white md:hidden"
              onClick={() => setIsFilterOpen(true)}
            >
              <Filter className="h-4 w-4" />
              Filters
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-3 py-2 text-sm font-semibold text-white"
              onClick={() => setIsHelpOpen(true)}
            >
              <HelpCircle className="h-4 w-4" />
              Help
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-0 md:grid-cols-[270px_1fr]">
        <aside className="hidden border-r border-slate-300 p-3 md:block">
          <div className="space-y-3">
            <Field
              label="Week Key"
              value={form.weekKey}
              onChange={(e) => {
                const value = e.target.value;
                setForm((p) => ({ ...p, weekKey: value }));
                setWeekKey(value);
              }}
              placeholder="2026-W26"
            />
            <Field label="Week Start" value={form.weekStart} onChange={(e) => setForm((p) => ({ ...p, weekStart: e.target.value }))} />
            <Field label="Week End" value={form.weekEnd} onChange={(e) => setForm((p) => ({ ...p, weekEnd: e.target.value }))} />
            <Field label="Copy From" placeholder="2026-W25" value={sourceWeekKey} onChange={(e) => setSourceWeekKey(e.target.value)} />
            <Field label="Search" placeholder="Search roster" value={query} onChange={(e) => setQuery(e.target.value)} />
            <button
              type="button"
              className="h-9 w-full rounded-xl bg-[#23205C] px-3 text-sm font-semibold text-white"
              onClick={() => hrApi.importRosterFromWeek({ week_key: weekKey, source_week_key: sourceWeekKey.trim() })}
            >
              <Copy className="mr-1 inline h-4 w-4" />
              Copy
            </button>
            <label className="flex h-9 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700">
              <FileUp className="h-4 w-4" />
              Import CSV
              <input type="file" accept=".csv,text/csv" className="hidden" />
            </label>
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-600 break-words">
              <div className="flex items-center gap-2 font-semibold text-slate-800">
                <HelpCircle className="h-4 w-4" />
                CSV Headers
              </div>
              <code className="mt-2 block rounded bg-white px-2 py-1 text-[11px] whitespace-normal break-words">
                {headers.join(",")}
              </code>
            </div>
          </div>
        </aside>

        <main className="p-3 md:p-4 min-w-0">
          <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            <Field label="Code" value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} />
            <Field label="Designation" value={form.designation} onChange={(e) => setForm((p) => ({ ...p, designation: e.target.value }))} />
            <SelectField label="Shift" value={form.shift} onChange={(e) => setForm((p) => ({ ...p, shift: e.target.value }))}>
              {["A", "B", "C", "AA", "BB", "G"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </SelectField>

            <SelectField
              label="Week Off"
              value={form.weekOff}
              onChange={(e) => setForm((p) => ({ ...p, weekOff: e.target.value }))}
            >
              {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </SelectField>

            <SelectField
              label="Hall"
              value={form.hallId}
              onChange={(e) => {
                const hall = halls.find((h) => String(h.id) === String(e.target.value));
                setForm((p) => ({
                  ...p,
                  hallId: e.target.value,
                  hallName: hall?.name || "",
                }));
              }}
            >
              <option value="">Select Hall</option>
              {halls.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} ({h.capacity})
                </option>
              ))}
            </SelectField>

            <Field label="Week Key" value={form.weekKey} onChange={(e) => {
              const value = e.target.value;
              setForm((p) => ({ ...p, weekKey: value }));
              setWeekKey(value);
            }} />
            <Field label="Week Start" value={form.weekStart} onChange={(e) => setForm((p) => ({ ...p, weekStart: e.target.value }))} />
            <Field label="Week End" value={form.weekEnd} onChange={(e) => setForm((p) => ({ ...p, weekEnd: e.target.value }))} />

            <div className="flex items-end gap-2 xl:col-span-4">
              <button
                className="h-9 flex-1 rounded-xl bg-[#E0222A] px-3 text-sm font-semibold text-white disabled:opacity-50"
                type="button"
                onClick={upsertEmp}
                disabled={loading}
              >
                {editingId ? <Save className="mr-1 inline h-4 w-4" /> : <Plus className="mr-1 inline h-4 w-4" />}
                {editingId ? "Update Row" : "Add Row"}
              </button>
              <button
                className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700"
                type="button"
                onClick={clearForm}
              >
                <X className="mr-1 inline h-4 w-4" />
                Reset
              </button>
              <button
                className="h-9 rounded-xl border border-[#E0222A] bg-[#E0222A]/10 px-3 text-sm font-semibold text-[#E0222A]"
                type="button"
                onClick={deleteSelectedEmployees}
                disabled={loading}
              >
                <Trash2 className="mr-1 inline h-4 w-4" />
                Delete Selected
              </button>
            </div>
          </div>

          {message && (
            <div className="mb-3 flex items-center gap-2 rounded-xl border border-[#E0222A] bg-[#E0222A]/10 px-3 py-2 text-sm text-[#E0222A]">
              <AlertCircle className="h-4 w-4" />
              {message}
            </div>
          )}

          {loading && (
            <div className="mb-3 flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              <AlertCircle className="h-4 w-4" />
              Processing...
            </div>
          )}

          <div className="mb-2 flex items-center gap-2">
            <input
              type="checkbox"
              checked={rows.length > 0 && rows.every((r) => selectedIds.includes(r.id))}
              onChange={toggleSelectAll}
            />
            <span className="text-sm text-slate-700">Select all visible</span>
          </div>

          <div className="overflow-hidden border border-slate-300">
            <div className="max-h-[560px] overflow-auto">
              <table className="min-w-[980px] md:min-w-full table-auto">
                <thead>
                  <tr>
                    <th className="sticky top-0 border-b border-slate-300 bg-white px-2 py-2 text-xs font-semibold text-slate-700">Sel</th>
                    <th className="sticky top-0 border-b border-slate-300 bg-white px-2 py-2 text-xs font-semibold text-slate-700">Week Key</th>
                    <th className="sticky top-0 border-b border-slate-300 bg-white px-2 py-2 text-xs font-semibold text-slate-700">Start</th>
                    <th className="sticky top-0 border-b border-slate-300 bg-white px-2 py-2 text-xs font-semibold text-slate-700">End</th>
                    <th className="sticky top-0 border-b border-slate-300 bg-white px-2 py-2 text-xs font-semibold text-slate-700">Name</th>
                    <th className="sticky top-0 border-b border-slate-300 bg-white px-2 py-2 text-xs font-semibold text-slate-700">Code</th>
                    <th className="sticky top-0 border-b border-slate-300 bg-white px-2 py-2 text-xs font-semibold text-slate-700">Designation</th>
                    <th className="sticky top-0 border-b border-slate-300 bg-white px-2 py-2 text-xs font-semibold text-slate-700">Hall</th>
                    <th className="sticky top-0 border-b border-slate-300 bg-white px-2 py-2 text-xs font-semibold text-slate-700">Shift</th>
                    <th className="sticky top-0 border-b border-slate-300 bg-white px-2 py-2 text-xs font-semibold text-slate-700">Week Off</th>
                    <th className="sticky top-0 border-b border-slate-300 bg-white px-2 py-2 text-xs font-semibold text-slate-700">Act</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length ? (
                    rows.map((r) => (
                      <tr key={`${r.id}-${r.code}`} className="border-b border-slate-200">
                        <td className="px-2 py-2 text-sm">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(r.id)}
                            onChange={() => toggleSelect(r.id)}
                          />
                        </td>
                        <td className="px-2 py-2 text-xs text-slate-700">{r.week_key || "-"}</td>
                        <td className="px-2 py-2 text-xs text-slate-700">{r.week_start || "-"}</td>
                        <td className="px-2 py-2 text-xs text-slate-700">{r.week_end || "-"}</td>
                        <td className="px-2 py-2 text-xs font-bold text-slate-900">{r.name || "-"}</td>
                        <td className="px-2 py-2 text-xs text-slate-700">{r.code || "-"}</td>
                        <td className="px-2 py-2 text-xs text-slate-700">{r.designation || "-"}</td>
                        <td className="px-2 py-2 text-xs text-slate-700">{r.hallName || "-"}</td>
                        <td className="px-2 py-2 text-xs text-slate-700">{r.shift || "-"}</td>
                        <td className="px-2 py-2 text-xs text-slate-700">{r.weekOff || "-"}</td>
                        <td className="px-2 py-2 text-xs">
                          <div className="flex gap-2">
                            <button
                              className="rounded-lg border border-slate-300 bg-white p-2 text-slate-700"
                              type="button"
                              onClick={() => startEdit(r)}
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              className="rounded-lg border border-[#E0222A] bg-[#E0222A]/10 p-2 text-[#E0222A]"
                              type="button"
                              onClick={() => removeRow(r.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="11" className="py-12 text-center text-sm text-slate-500">
                        No roster records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}