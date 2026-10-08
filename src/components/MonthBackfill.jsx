import React, { useMemo, useRef, useState } from "react";
import {
  Loader2,
  Play,
  Square,
  Download,
  Trash2,
  CalendarDays,
  ShieldCheck,
  RefreshCw,
  Database,
} from "lucide-react";
import { useHR } from "../context/HRContext";
import hrApi from "../api/hrApi";

const CONCURRENCY = 8;

const pad = (n) => String(n).padStart(2, "0");

const norm = (v) => String(v ?? "").trim().toLowerCase();

const getArray = (d) => {
  if (Array.isArray(d)) return d;

  for (const key of ["data", "entries", "items", "rows"]) {
    if (Array.isArray(d?.[key])) return d[key];
  }

  return [];
};

const dayNameOf = (iso) => {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
  });
};

const todayISO = () => {
  const d = new Date();

  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const monthDates = (ym) => {
  if (!ym) return [];

  const [year, month] = ym.split("-").map(Number);

  if (!year || !month) return [];

  const lastDay = new Date(year, month, 0).getDate();

  const result = [];

  for (let d = 1; d <= lastDay; d++) {
    result.push(`${year}-${pad(month)}-${pad(d)}`);
  }

  return result;
};

const rangeDates = (from, to) => {
  if (!from || !to || from > to) return [];

  const result = [];

  const current = new Date(`${from}T12:00:00`);
  const end = new Date(`${to}T12:00:00`);

  while (current <= end) {
    result.push(
      `${current.getFullYear()}-${pad(current.getMonth() + 1)}-${pad(
        current.getDate()
      )}`
    );

    current.setDate(current.getDate() + 1);
  }

  return result;
};

const timeForShift = (shift) => {
  const start = String(shift?.start || "08:00");

  const [h, m] = start.split(":").map(Number);

  const base = h * 60 + m;

  // Attendance ko shift start ke aas-paas realistic time do.
  // Random nahi, deterministic offset employee/date se bahar generate nahi karte.
  const safe = Number.isFinite(base) ? base : 480;

  return `${pad(Math.floor(safe / 60))}:${pad(safe % 60)}`;
};

/*
  IMPORTANT:

  UI me ye SCAN dikhega,
  lekin hr_action = MONTH_BACKFILL hone ki wajah se
  system internally ise roster/backfill entry samajh sakta hai.

  Isse:
  - real scanner entries safe
  - imported roster entries attendance sheet me SCAN jaisi
  - HR management possible
*/
const isBackfilled = (entry) => {
  const source = String(entry?.source || "").toUpperCase();

  const action = String(
    entry?.hrAction ??
      entry?.hr_action ??
      ""
  ).toUpperCase();

  const reason = String(
    entry?.overrideReason ??
      entry?.override_reason ??
      ""
  );

  return (
    source === "IMPORT" ||
    source === "ROSTER_IMPORT" ||
    action === "MONTH_BACKFILL" ||
    reason.startsWith("Backfill from roster")
  );
};

const runPool = async (items, fn, stopRef) => {
  let index = 0;

  const worker = async () => {
    while (!stopRef.current) {
      const current = index++;

      if (current >= items.length) return;

      await fn(items[current], current);
    }
  };

  await Promise.all(
    Array.from(
      { length: Math.min(CONCURRENCY, Math.max(items.length, 1)) },
      worker
    )
  );
};

export default function MonthBackfill() {
  const {
    state,
    refreshAfterWrite,
    canOverride,
  } = useHR();

  const [month, setMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );

  const [useCustomRange, setUseCustomRange] = useState(false);

  const [fromDate, setFromDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  const [toDate, setToDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  const [uptoToday, setUptoToday] = useState(false);

  const [weekKey, setWeekKey] = useState("");

  const [running, setRunning] = useState(false);

  const [mode, setMode] = useState("");

  const [progress, setProgress] = useState({
    done: 0,
    ok: 0,
    fail: 0,
    total: 0,
    lastError: "",
  });

  const [message, setMessage] = useState(null);

  const [verified, setVerified] = useState(false);

  const stopRef = useRef(false);

  /*
   * -----------------------------
   * ROSTER
   * -----------------------------
   */

  const weekKeys = useMemo(() => {
    return [
      ...new Set(
        (state.roster || [])
          .map((r) => r.week_key)
          .filter(Boolean)
      ),
    ].sort();
  }, [state.roster]);

  const activeWeek = weekKey || "";

  /*
   * Agar user week select karta hai,
   * selected week use hoga.
   *
   * Agar week select nahi hai,
   * available roster ko code ke basis par
   * consolidate karenge.
   */

  const rosterMap = useMemo(() => {
    const map = new Map();

    (state.roster || []).forEach((row) => {
      const code = String(row.code || "").trim();

      if (!code) return;

      if (activeWeek && row.week_key !== activeWeek) {
        return;
      }

      map.set(code, row);
    });

    return map;
  }, [state.roster, activeWeek]);

  const rosterRows = useMemo(
    () => [...rosterMap.values()],
    [rosterMap]
  );

  /*
   * -----------------------------
   * HALL
   * -----------------------------
   */

  const resolveHall = (row) => {
    return (
      (state.halls || []).find(
        (h) => norm(h.name) === norm(row.hallName)
      ) ||
      (state.halls || []).find(
        (h) => String(h.id) === String(row.hallId)
      ) ||
      state.halls?.[0]
    );
  };

  /*
   * -----------------------------
   * EXISTING ENTRIES
   * -----------------------------
   */

  const allEntries = Array.isArray(state.entries)
    ? state.entries
    : [];

  const backfilled = useMemo(() => {
    return allEntries.filter(isBackfilled);
  }, [allEntries]);

  /*
   * -----------------------------
   * DATE LIST
   * -----------------------------
   */

  const selectedDates = useMemo(() => {
    let dates = [];

    if (useCustomRange) {
      dates = rangeDates(fromDate, toDate);
    } else {
      dates = monthDates(month);
    }

    if (uptoToday) {
      const today = todayISO();

      dates = dates.filter((date) => date <= today);
    }

    return dates;
  }, [
    month,
    useCustomRange,
    fromDate,
    toDate,
    uptoToday,
  ]);

  /*
   * -----------------------------
   * EXISTING UNIQUE ATTENDANCE
   * -----------------------------
   */

  const existingKeys = useMemo(() => {
    return new Set(
      allEntries.map((entry) => {
        const code = String(entry.code || "").trim();

        const date = String(
          entry.date ||
            entry.entry_date ||
            entry.attendance_date ||
            entry.at ||
            ""
        ).slice(0, 10);

        return `${code}|${date}`;
      })
    );
  }, [allEntries]);

  /*
   * -----------------------------
   * PLAN
   * -----------------------------
   */

  const plan = useMemo(() => {
    const rows = [];

    selectedDates.forEach((date) => {
      const day = dayNameOf(date);

      rosterRows.forEach((roster) => {
        const code = String(roster.code || "").trim();

        if (!code) return;

        /*
         * Week off skip
         */
        if (
          roster.weekOff &&
          norm(roster.weekOff) === norm(day)
        ) {
          return;
        }

        /*
         * Duplicate attendance skip
         */
        if (existingKeys.has(`${code}|${date}`)) {
          return;
        }

        const hall = resolveHall(roster);

        const shift = (state.SHIFT_OPTIONS || []).find(
          (s) =>
            String(s.code).toUpperCase() ===
            String(roster.shift || "A").toUpperCase()
        );

        rows.push({
          date,

          day,

          time: timeForShift(shift),

          code,

          name: roster.name || "",

          designation: roster.designation || "",

          shift: roster.shift || "A",

          weekOff: roster.weekOff || "Sunday",

          hallId: hall?.id ?? roster.hallId ?? "",

          hallName:
            hall?.name ||
            roster.hallName ||
            "",

          /*
           * UI / Attendance Sheet me SCAN
           */
          source: "SCAN",

          /*
           * Internal identification
           */
          hrCode:
            state.currentUser?.username ||
            state.currentUser?.code ||
            "",

          hrAction: "MONTH_BACKFILL",

          overrideReason: "",
        });
      });
    });

    return rows;
  }, [
    selectedDates,
    rosterRows,
    existingKeys,
    state.halls,
    state.SHIFT_OPTIONS,
    state.currentUser,
  ]);

  /*
   * -----------------------------
   * PAYLOAD
   * -----------------------------
   */

  const toPayload = (row) => {
    return {
      code: row.code,
      name: row.name,
      designation: row.designation,

      week_off: row.weekOff,

      shift: row.shift,

      hall_id: row.hallId,
      hall_name: row.hallName,

      /*
       * MAIN DATE
       */
      date: row.date,

      time: row.time,

      day: row.day,

      /*
       * Attendance UI me SCAN
       */
      source: "SCAN",

      hr_code: row.hrCode,

      /*
       * Internal audit marker
       */
      hr_action: "MONTH_BACKFILL",

      override_reason: row.overrideReason || "",

      /*
       * Compatibility aliases
       */
      entry_date: row.date,

      attendance_date: row.date,

      created_at: `${row.date} ${row.time}:00`,

      at: `${row.date} ${row.time}:00`,

      timestamp: `${row.date} ${row.time}:00`,
    };
  };

  /*
   * -----------------------------
   * PROBE
   * -----------------------------
   */

  const probe = async () => {
    if (running || !plan.length) return;

    setMessage(null);

    setMode("probe");

    setRunning(true);

    try {
      const testRow = plan[0];

      const beforeRes =
        await hrApi.getEntries();

      const before =
        getArray(
          beforeRes?.data ?? beforeRes
        );

      const beforeIds = new Set(
        before.map((e) => String(e.id))
      );

      const response =
        await hrApi.addEntry(
          toPayload(testRow)
        );

      if (!response?.success) {
        setMessage({
          type: "error",
          text:
            response?.error ||
            "Probe failed.",
        });

        return;
      }

      const afterRes =
        await hrApi.getEntries();

      const after =
        getArray(
          afterRes?.data ?? afterRes
        );

      const created = after.filter(
        (entry) =>
          !beforeIds.has(String(entry.id))
      );

      const savedDate = String(
        created[0]?.date ||
          created[0]?.entry_date ||
          created[0]?.attendance_date ||
          created[0]?.at ||
          ""
      ).slice(0, 10);

      /*
       * TEST ENTRY DELETE
       */
      await Promise.all(
        created
          .filter((e) => e.id != null)
          .map((e) =>
            hrApi.deleteEntry(e.id)
          )
      );

      await refreshAfterWrite();

      if (savedDate === testRow.date) {
        setVerified(true);

        setMessage({
          type: "success",
          text:
            `Probe PASS ✓ Date ${savedDate} correctly save hui. Ab Start kar sakte ho.`,
        });
      } else {
        setVerified(false);

        setMessage({
          type: "error",
          text:
            `Probe FAIL: bheji ${testRow.date}, save hui ${savedDate || "unknown"}. Backfill start nahi kiya gaya.`,
        });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error?.message ||
          "Probe failed.",
      });
    } finally {
      setRunning(false);
    }
  };

  /*
   * -----------------------------
   * START BACKFILL
   * -----------------------------
   */

  const run = async () => {
    if (running || !plan.length) return;

    const confirmed = window.confirm(
      `${plan.length} attendance entries create hongi.\n\n` +
        `Date range: ${
          selectedDates[0] || "-"
        } → ${
          selectedDates[selectedDates.length - 1] ||
          "-"
        }\n\n` +
        `Existing attendance duplicate nahi hogi.\n` +
        `Week-off skip hoga.\n\n` +
        `Continue?`
    );

    if (!confirmed) return;

    stopRef.current = false;

    setMessage(null);

    setMode("add");

    setRunning(true);

    setProgress({
      done: 0,
      ok: 0,
      fail: 0,
      total: plan.length,
      lastError: "",
    });

    try {
      /*
       * FIRST RECORD TEST
       */

      const first = plan[0];

      const testResponse =
        await hrApi.addEntry(
          toPayload(first)
        );

      if (!testResponse?.success) {
        setMessage({
          type: "error",
          text:
            testResponse?.error ||
            "First test entry failed.",
        });

        return;
      }

      /*
       * Verify saved record
       */

      const listResponse =
        await hrApi.getEntries();

      const list =
        getArray(
          listResponse?.data ??
            listResponse
        );

      const newId =
        testResponse?.data?.id;

      const found = list.find(
        (entry) =>
          newId != null
            ? String(entry.id) ===
              String(newId)
            : String(entry.code).trim() ===
                first.code &&
              String(entry.date).slice(
                0,
                10
              ) === first.date
      );

      const savedDate = String(
        found?.date ||
          found?.entry_date ||
          found?.attendance_date ||
          found?.at ||
          ""
      ).slice(0, 10);

      if (savedDate !== first.date) {
        if (found?.id != null) {
          await hrApi.deleteEntry(
            found.id
          );
        } else if (newId != null) {
          await hrApi.deleteEntry(
            newId
          );
        }

        await refreshAfterWrite();

        setMessage({
          type: "error",
          text:
            `Backend date mismatch.\n` +
            `Sent: ${first.date}\n` +
            `Saved: ${savedDate || "unknown"}\n\n` +
            `Test entry delete kar di aur backfill STOP kar diya.`,
        });

        return;
      }

      /*
       * First entry successful
       */

      let ok = 1;

      let fail = 0;

      let lastError = "";

      setProgress({
        done: 1,
        ok,
        fail,
        total: plan.length,
        lastError,
      });

      /*
       * Remaining entries
       */

      await runPool(
        plan.slice(1),
        async (row) => {
          if (stopRef.current) {
            return;
          }

          try {
            const response =
              await hrApi.addEntry(
                toPayload(row)
              );

            if (response?.success) {
              ok++;
            } else {
              fail++;

              lastError =
                response?.error ||
                "Insert failed";
            }
          } catch (error) {
            fail++;

            lastError =
              error?.message ||
              "Insert failed";
          }

          const done =
            ok + fail;

          if (
            done % 25 === 0 ||
            done === plan.length
          ) {
            setProgress({
              done,
              ok,
              fail,
              total: plan.length,
              lastError,
            });
          }
        },
        stopRef
      );

      setProgress({
        done: ok + fail,
        ok,
        fail,
        total: plan.length,
        lastError,
      });

      if (stopRef.current) {
        setMessage({
          type: "success",
          text:
            `Stopped. ${ok} entries create hui, ${fail} fail.`,
        });
      } else {
        setMessage({
          type:
            fail > 0
              ? "error"
              : "success",

          text:
            `Backfill complete: ${ok} created, ${fail} failed.`,
        });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error?.message ||
          "Backfill failed.",
      });
    } finally {
      setRunning(false);

      await refreshAfterWrite();
    }
  };

  /*
   * -----------------------------
   * STOP
   * -----------------------------
   */

  const stop = () => {
    stopRef.current = true;

    setMessage({
      type: "error",
      text:
        "Stop requested. Running requests complete hone ke baad process ruk jayega.",
    });
  };

  /*
   * -----------------------------
   * DELETE ONLY BACKFILLED
   * -----------------------------
   */

  const deleteBackfilled = async () => {
    if (
      running ||
      !backfilled.length
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        `${backfilled.length} roster/backfill entries delete hongi.\n\n` +
          `Real scanner attendance delete nahi hogi.\n\n` +
          `Continue?`
      );

    if (!confirmed) return;

    stopRef.current = false;

    setMessage(null);

    setMode("delete");

    setRunning(true);

    setProgress({
      done: 0,
      ok: 0,
      fail: 0,
      total: backfilled.length,
      lastError: "",
    });

    let ok = 0;

    let fail = 0;

    let lastError = "";

    try {
      await runPool(
        backfilled,
        async (entry) => {
          if (stopRef.current) {
            return;
          }

          try {
            if (entry.id == null) {
              fail++;

              lastError =
                "Entry ID missing";

              return;
            }

            const response =
              await hrApi.deleteEntry(
                entry.id
              );

            if (response?.success) {
              ok++;
            } else {
              fail++;

              lastError =
                response?.error ||
                "Delete failed";
            }
          } catch (error) {
            fail++;

            lastError =
              error?.message ||
              "Delete failed";
          }

          const done =
            ok + fail;

          if (
            done % 25 === 0 ||
            done === backfilled.length
          ) {
            setProgress({
              done,
              ok,
              fail,
              total: backfilled.length,
              lastError,
            });
          }
        },
        stopRef
      );

      setProgress({
        done: ok + fail,
        ok,
        fail,
        total: backfilled.length,
        lastError,
      });

      setMessage({
        type:
          fail > 0
            ? "error"
            : "success",

        text:
          `Backfill delete complete: ${ok} deleted, ${fail} failed.`,
      });
    } finally {
      setRunning(false);

      await refreshAfterWrite();
    }
  };

  /*
   * -----------------------------
   * CSV
   * -----------------------------
   */

  const downloadCsv = () => {
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

    const csv = [
      headers,

      ...plan.map((row) =>
        headers.map(
          (key) => row[key] ?? ""
        )
      ),
    ]
      .map((line) =>
        line
          .map(
            (value) =>
              `"${String(value).replaceAll(
                '"',
                '""'
              )}"`
          )
          .join(",")
      )
      .join("\n");

    const blob = new Blob(
      [csv],
      {
        type:
          "text/csv;charset=utf-8;",
      }
    );

    const url =
      URL.createObjectURL(blob);

    const a =
      document.createElement("a");

    a.href = url;

    a.download =
      `attendance-backfill-${month}.csv`;

    a.click();

    URL.revokeObjectURL(url);
  };

  if (!canOverride) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
        HR/Admin login required.
      </div>
    );
  }

  const percentage =
    progress.total
      ? Math.round(
          (progress.done /
            progress.total) *
            100
        )
      : 0;

  const firstDate =
    selectedDates[0] || "-";

  const lastDate =
    selectedDates[
      selectedDates.length - 1
    ] || "-";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">

      {/* HEADER */}

      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-center md:justify-between">

        <div>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-[#23205C]" />

            <h2 className="text-lg font-bold text-slate-900">
              Attendance Backfill
            </h2>
          </div>

          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            Roster ke according attendance create aur manage karo.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />

          HR / Admin
        </div>

      </div>

      {/* DATE CONTROL */}

      <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">

        <div className="mb-3 flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-[#23205C]" />

          <span className="text-sm font-bold text-[#23205C]">
            Attendance Date Range
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4">

          <button
            type="button"
            disabled={running}
            onClick={() =>
              setUseCustomRange(false)
            }
            className={`rounded-lg px-3 py-2 text-xs font-semibold ${
              !useCustomRange
                ? "bg-[#23205C] text-white"
                : "border border-slate-300 bg-white text-slate-700"
            }`}
          >
            Month
          </button>

          <button
            type="button"
            disabled={running}
            onClick={() =>
              setUseCustomRange(true)
            }
            className={`rounded-lg px-3 py-2 text-xs font-semibold ${
              useCustomRange
                ? "bg-[#23205C] text-white"
                : "border border-slate-300 bg-white text-slate-700"
            }`}
          >
            Custom Range
          </button>

          <label className="ml-2 flex items-center gap-2 text-xs font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={uptoToday}
              disabled={running}
              onChange={(e) =>
                setUptoToday(
                  e.target.checked
                )
              }
            />

            Aaj tak limit
          </label>

        </div>

        {!useCustomRange ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Month
              </label>

              <input
                type="month"
                value={month}
                disabled={running}
                onChange={(e) =>
                  setMonth(e.target.value)
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#23205C]"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Roster Week
              </label>

              <select
                value={activeWeek}
                disabled={running}
                onChange={(e) =>
                  setWeekKey(e.target.value)
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#23205C]"
              >
                <option value="">
                  All available roster
                </option>

                {weekKeys.map((key) => (
                  <option
                    key={key}
                    value={key}
                  >
                    {key}
                  </option>
                ))}
              </select>
            </div>

          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                From
              </label>

              <input
                type="date"
                value={fromDate}
                disabled={running}
                onChange={(e) =>
                  setFromDate(
                    e.target.value
                  )
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                To
              </label>

              <input
                type="date"
                value={toDate}
                disabled={running}
                min={fromDate}
                onChange={(e) =>
                  setToDate(
                    e.target.value
                  )
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
              />
            </div>

          </div>
        )}

        <div className="mt-3 rounded-lg border border-indigo-100 bg-white px-3 py-2 text-xs text-slate-600">
          Selected:
          <b className="ml-1 text-slate-900">
            {firstDate}
          </b>

          <span className="mx-1">
            →
          </span>

          <b className="text-slate-900">
            {lastDate}
          </b>
        </div>

      </div>

      {/* SUMMARY */}

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">

        <div className="rounded-xl border border-slate-200 p-3">
          <div className="text-[10px] font-semibold uppercase text-slate-500">
            Roster
          </div>

          <div className="mt-1 text-xl font-bold text-slate-900">
            {rosterRows.length}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 p-3">
          <div className="text-[10px] font-semibold uppercase text-slate-500">
            Dates
          </div>

          <div className="mt-1 text-xl font-bold text-slate-900">
            {selectedDates.length}
          </div>
        </div>

        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
          <div className="text-[10px] font-semibold uppercase text-indigo-600">
            New Attendance
          </div>

          <div className="mt-1 text-xl font-bold text-[#23205C]">
            {plan.length}
          </div>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <div className="text-[10px] font-semibold uppercase text-emerald-600">
            Existing Backfill
          </div>

          <div className="mt-1 text-xl font-bold text-emerald-700">
            {backfilled.length}
          </div>
        </div>

      </div>

      {/* ACTIONS */}

      <div className="mt-4 flex flex-wrap gap-2">

        <button
          type="button"
          onClick={probe}
          disabled={
            running ||
            !plan.length
          }
          className="rounded-lg border border-[#23205C] bg-white px-4 py-2.5 text-sm font-semibold text-[#23205C] disabled:opacity-50"
        >
          {running &&
          mode === "probe" ? (
            <Loader2 className="mr-1 inline h-4 w-4 animate-spin" />
          ) : (
            <ShieldCheck className="mr-1 inline h-4 w-4" />
          )}

          {verified
            ? "Probe ✓"
            : "Test Date"}
        </button>

        <button
          type="button"
          onClick={run}
          disabled={
            running ||
            !plan.length
          }
          className="rounded-lg bg-[#23205C] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {running &&
          mode === "add" ? (
            <Loader2 className="mr-1 inline h-4 w-4 animate-spin" />
          ) : (
            <Play className="mr-1 inline h-4 w-4" />
          )}

          Start Backfill
        </button>

        <button
          type="button"
          onClick={stop}
          disabled={!running}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50"
        >
          <Square className="mr-1 inline h-4 w-4" />

          Stop
        </button>

        <button
          type="button"
          onClick={downloadCsv}
          disabled={
            running ||
            !plan.length
          }
          className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50"
        >
          <Download className="mr-1 inline h-4 w-4" />

          CSV
        </button>

        <button
          type="button"
          onClick={refreshAfterWrite}
          disabled={running}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50"
        >
          <RefreshCw className="mr-1 inline h-4 w-4" />

          Refresh
        </button>

      </div>

      {/* DELETE */}

      <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">

        <div className="flex items-start justify-between gap-3">

          <div>
            <div className="text-sm font-bold text-red-700">
              Backfill Management
            </div>

            <p className="mt-1 text-xs text-red-600">
              Sirf MONTH_BACKFILL roster entries delete hongi.
              Real scanner entries safe rahengi.
            </p>
          </div>

          <div className="rounded-lg bg-white px-3 py-2 text-sm font-bold text-red-700">
            {backfilled.length}
          </div>

        </div>

        <button
          type="button"
          onClick={deleteBackfilled}
          disabled={
            running ||
            !backfilled.length
          }
          className="mt-3 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {running &&
          mode === "delete" ? (
            <Loader2 className="mr-1 inline h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="mr-1 inline h-4 w-4" />
          )}

          Delete Backfill Entries
        </button>

      </div>

      {/* MESSAGE */}

      {message && (
        <div
          className={`mt-4 whitespace-pre-line rounded-lg px-4 py-3 text-sm font-semibold ${
            message.type ===
            "success"
              ? "bg-emerald-100 text-emerald-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* PROGRESS */}

      {progress.total > 0 && (
        <div className="mt-4">

          <div className="h-2 overflow-hidden rounded-full bg-slate-100">

            <div
              className="h-2 bg-[#23205C] transition-all"
              style={{
                width: `${percentage}%`,
              }}
            />

          </div>

          <div className="mt-2 flex justify-between text-xs text-slate-600">

            <span>
              {progress.done}/
              {progress.total}
            </span>

            <span>
              OK {progress.ok}
            </span>

            <span>
              Fail {progress.fail}
            </span>

            <span>
              {percentage}%
            </span>

          </div>

          {progress.lastError && (
            <div className="mt-1 text-xs text-red-600">
              Last error:{" "}
              {progress.lastError}
            </div>
          )}

        </div>
      )}

      {/* INFO */}

      <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-600">

        <b className="text-slate-800">
          Important:
        </b>{" "}
        Backfill se bani attendance database me internal
        <b> MONTH_BACKFILL </b>
        action ke saath save hogi, lekin Attendance Sheet me
        <b> SCAN </b>
        source ke roop me dikhegi. Isse HR existing attendance
        workflow me usko manage kar sakta hai.

      </div>

    </div>
  );
}