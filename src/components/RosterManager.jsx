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
} from "lucide-react";
import { useHR } from "../context/HRContext";
import hrApi from "../api/hrApi";

const normalizeEmp = (emp, fallbackHall = null) => ({
  id: emp.id || emp.code || Date.now(),
  name: emp.name || "",
  code: String(emp.code || "").trim(),
  designation: emp.designation || "",
  weekOff: emp.weekOff || emp.week_off || "Sunday",
  shift: emp.shift || "A",
  hallId: emp.hallId || emp.hall_id || fallbackHall?.id || "",
  hallName: emp.hallName || emp.hall_name || fallbackHall?.name || "",
});

const safeLower = (v) => String(v || "").trim().toLowerCase();

export default function RosterManager() {
  const { state, setState, resetAll } = useHR();
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
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

  useEffect(() => {
    if (!form.hallId && state.halls?.length) {
      setForm((p) => ({ ...p, hallId: String(state.halls[0].id) }));
    }
  }, [form.hallId, state.halls]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.employees.filter((e) => {
      if (!q) return true;
      return `${e.name} ${e.code} ${e.designation} ${e.hallName} ${e.shift} ${e.weekOff}`
        .toLowerCase()
        .includes(q);
    });
  }, [query, state.employees]);

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

  const resetForm = () => {
    const ok = window.confirm("Saara local data reset ho jayega. Continue?");
    if (!ok) return;
    resetAll();
    setMessage("All local data cleared.");
    setEditingId(null);
    setSelectedIds([]);
    clearForm();
  };

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
      setMessage("No employees to delete.");
      return;
    }

    const ok = window.confirm(
      `⚠️ WARNING: ${targetIds.length} employees delete ho jayenge! Continue?`
    );
    if (!ok) return;

    setLoading(true);
    try {
      const results = await Promise.allSettled(
        targetIds.map((id) => hrApi.deleteEmployee(id))
      );

      const successCount = results.filter(
        (r) => r.status === "fulfilled" && r.value?.success
      ).length;

      setState((prev) => ({
        ...prev,
        employees: prev.employees.filter((e) => !targetIds.includes(e.id)),
      }));

      setSelectedIds([]);
      setEditingId(null);
      clearForm();

      setMessage(
        successCount === targetIds.length
          ? `✅ ${successCount} employees deleted successfully!`
          : `⚠️ ${successCount} of ${targetIds.length} employees deleted.`
      );
    } catch (error) {
      setMessage("❌ Failed to delete employees: " + error.message);
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
    const hall = state.halls.find((h) => String(h.id) === String(form.hallId)) || null;

    const employeeData = {
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
        ? await hrApi.updateEmployee(editingId, employeeData)
        : await hrApi.addEmployee(employeeData);

      if (response.success) {
        const returned = normalizeEmp(response.data || {}, hall);

        setState((prev) => {
          const nextEmployees = editingId
            ? prev.employees.map((e) => (String(e.id) === String(editingId) ? returned : e))
            : [returned, ...prev.employees.filter((e) => String(e.code) !== String(returned.code))];

          return {
            ...prev,
            employees: nextEmployees,
          };
        });

        setMessage(editingId ? "Employee updated successfully!" : "Employee added to database!");
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
    const ok = window.confirm("Is employee ko delete karna hai?");
    if (!ok) return;

    setLoading(true);
    try {
      const response = await hrApi.deleteEmployee(id);
      if (response.success) {
        setState((prev) => ({
          ...prev,
          employees: prev.employees.filter((e) => String(e.id) !== String(id)),
        }));
        setSelectedIds((prev) => prev.filter((x) => String(x) !== String(id)));
        setMessage("Employee deleted from database!");
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
    a.download = "roster.csv";
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
                .map(
                  (h) =>
                    `<td>${String(r[h] ?? "")
                      .replaceAll("<", "&lt;")
                      .replaceAll(">", "&gt;")}</td>`
                )
                .join("")}</tr>`
          )
          .join("")}
      </table>
      </body></html>
    `;
    const blob = new Blob([html], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "roster.xls";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importCsv = async (file) => {
    const reader = new FileReader();

    reader.onload = async () => {
      try {
        const text = String(reader.result || "").trim();
        if (!text) {
          setMessage("CSV file empty hai.");
          return;
        }

        const lines = text.split(/\r?\n/).filter(Boolean);
        if (lines.length < 2) {
          setMessage("CSV me data nahi mila.");
          return;
        }

        const headers = lines[0].split(",").map((s) => s.replaceAll('"', "").trim());
        const parseLine = (line) =>
          line.match(/("([^"]|"")*"|[^,]+)/g)?.map((v) => v.replace(/^"|"$/g, "").replaceAll('""', '"')) || [];

        const normalizeText = (val) =>
          String(val || "").trim().toLowerCase().replace(/\s+/g, " ");

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

        const employeesToImport = [];
        const newHallsToAdd = [];

        for (const line of lines.slice(1)) {
          const cols = parseLine(line);
          const obj = {};
          headers.forEach((h, i) => {
            obj[h] = cols[i] || "";
          });

          const name = obj.name || obj["Operator Name"] || "";
          const code = obj.code || obj["Code"] || "";
          const designation = obj.designation || obj["Designation"] || "";
          const weekOff = obj.weekOff || obj["weekOff"] || obj["WeakOff"] || "Sunday";
          const shift = obj.shift || obj["Shift"] || "A";
          const hallNameRaw = obj.hallName || obj.hall_name || obj["Hall"] || "";

          let hall = findHall(hallNameRaw);

          if (!hall) {
            const hallName = String(hallNameRaw || "").trim() || `Hall ${state.halls.length + newHallsToAdd.length + 1}`;
            const tempId = `temp-${hallName.toLowerCase().replace(/\s+/g, "-")}`;

            hall = {
              id: tempId,
              name: hallName,
              capacity: 50,
              color: "blue",
            };

            const alreadyQueued = newHallsToAdd.some(
              (h) => normalizeText(h.name) === normalizeText(hall.name)
            );
            if (!alreadyQueued) newHallsToAdd.push(hall);
          }

          employeesToImport.push({
            name,
            code,
            designation,
            weekOff,
            shift,
            hallId: hall.id,
            hallName: hall.name,
          });
        }

        setLoading(true);
        let imported = 0;

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

        for (const emp of employeesToImport) {
          try {
            const payload = {
              code: String(emp.code).trim(),
              name: String(emp.name).trim(),
              designation: String(emp.designation).trim(),
              week_off: emp.weekOff,
              shift: emp.shift,
              hall_id: emp.hallId,
              hall_name: emp.hallName,
            };

            const response = await hrApi.addEmployee(payload);
            if (response.success) imported++;
          } catch (error) {
            console.error("Import failed:", error);
          }
        }

        const newEmployees = employeesToImport.map((emp) => ({
          id: Date.now() + Math.random(),
          code: emp.code,
          name: emp.name,
          designation: emp.designation,
          weekOff: emp.weekOff,
          shift: emp.shift,
          hallId: emp.hallId,
          hallName: emp.hallName,
        }));

        setState((prev) => ({
          ...prev,
          employees: [...newEmployees, ...prev.employees],
        }));

        setMessage(`${imported} of ${employeesToImport.length} records imported successfully!`);
      } catch (error) {
        setMessage("CSV import failed: " + error.message);
      } finally {
        setLoading(false);
      }
    };

    reader.readAsText(file);
  };

  const stats = useMemo(() => {
    const byHall = new Map();
    state.employees.forEach((e) => {
      const key = String(e.hallId || "");
      byHall.set(key, (byHall.get(key) || 0) + 1);
    });
    return { total: state.employees.length, hallsUsed: byHall.size };
  }, [state.employees]);

  return (
    <div className="overflow-hidden border-2 border-slate-300 bg-white shadow-xl">
      <div className="border-b border-slate-300 bg-[#23205C] px-5 py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Roster Manager</h2>
            <p className="mt-1 text-sm text-white/70">Hall-attached employee master</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="border-2 border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20"
              type="button"
              onClick={exportCsv}
            >
              <Download className="mr-1 inline h-4 w-4" />
              Export CSV
            </button>
            <button
              className="border-2 border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20"
              type="button"
              onClick={exportExcel}
            >
              <FileSpreadsheet className="mr-1 inline h-4 w-4" />
              Export Excel
            </button>
            <button
              className="border-2 border-[#E0222A] bg-[#E0222A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#E0222A]/90 disabled:opacity-50"
              type="button"
              onClick={deleteSelectedEmployees}
              disabled={loading || (!selectedIds.length && !rows.length)}
            >
              <Trash className="mr-1 inline h-4 w-4" />
              Delete Selected / All
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-5">
        <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">
          <div className="border-2 border-slate-300 bg-white p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <Users className="h-4 w-4" />
              Total Employees
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
          <div className="border-2 border-slate-300 bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Mode</div>
            <div className="mt-2 text-xl font-bold text-slate-900">{editingId ? "Edit" : "Add"}</div>
          </div>
          <div className="border-2 border-slate-300 bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Visible</div>
            <div className="mt-2 text-xl font-bold text-slate-900">{rows.length}</div>
          </div>
          <div className="border-2 border-[#E0222A] bg-[#E0222A]/5 p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#E0222A]">Selected</div>
            <div className="mt-2 text-xl font-bold text-[#E0222A]">{selectedIds.length}</div>
          </div>
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

        <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
          <input
            className="border-2 border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none hover:border-slate-400 focus:border-[#E0222A] focus:ring-4 focus:ring-[#E0222A]/10 md:col-span-2"
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          />
          <input
            className="border-2 border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none hover:border-slate-400 focus:border-[#E0222A] focus:ring-4 focus:ring-[#E0222A]/10 md:col-span-2"
            placeholder="Code"
            value={form.code}
            onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
          />
          <input
            className="border-2 border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none hover:border-slate-400 focus:border-[#E0222A] focus:ring-4 focus:ring-[#E0222A]/10 md:col-span-2"
            placeholder="Designation"
            value={form.designation}
            onChange={(e) => setForm((p) => ({ ...p, designation: e.target.value }))}
          />
          <select
            className="border-2 border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none hover:border-slate-400 focus:border-[#E0222A] focus:ring-4 focus:ring-[#E0222A]/10"
            value={form.shift}
            onChange={(e) => setForm((p) => ({ ...p, shift: e.target.value }))}
          >
            {["A", "B", "C", "AA", "BB"].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            className="border-2 border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none hover:border-slate-400 focus:border-[#E0222A] focus:ring-4 focus:ring-[#E0222A]/10"
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
            className="border-2 border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none hover:border-slate-400 focus:border-[#E0222A] focus:ring-4 focus:ring-[#E0222A]/10 md:col-span-2"
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
            className="bg-[#E0222A] px-4 py-3 font-semibold text-white shadow-lg shadow-[#E0222A]/25 hover:scale-[1.02] hover:shadow-[#E0222A]/30 active:scale-[0.98] md:col-span-2 disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            onClick={upsertEmp}
            disabled={loading}
          >
            {editingId ? <Save className="mr-1 inline h-4 w-4" /> : <Plus className="mr-1 inline h-4 w-4" />}
            {editingId ? "Update Employee" : "Add Employee"}
          </button>
          <button
            className="border-2 border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50 md:col-span-2"
            type="button"
            onClick={clearForm}
          >
            <X className="mr-1 inline h-4 w-4" />
            Reset
          </button>
          <label className="cursor-pointer inline-flex items-center justify-center gap-2 border-2 border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50 md:col-span-6">
            <FileUp className="h-4 w-4" />
            Import CSV
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && importCsv(e.target.files[0])}
            />
          </label>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <input
            type="checkbox"
            checked={rows.length > 0 && rows.every((r) => selectedIds.includes(r.id))}
            onChange={toggleSelectAll}
          />
          <span className="text-sm text-slate-700">Select all visible</span>
        </div>

        <div className="relative mt-5">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full border-2 border-slate-300 bg-white px-4 py-3 pl-9 text-slate-900 placeholder:text-slate-400 outline-none hover:border-slate-400 focus:border-[#E0222A] focus:ring-4 focus:ring-[#E0222A]/10"
            placeholder="Search roster"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="mt-5 overflow-hidden border-2 border-slate-300">
          <div className="max-h-[560px] overflow-auto">
            <table className="min-w-full">
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
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(r.id)}
                          onChange={() => toggleSelect(r.id)}
                        />
                      </td>
                      <td className="px-3 py-3 text-sm font-bold text-slate-900">{r.name}</td>
                      <td className="px-3 py-3 text-sm text-slate-700">{r.code}</td>
                      <td className="px-3 py-3 text-sm text-slate-700">{r.designation || "-"}</td>
                      <td className="px-3 py-3 text-sm">
                        <span className="border-2 border-slate-300 bg-white px-2 py-1 text-slate-700">
                          {r.hallName}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-sm text-slate-700">{r.shift}</td>
                      <td className="px-3 py-3 text-sm text-slate-700">{r.weekOff}</td>
                      <td className="px-3 py-3 text-sm">
                        <div className="flex flex-wrap gap-2">
                          <button
                            className="border-2 border-slate-300 bg-white px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50"
                            type="button"
                            onClick={() => startEdit(r)}
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            className="border-2 border-[#E0222A] bg-[#E0222A]/10 px-3 py-2 font-semibold text-[#E0222A] hover:bg-[#E0222A]/20"
                            type="button"
                            onClick={() => removeRow(r.id)}
                          >
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
  );
}