import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useHR } from "../context/HRContext";
import hrApi from "../api/hrApi";

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_LETTER = ["M", "T", "W", "T", "F", "S", "S"];
const SHIFT_CODES = ["A", "B", "C", "AA", "BB", "G"];

const SHIFT_META = {
  A: { cls: "bg-amber-100 text-amber-900 ring-amber-200" },
  AA: { cls: "bg-amber-200 text-amber-950 ring-amber-300", hint: "8 AM to 8 PM" },
  B: { cls: "bg-indigo-100 text-indigo-900 ring-indigo-200" },
  BB: { cls: "bg-[#23205C] text-white ring-[#23205C]", hint: "8 PM to 8 AM" },
  C: { cls: "bg-slate-200 text-slate-800 ring-slate-300" },
  G: { cls: "bg-emerald-100 text-emerald-900 ring-emerald-200" },
  default: { cls: "bg-slate-100 text-slate-700 ring-slate-200" },
};

const WEEK_KEY_RE = /^(\d{4})-W(\d{2})$/;

const btnBase =
  "inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#23205C]/40 disabled:cursor-not-allowed disabled:opacity-50";
const btnPrimary = `${btnBase} bg-[#E0222A] text-white hover:bg-[#c01d24]`;
const btnSecondary = `${btnBase} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`;
const btnDanger = `${btnBase} border border-[#E0222A]/40 bg-white text-[#E0222A] hover:bg-[#E0222A]/5`;
const btnOnNavy = `${btnBase} border border-white/25 text-white hover:bg-white/10 focus-visible:ring-white/60`;
const inputCls =
  "h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#23205C] focus:ring-2 focus:ring-[#23205C]/20";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const pad2 = (n) => String(n).padStart(2, "0");
const formatDate = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const parseDate = (s) => {
  const [y, m, d] = String(s).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

const getIsoWeekInfo = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() + 4 - day); // Thursday of this ISO week
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  const weekKey = `${d.getFullYear()}-W${pad2(weekNo)}`;
  const start = new Date(d);
  start.setDate(d.getDate() - 3); // Monday
  const end = new Date(start);
  end.setDate(start.getDate() + 6); // Sunday
  return { weekKey, weekStart: formatDate(start), weekEnd: formatDate(end) };
};

const mondayOfWeekKey = (key) => {
  const m = WEEK_KEY_RE.exec(String(key || "").trim().toUpperCase());
  if (!m) return null;
  const year = Number(m[1]);
  const wk = Number(m[2]);
  if (wk < 1 || wk > 53) return null;
  const jan4 = new Date(year, 0, 4);
  const mon = new Date(jan4);
  mon.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7) + (wk - 1) * 7);
  return mon;
};

const weekDates = (key) => {
  const mon = mondayOfWeekKey(key);
  if (!mon) return { start: "", end: "" };
  const end = new Date(mon);
  end.setDate(mon.getDate() + 6);
  return { start: formatDate(mon), end: formatDate(end) };
};

const fmtShort = (s) =>
  parseDate(s).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

const normText = (v) => String(v ?? "").trim().toLowerCase().replace(/\s+/g, " ");

const normDay = (v) => {
  const s = String(v || "").trim().toLowerCase();
  if (s.length < 3) return "";
  return DAYS.find((d) => d.toLowerCase().startsWith(s.slice(0, 3))) || "";
};

const normalizeRow = (row, fallbackHall = null) => ({
  id: row.id || row.code || Date.now(),
  week_key: row.week_key || "",
  week_start: row.week_start || "",
  week_end: row.week_end || "",
  name: row.name || "",
  code: String(row.code || "").trim(),
  designation: row.designation || "",
  weekOff: normDay(row.weekOff || row.week_off) || "Sunday",
  shift: row.shift || "A",
  hallId: row.hallId || row.hall_id || fallbackHall?.id || "",
  hallName: row.hallName || row.hall_name || fallbackHall?.name || "",
});

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

const makeForm = (hallId = "") => ({
  name: "",
  code: "",
  designation: "",
  weekOff: "Sunday",
  shift: "A",
  hallId: hallId ? String(hallId) : "",
});

/* ------------------------------------------------------------------ */
/* Small presentational pieces                                         */
/* ------------------------------------------------------------------ */

function ShiftChip({ shift }) {
  const meta = SHIFT_META[shift] || SHIFT_META.default;
  return (
    <span
      title={meta.hint ? `${shift}: ${meta.hint}` : `Shift ${shift}`}
      className={`inline-flex min-w-[2rem] items-center justify-center rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${meta.cls}`}
    >
      {shift}
    </span>
  );
}

function WeekStrip({ off }) {
  return (
    <div className="flex gap-1" role="img" aria-label={`Week off: ${off}`}>
      {DAYS.map((d, i) => (
        <span
          key={d}
          title={d === off ? `${d} (week off)` : d}
          className={`flex h-6 w-6 items-center justify-center rounded text-[10px] font-semibold ${
            d === off ? "bg-[#E0222A] text-white" : "bg-slate-100 text-slate-400"
          }`}
        >
          {DAY_LETTER[i]}
        </span>
      ))}
    </div>
  );
}

function IconButton({ label, className = "", children, ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...props}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#23205C]/40 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

function Modal({ title, onClose, children, footer, size = "md" }) {
  const width = size === "lg" ? "sm:max-w-2xl" : "sm:max-w-md";
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative flex max-h-[90vh] w-full ${width} flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#23205C]/40"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

export default function RosterManager() {
  const { state, setState } = useHR();

  const currentWeekKey = useMemo(() => getIsoWeekInfo().weekKey, []);
  const [week, setWeek] = useState(() => getIsoWeekInfo());
  const [weekDraft, setWeekDraft] = useState(week.weekKey);
  const weekKey = week.weekKey;

  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({ hallId: "", shift: "", weekOff: "", designation: "" });
  const [selected, setSelected] = useState([]);
  const [drawer, setDrawer] = useState(null); // null | { id: id | null }
  const [form, setForm] = useState(makeForm());
  const [importModal, setImportModal] = useState(null); // null | { plan?, error?, fileName? }
  const [copyModal, setCopyModal] = useState(null); // null | { source }
  const [confirm, setConfirm] = useState(null); // null | { title, body, confirmLabel, onConfirm }
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [flashCode, setFlashCode] = useState("");

  const rosterRows = useMemo(() => state.roster || [], [state.roster]);
  const halls = useMemo(() => state.halls || [], [state.halls]);
  const hallsRef = useRef(halls);
  hallsRef.current = halls;
  const reqRef = useRef(0);

  const notify = useCallback((type, text) => setToast({ type, text }), []);

  const hallById = useMemo(() => {
    const m = new Map();
    halls.forEach((h) => m.set(String(h.id), h));
    return m;
  }, [halls]);
  const hallLabel = (r) => r.hallName || hallById.get(String(r.hallId))?.name || "-";

  /* ---------------- week navigation ---------------- */

  const goToDate = (date) => setWeek(getIsoWeekInfo(date));
  const shiftWeek = (n) => {
    const mon = parseDate(week.weekStart);
    mon.setDate(mon.getDate() + 7 * n);
    goToDate(mon);
  };
  const goToWeekKey = (key) => {
    const mon = mondayOfWeekKey(key);
    if (mon) goToDate(mon);
  };

  useEffect(() => setWeekDraft(week.weekKey), [week.weekKey]);

  const draftValid = !!mondayOfWeekKey(weekDraft);
  const weekLabel = `${fmtShort(week.weekStart)} to ${fmtShort(week.weekEnd)} ${parseDate(
    week.weekEnd
  ).getFullYear()}`;

  /* ---------------- data loading ---------------- */

  const refreshRoster = useCallback(
    async (wk) => {
      const myReq = ++reqRef.current;
      setLoading(true);
      try {
        const res = await hrApi.getRoster(wk);
        if (myReq !== reqRef.current) return res;
        if (res?.success) {
          const raw = Array.isArray(res.data)
            ? res.data
            : Array.isArray(res.data?.items)
            ? res.data.items
            : Array.isArray(res.data?.roster)
            ? res.data.roster
            : [];
          const list = raw.map((r) =>
            normalizeRow(
              r,
              hallsRef.current.find((h) => String(h.id) === String(r.hall_id ?? r.hallId)) || null
            )
          );
          setState((prev) => ({ ...prev, roster: list }));
        } else {
          notify("error", res?.error || "Could not load the roster for this week.");
        }
        return res;
      } catch (err) {
        if (myReq === reqRef.current) notify("error", "Could not load the roster: " + err.message);
        return null;
      } finally {
        if (myReq === reqRef.current) setLoading(false);
      }
    },
    [setState, notify]
  );

  useEffect(() => {
    refreshRoster(weekKey);
    setSelected([]);
  }, [weekKey, refreshRoster]);

  /* ---------------- transient UI ---------------- */

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!flashCode) return undefined;
    const t = setTimeout(() => setFlashCode(""), 3500);
    return () => clearTimeout(t);
  }, [flashCode]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (confirm) setConfirm(null);
      else if (copyModal) setCopyModal(null);
      else if (importModal) setImportModal(null);
      else if (drawer) setDrawer(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirm, copyModal, importModal, drawer]);

  /* ---------------- derived lists ---------------- */

  const designations = useMemo(
    () => Array.from(new Set(rosterRows.map((r) => r.designation).filter(Boolean))).sort(),
    [rosterRows]
  );

  const shiftCounts = useMemo(() => {
    const c = {};
    rosterRows.forEach((r) => {
      c[r.shift] = (c[r.shift] || 0) + 1;
    });
    return c;
  }, [rosterRows]);
  const shiftList = useMemo(
    () =>
      Array.from(new Set([...SHIFT_CODES, ...Object.keys(shiftCounts)])).filter(
        (s) => shiftCounts[s]
      ),
    [shiftCounts]
  );

  const hallCounts = useMemo(() => {
    const c = {};
    rosterRows.forEach((r) => {
      const k = String(r.hallId || "");
      c[k] = (c[k] || 0) + 1;
    });
    return c;
  }, [rosterRows]);

  const q = normText(query);
  const baseRows = useMemo(
    () =>
      rosterRows.filter((e) => {
        if (filters.hallId && String(e.hallId || "") !== filters.hallId) return false;
        if (filters.shift && e.shift !== filters.shift) return false;
        if (filters.designation && e.designation !== filters.designation) return false;
        if (
          q &&
          !normText(
            `${e.name} ${e.code} ${e.designation} ${e.hallName} ${e.shift} ${e.weekOff}`
          ).includes(q)
        )
          return false;
        return true;
      }),
    [rosterRows, filters.hallId, filters.shift, filters.designation, q]
  );

  const rows = useMemo(() => {
    const list = filters.weekOff ? baseRows.filter((e) => e.weekOff === filters.weekOff) : baseRows;
    const shiftIdx = (s) => {
      const i = SHIFT_CODES.indexOf(s);
      return i < 0 ? 99 : i;
    };
    return list.slice().sort(
      (a, b) =>
        String(hallLabel(a)).localeCompare(String(hallLabel(b))) ||
        shiftIdx(a.shift) - shiftIdx(b.shift) ||
        String(a.name).localeCompare(String(b.name))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseRows, filters.weekOff, hallById]);

  const offCounts = useMemo(() => {
    const c = DAYS.map(() => 0);
    baseRows.forEach((e) => {
      const i = DAYS.indexOf(e.weekOff);
      if (i >= 0) c[i] += 1;
    });
    return c;
  }, [baseRows]);
  const maxOff = Math.max(0, ...offCounts);

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const allVisibleSelected = rows.length > 0 && rows.every((r) => selectedSet.has(String(r.id)));
  const filtersActive =
    !!query.trim() || !!(filters.hallId || filters.shift || filters.weekOff || filters.designation);

  const clearFilters = () => {
    setQuery("");
    setFilters({ hallId: "", shift: "", weekOff: "", designation: "" });
  };
  const toggleFilter = (key, value) =>
    setFilters((p) => ({ ...p, [key]: p[key] === value ? "" : value }));

  const toggleSelect = (id) => {
    const key = String(id);
    setSelected((p) => (p.includes(key) ? p.filter((x) => x !== key) : [...p, key]));
  };
  const toggleSelectAll = () => {
    const ids = rows.map((r) => String(r.id));
    setSelected((p) =>
      allVisibleSelected ? p.filter((x) => !ids.includes(x)) : Array.from(new Set([...p, ...ids]))
    );
  };

  /* ---------------- add / edit ---------------- */

  const openAdd = () => {
    setForm(makeForm(filters.hallId || halls[0]?.id || ""));
    setDrawer({ id: null });
  };

  const openEdit = (r) => {
    const hall =
      hallById.get(String(r.hallId)) || halls.find((h) => normText(h.name) === normText(r.hallName));
    setForm({
      name: r.name || "",
      code: r.code || "",
      designation: r.designation || "",
      weekOff: normDay(r.weekOff) || "Sunday",
      shift: r.shift || "A",
      hallId: hall ? String(hall.id) : "",
    });
    setDrawer({ id: r.id });
  };

  const saveRow = async (e) => {
    e?.preventDefault();
    const name = form.name.trim();
    const code = form.code.trim();
    if (!name || !code) {
      notify("error", "Enter both a name and a code.");
      return;
    }
    const hall = hallById.get(String(form.hallId));
    if (!hall) {
      notify("error", "Choose a hall for this employee.");
      return;
    }
    const isEdit = drawer?.id != null;
    if (!isEdit) {
      const clash = rosterRows.find(
        (r) => String(r.code).trim().toLowerCase() === code.toLowerCase()
      );
      if (clash) {
        notify(
          "error",
          `Code ${code} is already on ${weekKey} (${clash.name}, ${hallLabel(clash)}).`
        );
        return;
      }
    }

    const data = {
      week_key: week.weekKey,
      week_start: week.weekStart,
      week_end: week.weekEnd,
      code,
      name,
      designation: form.designation.trim(),
      week_off: form.weekOff,
      shift: form.shift,
      hall_id: hall.id,
      hall_name: hall.name,
    };

    setLoading(true);
    try {
      const res = isEdit
        ? await hrApi.updateRosterRow(drawer.id, data)
        : await hrApi.addRosterRow(data);
      if (res?.success) {
        notify("success", isEdit ? `Saved changes to ${name}.` : `Added ${name} to ${weekKey}.`);
        setDrawer(null);
        setFlashCode(code);
        await refreshRoster(weekKey);
      } else {
        notify("error", res?.error || "Could not save this entry.");
      }
    } catch (err) {
      notify("error", "Could not save: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- delete ---------------- */

  const deleteRows = async (ids) => {
    setConfirm(null);
    setLoading(true);
    try {
      const results = await Promise.allSettled(ids.map((id) => hrApi.deleteRosterRow(id)));
      const okSet = new Set(
        ids
          .filter((_, i) => results[i].status === "fulfilled" && results[i].value?.success)
          .map(String)
      );
      if (okSet.size) {
        setState((prev) => ({
          ...prev,
          roster: (prev.roster || []).filter((e) => !okSet.has(String(e.id))),
        }));
        setSelected((p) => p.filter((id) => !okSet.has(id)));
      }
      const n = okSet.size;
      if (n === ids.length) {
        notify("success", `Deleted ${n} ${n === 1 ? "entry" : "entries"}.`);
      } else {
        notify("error", `Deleted ${n} of ${ids.length} entries. Try the rest again.`);
      }
    } catch (err) {
      notify("error", "Could not delete: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const askDeleteOne = (r) =>
    setConfirm({
      title: `Delete ${r.name}?`,
      body: `${r.name} (${r.code}) will be removed from the ${weekKey} roster. This cannot be undone.`,
      confirmLabel: "Delete",
      onConfirm: () => deleteRows([r.id]),
    });

  const askDeleteSelected = () => {
    if (!selected.length) return;
    const n = selected.length;
    setConfirm({
      title: `Delete ${n} ${n === 1 ? "entry" : "entries"}?`,
      body: `The selected people will be removed from the ${weekKey} roster. This cannot be undone.`,
      confirmLabel: `Delete ${n}`,
      onConfirm: () => deleteRows(selected),
    });
  };

  /* ---------------- export ---------------- */

  const exportCsv = () => {
    if (!rows.length) {
      notify("error", "There are no rows to export in this view.");
      return;
    }
    const header = [
      "week_key",
      "week_start",
      "week_end",
      "name",
      "code",
      "designation",
      "weekOff",
      "shift",
      "hallName",
    ];
    const body = rows.map((r) => [
      r.week_key || week.weekKey,
      r.week_start || week.weekStart,
      r.week_end || week.weekEnd,
      r.name,
      r.code,
      r.designation,
      r.weekOff,
      r.shift,
      hallLabel(r) === "-" ? "" : hallLabel(r),
    ]);
    const csv = [header, ...body]
      .map((line) => line.map((c) => `"${String(c ?? "").replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `roster-${weekKey}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ---------------- import ---------------- */

  const findHall = (raw) => {
    const base = normText(raw);
    if (!base) return null;
    const keys = [base];
    const m = /^m?h[\s-]*0*(\d+)$/.exec(base); // MH1, H3, MH-2 -> Hall n
    if (m) keys.push(`hall ${m[1]}`);
    const squash = (s) => s.replace(/\s+/g, "");
    for (const k of keys) {
      const hit =
        halls.find((h) => normText(h.name) === k) ||
        halls.find((h) => normText(h.id) === k) ||
        halls.find((h) => squash(normText(h.name)) === squash(k));
      if (hit) return hit;
    }
    return null;
  };

  const buildImportPlan = (text) => {
    const clean = String(text || "").replace(/\uFEFF/g, "");
    const lines = clean
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length < 2) return { error: "No data rows found in that file." };

    const head = parseCsvLine(lines[0]).map((h) => h.replaceAll('"', "").trim().toLowerCase());
    const col = (...names) => head.findIndex((h) => names.includes(h));
    const ix = {
      weekKey: col("week_key", "weekkey"),
      start: col("week_start", "weekstart"),
      end: col("week_end", "weekend"),
      name: col("name", "operator name"),
      code: col("code"),
      des: col("designation"),
      off: col("weekoff", "week_off", "weakoff"),
      shift: col("shift"),
      hall: col("hallname", "hall_name", "hall"),
    };
    if (ix.name < 0 || ix.code < 0) {
      return { error: 'The first row must have "name" and "code" columns.' };
    }

    const newHalls = new Map(); // normalized name -> display name
    const hallCount = new Map(); // normalized name -> { name, count, isNew }
    const weekKeys = new Set();
    const out = [];
    let skipped = 0;
    let noHall = 0;
    let offDefaulted = 0;
    let shiftDefaulted = 0;

    for (const line of lines.slice(1)) {
      const cols = parseCsvLine(line);
      const get = (i) => (i >= 0 ? String(cols[i] ?? "").trim() : "");
      const name = get(ix.name);
      const code = get(ix.code);
      if (!name || !code) {
        skipped++;
        continue;
      }
      const hallRaw = get(ix.hall);
      if (!hallRaw) {
        noHall++;
        continue;
      }

      const hall = findHall(hallRaw);
      const hallKey = normText(hall ? hall.name : hallRaw);
      const hallName = hall ? hall.name : hallRaw;
      if (!hall && !newHalls.has(hallKey)) newHalls.set(hallKey, hallRaw);
      const hc = hallCount.get(hallKey) || { name: hallName, count: 0, isNew: !hall };
      hc.count += 1;
      hallCount.set(hallKey, hc);

      let off = normDay(get(ix.off));
      if (!off) {
        off = "Sunday";
        offDefaulted++;
      }
      let shift = get(ix.shift).toUpperCase();
      if (!shift) {
        shift = "A";
        shiftDefaulted++;
      }

      const rowKey = get(ix.weekKey).toUpperCase() || week.weekKey;
      weekKeys.add(rowKey);
      const dates = weekDates(rowKey);

      out.push({
        code,
        name,
        designation: get(ix.des),
        week_off: off,
        shift,
        hall_id: hall ? hall.id : null,
        hall_key: hallKey,
        hall_name: hallName,
        week_key: rowKey,
        week_start: get(ix.start) || dates.start,
        week_end: get(ix.end) || dates.end,
      });
    }

    if (!out.length) {
      return { error: "No usable rows. Each row needs a name, a code and a hall." };
    }

    const targetKey = out[0].week_key;
    return {
      rows: out,
      targetKey,
      targetStart: out[0].week_start,
      targetEnd: out[0].week_end,
      newHallNames: Array.from(newHalls.values()),
      hallSummary: Array.from(hallCount.values()),
      weekKeyCount: weekKeys.size,
      skipped,
      noHall,
      offDefaulted,
      shiftDefaulted,
    };
  };

  const onPickFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const plan = buildImportPlan(text);
      setImportModal(plan.error ? { error: plan.error, fileName: file.name } : { plan, fileName: file.name });
    } catch (err) {
      setImportModal({ error: "Could not read that file: " + err.message, fileName: file.name });
    }
  };

  const runImport = async (plan) => {
    setLoading(true);
    try {
      const idByKey = {};
      for (const name of plan.newHallNames) {
        const res = await hrApi.addHall({ name, capacity: 50, color: "blue" });
        if (!res?.success || res?.data?.id == null) {
          notify("error", `Could not create hall "${name}": ${res?.error || "unknown error"}`);
          return;
        }
        idByKey[normText(name)] = res.data.id;
        setState((prev) => ({ ...prev, halls: [...(prev.halls || []), res.data] }));
      }

      const employees = plan.rows.map((r) => ({
        code: r.code,
        name: r.name,
        designation: r.designation,
        week_off: r.week_off,
        shift: r.shift,
        hall_id: r.hall_id ?? idByKey[r.hall_key],
        hall_name: r.hall_name,
        week_key: r.week_key,
        week_start: r.week_start,
        week_end: r.week_end,
      }));

      const response = await hrApi.bulkImportRoster({
        week_key: plan.targetKey,
        week_start: plan.targetStart,
        week_end: plan.targetEnd,
        employees,
      });

      if (response?.success) {
        const n = response.data?.imported || employees.length;
        notify("success", `Imported ${n} ${n === 1 ? "row" : "rows"} into ${plan.targetKey}.`);
        setImportModal(null);
        if (plan.targetKey !== weekKey) goToWeekKey(plan.targetKey);
        else await refreshRoster(weekKey);
      } else {
        notify("error", "Import failed: " + (response?.error || "unknown error"));
      }
    } catch (err) {
      notify("error", "Import failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- copy from another week ---------------- */

  const openCopy = () => {
    const prev = parseDate(week.weekStart);
    prev.setDate(prev.getDate() - 7);
    setCopyModal({ source: getIsoWeekInfo(prev).weekKey });
  };

  const runCopy = async () => {
    const source = String(copyModal?.source || "").trim().toUpperCase();
    if (!mondayOfWeekKey(source)) {
      notify("error", "Enter the week to copy from, like 2026-W39.");
      return;
    }
    if (source === weekKey) {
      notify("error", "Choose a different week to copy from.");
      return;
    }
    setLoading(true);
    try {
      const res = await hrApi.importRosterFromWeek({ week_key: weekKey, source_week_key: source });
      if (res?.success) {
        notify("success", `Copied the roster from ${source} into ${weekKey}.`);
        setCopyModal(null);
        await refreshRoster(weekKey);
      } else {
        notify("error", res?.error || "Could not copy that week.");
      }
    } catch (err) {
      notify("error", "Could not copy: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- render ---------------- */

  const plan = importModal?.plan;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-sm">
      {/* Header */}
      <header className="bg-[#23205C] px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-white">Weekly roster</h2>
            <p className="mt-0.5 text-sm text-white/70">
              Shift, hall and week off for every employee.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={btnOnNavy} onClick={() => setImportModal({})}>
              <Upload className="h-4 w-4" />
              Import CSV
            </button>
            <button
              type="button"
              className={btnOnNavy}
              onClick={exportCsv}
              title="Download the rows shown below"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
            <button type="button" className={btnOnNavy} onClick={openCopy}>
              <Copy className="h-4 w-4" />
              Copy from week
            </button>
            <button type="button" className={btnPrimary} onClick={openAdd}>
              <Plus className="h-4 w-4" />
              Add employee
            </button>
          </div>
        </div>
      </header>

      {/* Week bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <IconButton label="Previous week" onClick={() => shiftWeek(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </IconButton>
          <input
            aria-label="Week key"
            value={weekDraft}
            onChange={(e) => {
              const v = e.target.value.toUpperCase();
              setWeekDraft(v);
              goToWeekKey(v);
            }}
            placeholder="2026-W40"
            className={`h-9 w-28 rounded-lg border bg-white px-2 text-center text-sm font-semibold tabular-nums outline-none transition focus:ring-2 ${
              draftValid
                ? "border-slate-300 focus:border-[#23205C] focus:ring-[#23205C]/20"
                : "border-[#E0222A] focus:ring-[#E0222A]/20"
            }`}
          />
          <IconButton label="Next week" onClick={() => shiftWeek(1)}>
            <ChevronRight className="h-4 w-4" />
          </IconButton>
          <span className="ml-1 text-sm text-slate-600">{weekLabel}</span>
          {weekKey !== currentWeekKey && (
            <button
              type="button"
              className="text-sm font-medium text-[#23205C] underline-offset-2 hover:underline"
              onClick={() => goToDate(new Date())}
            >
              Go to this week
            </button>
          )}
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-600">
          {loading && (
            <span className="inline-flex items-center gap-2" role="status">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-[#23205C] motion-reduce:animate-none" />
              Working
            </span>
          )}
          <span className="tabular-nums">
            {rosterRows.length} {rosterRows.length === 1 ? "employee" : "employees"} on {weekKey}
          </span>
        </div>
      </div>

      <div className="space-y-4 px-4 py-4 sm:px-6">
        {/* Hall tabs */}
        <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Halls">
          {[{ id: "", name: "All halls" }, ...halls].map((h) => {
            const id = String(h.id);
            const active = filters.hallId === id;
            const count = id === "" ? rosterRows.length : hallCounts[id] || 0;
            return (
              <button
                key={id || "all"}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilters((p) => ({ ...p, hallId: id }))}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#23205C]/40 ${
                  active
                    ? "bg-[#23205C] text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {h.name}
                <span className={`ml-1.5 tabular-nums ${active ? "text-white/70" : "text-slate-500"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              aria-label="Search roster"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, code or designation"
              className={`${inputCls} pl-9`}
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by shift">
            <span className="mr-1 text-sm text-slate-500">Shift</span>
            {shiftList.map((s) => {
              const meta = SHIFT_META[s] || SHIFT_META.default;
              const active = filters.shift === s;
              return (
                <button
                  key={s}
                  type="button"
                  aria-pressed={active}
                  title={meta.hint ? `${s}: ${meta.hint}` : `Shift ${s}`}
                  onClick={() => toggleFilter("shift", s)}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold ring-1 ring-inset transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#23205C] ${meta.cls} ${
                    active
                      ? "outline outline-2 outline-offset-1 outline-[#23205C]"
                      : filters.shift
                      ? "opacity-50 hover:opacity-100"
                      : ""
                  }`}
                >
                  {s}
                  <span className="ml-1 font-normal tabular-nums opacity-70">{shiftCounts[s]}</span>
                </button>
              );
            })}
          </div>

          <select
            aria-label="Filter by designation"
            value={filters.designation}
            onChange={(e) => setFilters((p) => ({ ...p, designation: e.target.value }))}
            className={`${inputCls} w-auto min-w-[150px]`}
          >
            <option value="">All designations</option>
            {designations.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          {filtersActive && (
            <button type="button" className={btnSecondary} onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </div>

        {/* Off-day strip */}
        <section aria-label="People off each day">
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-800">People off each day</h3>
            <span className="text-xs text-slate-500">Click a day to list who is off</span>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {DAYS.map((d, i) => {
              const n = offCounts[i];
              const active = filters.weekOff === d;
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={active}
                  title={`${n} off on ${d}`}
                  onClick={() => toggleFilter("weekOff", d)}
                  className={`rounded-xl border px-2 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#23205C]/40 ${
                    active
                      ? "border-[#23205C] bg-[#23205C]/5 ring-1 ring-[#23205C]"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="text-xs font-medium text-slate-500">{d.slice(0, 3)}</div>
                  <div className="text-lg font-semibold leading-tight tabular-nums text-slate-900">
                    {n}
                  </div>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-[#E0222A]"
                      style={{ width: `${maxOff ? (n / maxOff) * 100 : 0}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* List header */}
        <div className="flex min-h-[2.25rem] flex-wrap items-center justify-between gap-2">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300"
              checked={allVisibleSelected}
              onChange={toggleSelectAll}
              disabled={!rows.length}
            />
            Select all shown
          </label>
          {selected.length > 0 ? (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-[#23205C]">{selected.length} selected</span>
              <button type="button" className={btnSecondary} onClick={() => setSelected([])}>
                Clear selection
              </button>
              <button type="button" className={btnDanger} onClick={askDeleteSelected} disabled={loading}>
                <Trash2 className="h-4 w-4" />
                Delete selected
              </button>
            </div>
          ) : (
            <span className="text-sm text-slate-500 tabular-nums">
              Showing {rows.length} of {rosterRows.length}
            </span>
          )}
        </div>

        {/* Table */}
        <div className={`rounded-xl border border-slate-200 transition-opacity ${loading ? "opacity-70" : ""}`}>
          <div className="max-h-[62vh] overflow-auto">
            <table className="w-full min-w-[820px] table-auto border-collapse">
              <thead>
                <tr>
                  {["", "Employee", "Designation", "Hall", "Shift", "Week off", ""].map((h, i) => (
                    <th
                      key={i}
                      scope="col"
                      className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold text-slate-600"
                    >
                      {h || <span className="sr-only">{i === 0 ? "Select" : "Actions"}</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length ? (
                  rows.map((r) => {
                    const isSel = selectedSet.has(String(r.id));
                    const flash = flashCode && String(r.code) === flashCode;
                    return (
                      <tr
                        key={`${r.id}-${r.code}`}
                        className={`border-b border-slate-100 transition-colors last:border-b-0 ${
                          flash ? "bg-emerald-50" : isSel ? "bg-[#23205C]/5" : "hover:bg-slate-50"
                        }`}
                      >
                        <td className="w-10 px-3 py-2.5">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300"
                            aria-label={`Select ${r.name}`}
                            checked={isSel}
                            onChange={() => toggleSelect(r.id)}
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="text-sm font-semibold text-slate-900">{r.name}</div>
                          <div className="text-xs tabular-nums text-slate-500">{r.code}</div>
                        </td>
                        <td className="px-3 py-2.5 text-sm text-slate-700">{r.designation || "-"}</td>
                        <td className="px-3 py-2.5 text-sm text-slate-700">{hallLabel(r)}</td>
                        <td className="px-3 py-2.5">
                          <ShiftChip shift={r.shift} />
                        </td>
                        <td className="px-3 py-2.5">
                          <WeekStrip off={r.weekOff} />
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex justify-end gap-1.5">
                            <IconButton label={`Edit ${r.name}`} onClick={() => openEdit(r)}>
                              <Pencil className="h-4 w-4" />
                            </IconButton>
                            <IconButton
                              label={`Delete ${r.name}`}
                              onClick={() => askDeleteOne(r)}
                              className="border-[#E0222A]/40 text-[#E0222A] hover:bg-[#E0222A]/5"
                            >
                              <Trash2 className="h-4 w-4" />
                            </IconButton>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-14 text-center">
                      {filtersActive && rosterRows.length ? (
                        <>
                          <p className="text-sm font-medium text-slate-800">
                            No one matches these filters.
                          </p>
                          <button type="button" className={`${btnSecondary} mt-3`} onClick={clearFilters}>
                            Clear filters
                          </button>
                        </>
                      ) : loading ? (
                        <p className="text-sm text-slate-500">Loading the roster for {weekKey}</p>
                      ) : (
                        <>
                          <p className="text-sm font-medium text-slate-800">
                            No roster for {weekKey} yet.
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            Import a CSV, copy another week, or add people one by one.
                          </p>
                          <div className="mt-4 flex flex-wrap justify-center gap-2">
                            <button type="button" className={btnPrimary} onClick={() => setImportModal({})}>
                              <Upload className="h-4 w-4" />
                              Import CSV
                            </button>
                            <button type="button" className={btnSecondary} onClick={openCopy}>
                              <Copy className="h-4 w-4" />
                              Copy from week
                            </button>
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add / edit drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setDrawer(null)} />
          <form
            onSubmit={saveRow}
            role="dialog"
            aria-modal="true"
            aria-labelledby="roster-drawer-title"
            className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h3 id="roster-drawer-title" className="text-base font-semibold text-slate-900">
                  {drawer.id != null ? "Edit roster entry" : "Add employee"}
                </h3>
                <p className="mt-0.5 text-sm text-slate-500">
                  {weekKey}, {weekLabel}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDrawer(null)}
                aria-label="Close"
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#23205C]/40"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Name</span>
                <input
                  autoFocus
                  className={inputCls}
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Full name"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Employee code</span>
                <input
                  className={`${inputCls} tabular-nums`}
                  value={form.code}
                  onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
                  placeholder="e.g. 165990"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Designation</span>
                <input
                  className={inputCls}
                  list="roster-designations"
                  value={form.designation}
                  onChange={(e) => setForm((p) => ({ ...p, designation: e.target.value }))}
                  placeholder="Operator"
                />
                <datalist id="roster-designations">
                  {designations.map((d) => (
                    <option key={d} value={d} />
                  ))}
                </datalist>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Hall</span>
                <select
                  className={inputCls}
                  value={form.hallId}
                  onChange={(e) => setForm((p) => ({ ...p, hallId: e.target.value }))}
                >
                  <option value="">Choose a hall</option>
                  {halls.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
                {!halls.length && (
                  <span className="mt-1 block text-xs text-[#E0222A]">
                    No halls exist yet. Add one in Hall Manager first.
                  </span>
                )}
              </label>

              <div>
                <div className="mb-1 text-sm font-medium text-slate-700">Shift</div>
                <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Shift">
                  {SHIFT_CODES.map((s) => {
                    const meta = SHIFT_META[s] || SHIFT_META.default;
                    const active = form.shift === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => setForm((p) => ({ ...p, shift: s }))}
                        className={`h-9 min-w-[2.75rem] rounded-lg px-3 text-sm font-semibold ring-1 ring-inset transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#23205C] ${meta.cls} ${
                          active ? "outline outline-2 outline-offset-1 outline-[#23205C]" : "opacity-60 hover:opacity-100"
                        }`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
                {SHIFT_META[form.shift]?.hint && (
                  <p className="mt-1.5 text-xs text-slate-500">
                    {form.shift} runs {SHIFT_META[form.shift].hint}.
                  </p>
                )}
              </div>

              <div>
                <div className="mb-1 text-sm font-medium text-slate-700">Week off</div>
                <div className="grid grid-cols-7 gap-1" role="radiogroup" aria-label="Week off">
                  {DAYS.map((d) => {
                    const active = form.weekOff === d;
                    return (
                      <button
                        key={d}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        title={d}
                        onClick={() => setForm((p) => ({ ...p, weekOff: d }))}
                        className={`h-10 rounded-lg text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#23205C]/40 ${
                          active
                            ? "bg-[#E0222A] text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {d.slice(0, 3)}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-1.5 text-xs text-slate-500">Off on {form.weekOff}.</p>
              </div>
            </div>

            <div className="flex gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
              <button type="submit" className={`${btnPrimary} flex-1`} disabled={loading}>
                {drawer.id != null ? "Save changes" : "Add employee"}
              </button>
              <button type="button" className={btnSecondary} onClick={() => setDrawer(null)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Import modal */}
      {importModal && (
        <Modal
          title="Import roster from CSV"
          size="lg"
          onClose={() => setImportModal(null)}
          footer={
            plan ? (
              <>
                <label className={`${btnSecondary} cursor-pointer`}>
                  Choose another file
                  <input type="file" accept=".csv,text/csv" className="hidden" onChange={onPickFile} />
                </label>
                <button
                  type="button"
                  className={btnPrimary}
                  onClick={() => runImport(plan)}
                  disabled={loading}
                >
                  Import {plan.rows.length} {plan.rows.length === 1 ? "row" : "rows"}
                </button>
              </>
            ) : (
              <>
                <button type="button" className={btnSecondary} onClick={() => setImportModal(null)}>
                  Cancel
                </button>
                <label className={`${btnPrimary} cursor-pointer`}>
                  <Upload className="h-4 w-4" />
                  Choose CSV file
                  <input type="file" accept=".csv,text/csv" className="hidden" onChange={onPickFile} />
                </label>
              </>
            )
          }
        >
          {plan ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-slate-600">{importModal.fileName}</p>
                <p className="mt-1 text-base font-semibold text-slate-900">
                  {plan.rows.length} {plan.rows.length === 1 ? "person" : "people"} into {plan.targetKey}
                </p>
                {plan.targetKey !== weekKey && (
                  <p className="mt-1 text-sm text-[#E0222A]">
                    The file names {plan.targetKey}, but you are viewing {weekKey}. The import goes into{" "}
                    {plan.targetKey}.
                  </p>
                )}
              </div>

              <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-600">
                    <tr>
                      <th className="px-3 py-2">Hall</th>
                      <th className="px-3 py-2 text-right">People</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plan.hallSummary.map((h) => (
                      <tr key={h.name} className="border-t border-slate-100">
                        <td className="px-3 py-2">
                          {h.name}
                          {h.isNew && (
                            <span className="ml-2 rounded bg-[#E0222A]/10 px-1.5 py-0.5 text-xs font-medium text-[#E0222A]">
                              new hall
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{h.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {(plan.newHallNames.length > 0 ||
                plan.skipped > 0 ||
                plan.noHall > 0 ||
                plan.offDefaulted > 0 ||
                plan.shiftDefaulted > 0 ||
                plan.weekKeyCount > 1) && (
                <ul className="space-y-1 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  {plan.newHallNames.length > 0 && (
                    <li>
                      {plan.newHallNames.length} new {plan.newHallNames.length === 1 ? "hall" : "halls"} (
                      {plan.newHallNames.join(", ")}) will be created with 50 seats. Check the hall names
                      if this looks wrong.
                    </li>
                  )}
                  {plan.noHall > 0 && <li>{plan.noHall} rows have no hall and will be skipped.</li>}
                  {plan.skipped > 0 && <li>{plan.skipped} rows have no name or code and will be skipped.</li>}
                  {plan.offDefaulted > 0 && (
                    <li>{plan.offDefaulted} rows have no valid week off and will be set to Sunday.</li>
                  )}
                  {plan.shiftDefaulted > 0 && (
                    <li>{plan.shiftDefaulted} rows have no shift and will be set to A.</li>
                  )}
                  {plan.weekKeyCount > 1 && (
                    <li>The file has {plan.weekKeyCount} different weeks. Each row keeps its own week.</li>
                  )}
                </ul>
              )}
            </div>
          ) : (
            <div className="space-y-4 text-sm text-slate-700">
              {importModal.error && (
                <div className="flex items-start gap-2 rounded-lg border border-[#E0222A]/30 bg-[#E0222A]/5 px-3 py-2 text-[#E0222A]">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{importModal.error}</span>
                </div>
              )}
              <p>
                Rows go into <strong>{weekKey}</strong> ({weekLabel}) unless the file has a week_key
                column.
              </p>
              <div>
                <p className="font-medium text-slate-800">Columns</p>
                <p className="mt-1">
                  Required: <code className="rounded bg-slate-100 px-1">name</code>,{" "}
                  <code className="rounded bg-slate-100 px-1">code</code>,{" "}
                  <code className="rounded bg-slate-100 px-1">hallName</code>. Optional:{" "}
                  <code className="rounded bg-slate-100 px-1">designation</code>,{" "}
                  <code className="rounded bg-slate-100 px-1">weekOff</code>,{" "}
                  <code className="rounded bg-slate-100 px-1">shift</code>,{" "}
                  <code className="rounded bg-slate-100 px-1">week_key</code>,{" "}
                  <code className="rounded bg-slate-100 px-1">week_start</code>,{" "}
                  <code className="rounded bg-slate-100 px-1">week_end</code>.
                </p>
              </div>
              <div>
                <p className="font-medium text-slate-800">Example</p>
                <pre className="mt-1 overflow-x-auto rounded-lg bg-slate-100 px-3 py-2 text-xs">
{`name,code,designation,weekOff,shift,hallName
KHUSH RAVI,165990,OPERATOR,Monday,AA,Hall 1`}
                </pre>
              </div>
              <p className="text-xs text-slate-500">
                Hall names like MH1 or H3 match Hall 1 or Hall 3 automatically. You see a preview before
                anything is saved.
              </p>
            </div>
          )}
        </Modal>
      )}

      {/* Copy modal */}
      {copyModal && (
        <Modal
          title="Copy roster from another week"
          onClose={() => setCopyModal(null)}
          footer={
            <>
              <button type="button" className={btnSecondary} onClick={() => setCopyModal(null)}>
                Cancel
              </button>
              <button type="button" className={btnPrimary} onClick={runCopy} disabled={loading}>
                Copy roster
              </button>
            </>
          }
        >
          <p className="text-sm text-slate-600">
            Everyone on the source week is copied into <strong>{weekKey}</strong>.
          </p>
          <label className="mt-3 block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Copy from week</span>
            <input
              autoFocus
              className={`${inputCls} tabular-nums`}
              value={copyModal.source}
              onChange={(e) => setCopyModal({ source: e.target.value.toUpperCase() })}
              onKeyDown={(e) => e.key === "Enter" && runCopy()}
              placeholder="2026-W39"
            />
          </label>
        </Modal>
      )}

      {/* Confirm modal */}
      {confirm && (
        <Modal
          title={confirm.title}
          onClose={() => setConfirm(null)}
          footer={
            <>
              <button type="button" className={btnSecondary} onClick={() => setConfirm(null)}>
                Cancel
              </button>
              <button
                type="button"
                className={btnPrimary}
                onClick={confirm.onConfirm}
                disabled={loading}
              >
                {confirm.confirmLabel}
              </button>
            </>
          }
        >
          <p className="text-sm text-slate-700">{confirm.body}</p>
        </Modal>
      )}

      {/* Toast */}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-4 right-4 z-[60] flex max-w-sm items-start gap-2 rounded-xl border px-4 py-3 text-sm shadow-lg ${
            toast.type === "success"
              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
              : "border-[#E0222A]/40 bg-white text-[#E0222A]"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span className="flex-1">{toast.text}</span>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setToast(null)}
            className="rounded p-0.5 opacity-70 hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}