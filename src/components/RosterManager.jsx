import React, { useEffect, useMemo, useState } from "react";
import {
  Download,
  FileUp,
  Plus,
  Search,
  Trash2,
  Edit3,
  Save,
  FileSpreadsheet,
  X,
  AlertCircle,
  Building2,
  Users,
  Trash,
  CalendarDays,
  Copy,
  Filter,
} from "lucide-react";
import { useHR } from "../context/HRContext";
import hrApi from "../api/hrApi";

const normalizeRow = (row, fallbackHall = null) => ({
  id: row.id || row.code || Date.now(),
  week_key: row.week_key || "",
  week_start: row.week_start || "",
  week_end: row.week_end || "",
  name: row.name || "",
  code: String(row.code || "").trim(),
  designation: row.designation || "",
  weekOff: row.weekOff || row.week_off || "Sunday",
  shift: row.shift || "A",
  hallId: row.hallId || row.hall_id || fallbackHall?.id || "",
  hallName: row.hallName || row.hall_name || fallbackHall?.name || "",
});

const getCurrentWeekKey = () => {
  const d = new Date();
  const target = new Date(d);
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(d.getDate() - dayNr + 3);
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const diff =
    target - firstThursday + (firstThursday.getDay() + 6) % 7 * 86400000;
  const week = 1 + Math.round(diff / 604800000);
  return `${target.getFullYear()}-W${String(week).padStart(2, "0")}`;
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

export default function RosterManager() {
  const { state, setState } = useHR();
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [weekKey, setWeekKey] = useState(getCurrentWeekKey());
  const [sourceWeekKey, setSourceWeekKey] = useState("");
  const [form, setForm] = useState({
    name: "",
    code: "",
    designation: "",
    weekOff: "Sunday",
    shift: "A",
    hallId: "",
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const rosterRows = state.roster || [];

  useEffect(() => {
    if (!form.hallId && state.halls?.length) {
      setForm((p) => ({ ...p, hallId: String(state.halls[0].id) }));
    }
  }, [form.hallId, state.halls]);

  useEffect(() => {
    setWeekKey(getCurrentWeekKey());
  }, []);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rosterRows.filter((e) => {
      if (!q) return true;
      return `${e.name || ""} ${e.code || ""} ${e.designation || ""} ${
        e.hallName || ""
      } ${e.shift || ""} ${e.weekOff || ""}`
        .toLowerCase()
        .includes(q);
    });
  }, [query, rosterRows]);

  const clearForm = () => {
    setEditingId(null);
    setForm({
      name: "",
      code: "",
      designation: "",
      weekOff: "Sunday",
      shift: "A",
      hallId: String(state.halls?.[0]?.id || ""),
    });
  };

  const refreshRoster = async (wk = weekKey) => {
    setLoading(true);
    try {
      const res = await hrApi.getRoster(wk);
      if (res.success) {
        const list = Array.isArray(res.data)
          ? res.data.map((r) => normalizeRow(r))
          : [];
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

    const ok = window.confirm(
      `⚠️ WARNING: ${targetIds.length} roster rows delete ho jayenge! Continue?`
    );
    if (!ok) return;

    setLoading(true);
    try {
      const results = await Promise.allSettled(
        targetIds.map((id) => hrApi.deleteRosterRow(id))
      );
      const successCount = results.filter(
        (r) => r.status === "fulfilled" && r.value?.success
      ).length;

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
    const hall =
      state.halls.find((h) => String(h.id) === String(form.hallId)) || null;

    const rosterData = {
      week_key: weekKey,
      code: form.code.trim(),
      name: form.name.trim(),
      designation: form.designation.trim(),
      week_off: form.weekOff,
      shift: form.shift,
      hall_id: hall?.id || form.hallId || "",
      hall_name: hall?.name || "",
    };

    try {
      const response = editingId
        ? await hrApi.updateRosterRow(editingId, rosterData)
        : await hrApi.addRosterRow(rosterData);

      if (response.success) {
        const returned = normalizeRow(response.data || {}, hall);

        setState((prev) => {
          const nextRoster = editingId
            ? prev.roster.map((e) =>
                String(e.id) === String(editingId) ? returned : e
              )
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
    setEditingId(row.id);
    setForm({
      name: row.name || "",
      code: row.code || "",
      designation: row.designation || "",
      weekOff: row.weekOff || "Sunday",
      shift: row.shift || "A",
      hallId: row.hallId || "",
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

  const headers = ["id", "name", "code", "designation", "weekOff", "shift", "hallId", "hallName"];

  const toCsv = (data) =>
    [headers, ...data.map((r) => headers.map((h) => r[h] ?? ""))]
      .map((line) => line.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(","))
      .join("\n");

  const exportCsv = () => {
    const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `roster-${weekKey}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportExcel = () => {
    const html = `
      <html><head><meta charset="utf-8" /></head><body>
      <table border="1">
        <tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr>
        ${rows
          .map(
            (r) =>
              `<tr>${headers
                .map((h) => `<td>${String(r[h] ?? "").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</td>`)
                .join("")}</tr>`
          )
          .join("")}
      </table>
      </body></html>
    `;
    const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `roster-${weekKey}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importCsv = async (file) => {
    const reader = new FileReader();

    reader.onload = async () => {
      try {
        const text = String(reader.result || "").replace(/\uFEFF/g, "");
        const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
        if (lines.length < 2) {
          setMessage("CSV me data nahi mila.");
          return;
        }

        const headers = parseCsvLine(lines[0]).map((s) => s.replaceAll('"', "").trim());
        const headersNorm = headers.map((h) => h.trim().toLowerCase());

        const findCol = (...names) => headersNorm.findIndex((h) => names.includes(h));

        const idxWeekKey = findCol("week_key", "weekkey");
        const idxWeekStart = findCol("week_start", "weekstart");
        const idxWeekEnd = findCol("week_end", "weekend");
        const idxName = findCol("name", "operator name");
        const idxCode = findCol("code");
        const idxDesignation = findCol("designation");
        const idxWeekOff = findCol("weekoff", "week_off", "weakoff");
        const idxShift = findCol("shift");
        const idxHallName = findCol("hallname", "hall_name", "hall");

        const normalizeText = (val) => String(val || "").trim().toLowerCase().replace(/\s+/g, " ");
        const hallsLookup = (state.halls || []).map((h) => ({
          ...h,
          _normName: normalizeText(h.name),
          _normId: normalizeText(h.id),
        }));

        const findHall = (rawHallName) => {
          const key = normalizeText(rawHallName);
          return (
            hallsLookup.find((h) => h._normName === key) ||
            hallsLookup.find((h) => h._normId === key) ||
            hallsLookup.find((h) => h._normName.includes(key) || key.includes(h._normName)) ||
            null
          );
        };

        const rosterToImport = [];
        const newHallsToAdd = [];
        let firstWeekKey = weekKey;
        let firstWeekStart = "";
        let firstWeekEnd = "";

        for (const line of lines.slice(1)) {
          const cols = parseCsvLine(line);
          if (!cols.length) continue;

          const get = (idx) => (idx >= 0 ? String(cols[idx] ?? "").trim() : "");

          const rowWeekKey = get(idxWeekKey) || weekKey;
          const rowWeekStart = get(idxWeekStart);
          const rowWeekEnd = get(idxWeekEnd);
          const name = get(idxName);
          const code = get(idxCode);
          const designation = get(idxDesignation);
          const weekOff = get(idxWeekOff) || "Sunday";
          const shift = get(idxShift) || "A";
          const hallNameRaw = get(idxHallName);

          if (!firstWeekStart && rowWeekStart) firstWeekStart = rowWeekStart;
          if (!firstWeekEnd && rowWeekEnd) firstWeekEnd = rowWeekEnd;
          if (rowWeekKey && firstWeekKey === weekKey) firstWeekKey = rowWeekKey;

          let hall = findHall(hallNameRaw);

          if (!hall) {
            const hallName =
              String(hallNameRaw || "").trim() ||
              `Hall ${state.halls.length + newHallsToAdd.length + 1}`;
            const tempId = `temp-${hallName.toLowerCase().replace(/\s+/g, "-")}`;
            hall = { id: tempId, name: hallName, capacity: 50, color: "blue" };

            const alreadyQueued = newHallsToAdd.some(
              (h) => normalizeText(h.name) === normalizeText(hall.name)
            );
            if (!alreadyQueued) newHallsToAdd.push(hall);
          }

          if (!name || !code) continue;

          rosterToImport.push({
            code,
            name,
            designation,
            week_off: weekOff,
            shift,
            hall_id: hall.id,
            hall_name: hall.name,
          });
        }

        if (!rosterToImport.length) {
          setMessage("CSV me valid roster rows nahi mile.");
          return;
        }

        setLoading(true);

        const currentHalls = [...(state.halls || [])];
        for (const hall of newHallsToAdd) {
          try {
            const res = await hrApi.addHall({
              name: hall.name,
              capacity: hall.capacity,
              color: hall.color,
            });
            if (res.success && res.data) currentHalls.push(res.data);
            else currentHalls.push(hall);
          } catch {
            currentHalls.push(hall);
          }
        }

        setState((prev) => ({
          ...prev,
          halls: currentHalls,
        }));

        const response = await hrApi.bulkImportRoster({
          week_key: firstWeekKey || weekKey,
          week_start: firstWeekStart || undefined,
          week_end: firstWeekEnd || undefined,
          employees: rosterToImport,
        });

        if (response.success) {
          setMessage(
            `✅ ${response.data?.imported || rosterToImport.length} roster rows imported for ${firstWeekKey || weekKey}!`
          );
          await refreshRoster(firstWeekKey || weekKey);
        } else {
          setMessage("CSV import failed: " + (response.error || "Failed"));
        }
      } catch (error) {
        setMessage("CSV import failed: " + error.message);
      } finally {
        setLoading(false);
      }
    };

    reader.readAsText(file);
  };

  const importPreviousWeek = async () => {
    if (!sourceWeekKey.trim()) {
      setMessage("Source week key required hai.");
      return;
    }

    setLoading(true);
    try {
      const response = await hrApi.importRosterFromWeek({
        week_key: weekKey,
        source_week_key: sourceWeekKey.trim(),
      });

      if (response.success) {
        setMessage(`✅ ${sourceWeekKey} se ${weekKey} me roster copied.`);
        await refreshRoster(weekKey);
      } else {
        setMessage("Import failed: " + (response.error || "Failed"));
      }
    } catch (error) {
      setMessage("Import failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const byHall = new Map();
    rows.forEach((e) => {
      const key = String(e.hallId || "");
      byHall.set(key, (byHall.get(key) || 0) + 1);
    });
    return { total: rows.length, hallsUsed: byHall.size };
  }, [rows]);

  const FilterPanel = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <CalendarDays className="h-4 w-4 text-slate-700" />
        <input
          className="w-full border-2 border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-[#E0222A]"
          value={weekKey}
          onChange={(e) => setWeekKey(e.target.value)}
          placeholder="2026-W26"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          className="w-full border-2 border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-[#E0222A]"
          placeholder="Copy from week (e.g. 2026-W25)"
          value={sourceWeekKey}
          onChange={(e) => setSourceWeekKey(e.target.value)}
        />
        <button
          type="button"
          className="border-2 border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700"
          onClick={importPreviousWeek}
          disabled={loading}
        >
          <Copy className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="border-2 border-slate-300 bg-white p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <Users className="h-4 w-4" />
            Total Rows
          </div>
          <div className="mt-2 text-xl font-bold text-slate-900">{stats.total}</div>
        </div>
        <div className="border-2 border-slate-300 bg-white p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <Building2 className="h-4 w-4" />
            Halls Used
          </div>
          <div className="mt-2 text-xl font-bold text-slate-900">{stats.hallsUsed}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button className="border-2 border-white/30 bg-[#23205C] px-4 py-2 text-sm font-semibold text-white hover:bg-[#23205C]/90" type="button" onClick={exportCsv}>
          <Download className="mr-1 inline h-4 w-4" />
          Export CSV
        </button>
        <button className="border-2 border-white/30 bg-[#23205C] px-4 py-2 text-sm font-semibold text-white hover:bg-[#23205C]/90" type="button" onClick={exportExcel}>
          <FileSpreadsheet className="mr-1 inline h-4 w-4" />
          Export Excel
        </button>
        <button className="border-2 border-[#E0222A] bg-[#E0222A] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" type="button" onClick={deleteSelectedEmployees} disabled={loading || (!selectedIds.length && !rows.length)}>
          <Trash className="mr-1 inline h-4 w-4" />
          Delete
        </button>
      </div>

      <label className="cursor-pointer inline-flex w-full items-center justify-center gap-2 border-2 border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700">
        <FileUp className="h-4 w-4" />
        Import CSV
        <input
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && importCsv(e.target.files[0])}
        />
      </label>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          className="w-full border-2 border-slate-300 bg-white px-4 py-3 pl-9 text-slate-900 outline-none focus:border-[#E0222A]"
          placeholder="Search roster"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
    </div>
  );

  return (
    <div className="overflow-hidden border-2 border-slate-300 bg-white shadow-xl">
      <div className="border-b border-slate-300 bg-[#23205C] px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-white">Roster Manager</h2>
            <p className="mt-1 text-sm text-white/70">Weekly roster master</p>
          </div>

          <button
            type="button"
            className="inline-flex items-center gap-2 border-2 border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white md:hidden"
            onClick={() => setIsFilterOpen(true)}
          >
            <Filter className="h-4 w-4" />
            Filters
          </button>

          <div className="hidden flex-wrap gap-2 md:flex">
            <button className="border-2 border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20" type="button" onClick={exportCsv}>
              <Download className="mr-1 inline h-4 w-4" />
              Export CSV
            </button>
            <button className="border-2 border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20" type="button" onClick={exportExcel}>
              <FileSpreadsheet className="mr-1 inline h-4 w-4" />
              Export Excel
            </button>
            <button className="border-2 border-[#E0222A] bg-[#E0222A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#E0222A]/90 disabled:opacity-50" type="button" onClick={deleteSelectedEmployees} disabled={loading || (!selectedIds.length && !rows.length)}>
              <Trash className="mr-1 inline h-4 w-4" />
              Delete Selected / All
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-0 md:grid-cols-[320px_1fr]">
        <div className="hidden border-r border-slate-300 p-4 md:block">
          <FilterPanel />
        </div>

        <div className="p-4 md:p-5">
          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-6">
            <input
              className="border-2 border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-[#E0222A] md:col-span-2"
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
            <input
              className="border-2 border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-[#E0222A] md:col-span-2"
              placeholder="Code"
              value={form.code}
              onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
            />
            <input
              className="border-2 border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-[#E0222A] md:col-span-2"
              placeholder="Designation"
              value={form.designation}
              onChange={(e) => setForm((p) => ({ ...p, designation: e.target.value }))}
            />
            <select
              className="border-2 border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-[#E0222A]"
              value={form.shift}
              onChange={(e) => setForm((p) => ({ ...p, shift: e.target.value }))}
            >
              {["A", "B", "C", "AA", "BB", "G"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              className="border-2 border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-[#E0222A]"
              value={form.weekOff}
              onChange={(e) => setForm((p) => ({ ...p, weekOff: e.target.value }))}
            >
              {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <select
              className="border-2 border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-[#E0222A] md:col-span-2"
              value={form.hallId}
              onChange={(e) => setForm((p) => ({ ...p, hallId: e.target.value }))}
            >
              {state.halls.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} ({h.capacity})
                </option>
              ))}
            </select>
            <button
              className="bg-[#E0222A] px-4 py-3 font-semibold text-white md:col-span-2 disabled:opacity-50"
              type="button"
              onClick={upsertEmp}
              disabled={loading}
            >
              {editingId ? <Save className="mr-1 inline h-4 w-4" /> : <Plus className="mr-1 inline h-4 w-4" />}
              {editingId ? "Update Row" : "Add Row"}
            </button>
            <button
              className="border-2 border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 md:col-span-2"
              type="button"
              onClick={clearForm}
            >
              <X className="mr-1 inline h-4 w-4" />
              Reset
            </button>
          </div>

          {message && (
            <div className="mb-5 flex items-center gap-2 border-2 border-[#E0222A] bg-[#E0222A]/10 px-4 py-3 text-sm text-[#E0222A]">
              <AlertCircle className="h-4 w-4" />
              {message}
            </div>
          )}

          {loading && (
            <div className="mb-5 flex items-center gap-2 border-2 border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <AlertCircle className="h-4 w-4" />
              Processing...
            </div>
          )}

          <div className="mb-3 flex items-center gap-2">
            <input
              type="checkbox"
              checked={rows.length > 0 && rows.every((r) => selectedIds.includes(r.id))}
              onChange={toggleSelectAll}
            />
            <span className="text-sm text-slate-700">Select all visible</span>
          </div>

          <div className="overflow-hidden border-2 border-slate-300">
            <div className="max-h-[560px] overflow-auto">
              <table className="min-w-[900px] md:min-w-full">
                <thead>
                  <tr>
                    <th className="sticky top-0 border-b-2 border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-700">Select</th>
                    <th className="sticky top-0 border-b-2 border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-700">Name</th>
                    <th className="sticky top-0 border-b-2 border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-700">Code</th>
                    <th className="sticky top-0 border-b-2 border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-700">Designation</th>
                    <th className="sticky top-0 border-b-2 border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-700">Hall</th>
                    <th className="sticky top-0 border-b-2 border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-700">Shift</th>
                    <th className="sticky top-0 border-b-2 border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-700">Week Off</th>
                    <th className="sticky top-0 border-b-2 border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length ? (
                    rows.map((r) => (
                      <tr key={`${r.id}-${r.code}`} className="border-b border-slate-200">
                        <td className="px-3 py-3 text-sm">
                          <input type="checkbox" checked={selectedIds.includes(r.id)} onChange={() => toggleSelect(r.id)} />
                        </td>
                        <td className="px-3 py-3 text-sm font-bold text-slate-900">{r.name}</td>
                        <td className="px-3 py-3 text-sm text-slate-700">{r.code}</td>
                        <td className="px-3 py-3 text-sm text-slate-700">{r.designation || "-"}</td>
                        <td className="px-3 py-3 text-sm">
                          <span className="border-2 border-slate-300 bg-white px-2 py-1 text-slate-700">{r.hallName}</span>
                        </td>
                        <td className="px-3 py-3 text-sm text-slate-700">{r.shift}</td>
                        <td className="px-3 py-3 text-sm text-slate-700">{r.weekOff}</td>
                        <td className="px-3 py-3 text-sm">
                          <div className="flex flex-wrap gap-2">
                            <button className="border-2 border-slate-300 bg-white px-3 py-2 font-semibold text-slate-700" type="button" onClick={() => startEdit(r)}>
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button className="border-2 border-[#E0222A] bg-[#E0222A]/10 px-3 py-2 font-semibold text-[#E0222A]" type="button" onClick={() => removeRow(r.id)}>
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="py-12 text-center text-sm text-slate-500">
                        No roster records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {isFilterOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsFilterOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-[88%] max-w-sm overflow-y-auto bg-white p-4 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Filters</h3>
              <button type="button" onClick={() => setIsFilterOpen(false)}>
                <X className="h-5 w-5 text-slate-700" />
              </button>
            </div>
            <FilterPanel />
          </div>
        </div>
      )}
    </div>
  );
}