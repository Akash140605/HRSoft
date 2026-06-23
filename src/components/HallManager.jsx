import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  Users2,
  CalendarRange,
  ChevronDown,
  ChevronUp,
  Palette,
  Loader2,
} from "lucide-react";
import { useHR } from "../context/HRContext";
import hrApi from "../api/hrApi";

const colorMap = {
  teal: "bg-teal-500",
  blue: "bg-blue-500",
  violet: "bg-violet-500",
  amber: "bg-amber-500",
  slate: "bg-slate-500",
};

const accentMap = {
  teal: { ring: "ring-teal-500/20", border: "border-teal-500", soft: "bg-teal-50 text-teal-700" },
  blue: { ring: "ring-[#23205C]/15", border: "border-[#23205C]", soft: "bg-[#23205C]/5 text-[#23205C]" },
  violet: { ring: "ring-violet-500/20", border: "border-violet-500", soft: "bg-violet-50 text-violet-700" },
  amber: { ring: "ring-amber-500/20", border: "border-amber-500", soft: "bg-amber-50 text-amber-700" },
  slate: { ring: "ring-slate-400/20", border: "border-slate-500", soft: "bg-slate-100 text-slate-700" },
};

const normalizeHall = (hall) => ({
  ...hall,
  id: hall.id,
  name: hall.name || "",
  capacity: Number(hall.capacity || 0),
  color: hall.color || "blue",
});

export default function HallManager() {
  const { state, setState, hallUsage, SHIFT_OPTIONS, activeEntries } = useHR();

  const [openHallId, setOpenHallId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchHalls = useCallback(async () => {
    setLoading(true);
    try {
      const res = await hrApi.getHalls();
      if (res.success) {
        setState((prev) => ({
          ...prev,
          halls: Array.isArray(res.data) ? res.data.map(normalizeHall) : [],
        }));
      }
    } finally {
      setLoading(false);
    }
  }, [setState]);

  useEffect(() => {
    fetchHalls();
  }, [fetchHalls, refreshKey]);

  const hallSummary = useMemo(() => {
    const rosterCountMap = new Map();
    (state.employees || []).forEach((e) => {
      const key = String(e.hallId || e.hall_id || "");
      rosterCountMap.set(key, (rosterCountMap.get(key) || 0) + 1);
    });

    const usageMap = new Map((hallUsage || []).map((h) => [String(h.id), h]));

    return (state.halls || []).map((h) => {
      const rosterAssigned = rosterCountMap.get(String(h.id)) || 0;
      const usage = usageMap.get(String(h.id)) || {};
      return {
        ...h,
        ...usage,
        rosterAssigned,
        effectiveCapacity: Math.max(Number(h.capacity || 0), rosterAssigned),
      };
    });
  }, [hallUsage, state.halls, state.employees]);

  const entriesForSelectedDate = activeEntries || [];

  const shiftSummary = useMemo(() => {
    return SHIFT_OPTIONS.map((shift) => {
      const count = entriesForSelectedDate.filter((entry) => entry.shift === shift.code).length;
      return { ...shift, count };
    });
  }, [SHIFT_OPTIONS, entriesForSelectedDate]);

  const hallShiftBreakdown = useMemo(() => {
    return hallSummary.map((hall) => {
      const counts = {};
      SHIFT_OPTIONS.forEach((s) => {
        counts[s.code] = entriesForSelectedDate.filter(
          (e) => String(e.hallId || e.hall_id) === String(hall.id) && e.shift === s.code
        ).length;
      });
      return { hallId: hall.id, counts };
    });
  }, [hallSummary, SHIFT_OPTIONS, entriesForSelectedDate]);

  const totalUsed = hallSummary.reduce((sum, hall) => sum + Number(hall.used || 0), 0);
  const totalCapacity = hallSummary.reduce(
    (sum, hall) => sum + Number(hall.effectiveCapacity || hall.capacity || 0),
    0
  );
  const totalOccupancy = totalCapacity > 0 ? Math.round((totalUsed / totalCapacity) * 100) : 0;

  const handleToggle = (hallId) => {
    setOpenHallId((prev) => (prev === hallId ? null : hallId));
  };

  const updateHall = async (hallId, updates) => {
    const current = state.halls.find((h) => String(h.id) === String(hallId));
    const prevHall = current ? { ...current } : null;

    setState((prev) => ({
      ...prev,
      halls: prev.halls.map((h) => (String(h.id) === String(hallId) ? { ...h, ...updates } : h)),
    }));

    setLoading(true);
    try {
      const payload = {
        name: updates.name ?? current?.name ?? "",
        capacity: updates.capacity ?? current?.capacity ?? 0,
        color: updates.color ?? current?.color ?? "blue",
      };

      const res = await hrApi.updateHall(hallId, payload);
      if (res.success) {
        setRefreshKey((k) => k + 1);
      } else {
        if (prevHall) {
          setState((prev) => ({
            ...prev,
            halls: prev.halls.map((h) => (String(h.id) === String(hallId) ? prevHall : h)),
          }));
        }
        alert(res.error || "Hall update failed");
      }
    } catch (error) {
      if (prevHall) {
        setState((prev) => ({
          ...prev,
          halls: prev.halls.map((h) => (String(h.id) === String(hallId) ? prevHall : h)),
        }));
      }
      alert(error.message || "Hall update failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="overflow-hidden border-2 border-slate-200 bg-white shadow-xl">
      <div className="border-b border-slate-200 bg-gradient-to-r from-[#23205C] to-[#E0222A] px-5 py-4 text-white">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-white/90">
              <Building2 className="h-3.5 w-3.5" />
              Hall setup
            </div>
            <h2 className="mt-3 text-xl font-black tracking-tight sm:text-2xl">Hall Manager</h2>
            <p className="mt-2 max-w-2xl text-sm text-white/80">
              Roster-based hall capacity, live occupancy, and shift-wise breakdown.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 border-b border-slate-200 bg-slate-50 p-5 sm:grid-cols-2 xl:grid-cols-5">
        <div className="border-2 border-[#23205C]/10 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-none border border-[#23205C]/10 bg-[#23205C]/5 p-2 text-[#23205C]">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total halls</div>
              <div className="text-xl font-bold text-slate-900">{hallSummary.length}</div>
            </div>
          </div>
        </div>

        <div className="border-2 border-emerald-500/10 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-none border border-emerald-200 bg-emerald-50 p-2 text-emerald-700">
              <Users2 className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Used seats</div>
              <div className="text-xl font-bold text-slate-900">{totalUsed}</div>
            </div>
          </div>
        </div>

        <div className="border-2 border-amber-500/10 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-none border border-amber-200 bg-amber-50 p-2 text-amber-700">
              <CalendarRange className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Selected date</div>
              <div className="text-xl font-bold text-slate-900">Today</div>
            </div>
          </div>
        </div>

        <div className="border-2 border-[#E0222A]/10 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-none border border-[#E0222A]/20 bg-[#E0222A]/5 p-2 text-[#E0222A]">
              <Palette className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Theme</div>
              <div className="text-xl font-bold text-slate-900">Dual tone</div>
            </div>
          </div>
        </div>

        <div className="border-2 border-[#23205C]/10 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Occupancy</div>
          <div className="mt-1 text-xl font-bold text-slate-900">{totalOccupancy}%</div>
          <div className="mt-2 h-2 overflow-hidden bg-slate-200">
            <div className="h-full bg-[#23205C]" style={{ width: `${totalOccupancy}%` }} />
          </div>
        </div>
      </div>

      <div className="max-h-[78vh] overflow-y-auto p-5">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {shiftSummary.map((shift) => (
              <div key={shift.code} className="border-2 border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{shift.label}</div>
                <div className="mt-1 text-xl font-bold text-slate-900">{shift.count}</div>
                <div className="text-xs text-slate-500">
                  {shift.start} - {shift.end}
                </div>
              </div>
            ))}
          </div>

          {hallSummary.length ? (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {hallSummary.map((hall, index) => {
                const capacity = Number(hall.capacity ?? 0);
                const used = Number(hall.used ?? 0);
                const rosterAssigned = Number(hall.rosterAssigned ?? 0);
                const effectiveCapacity = Number(hall.effectiveCapacity ?? capacity);
                const percentage = effectiveCapacity > 0 ? Math.min((used / effectiveCapacity) * 100, 100) : 0;
                const hallName = hall.name || `Hall ${index + 1}`;
                const isOpen = openHallId === hall.id;
                const accent = accentMap[hall.color] || accentMap.blue;
                const styleClass = isOpen ? `${accent.border} ${accent.ring} shadow-lg` : "border-slate-200 shadow-sm";
                const shiftBreakdown = hallShiftBreakdown.find((x) => String(x.hallId) === String(hall.id))?.counts || {};

                return (
                  <div key={hall.id} className={`overflow-hidden border-2 bg-white transition ${styleClass}`}>
                    <button type="button" onClick={() => handleToggle(hall.id)} className="w-full text-left">
                      <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-white to-slate-50 px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center border-2 border-[#23205C]/10 bg-[#23205C]/5 text-[#23205C]">
                            <Building2 className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-base font-bold text-slate-900">{hallName}</h3>
                              <span className={`px-2 py-0.5 text-xs font-semibold ${accent.soft}`}>
                                Hall #{index + 1}
                              </span>
                            </div>
                            <div className="mt-1 text-xs text-slate-500">Click to manage hall details</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-slate-600">
                          <div className="text-right">
                            <div className="text-sm font-bold text-slate-900">
                              Used {used} / {effectiveCapacity}
                            </div>
                            <div className="text-xs text-slate-500">Roster {rosterAssigned} assigned</div>
                          </div>
                          {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                        </div>
                      </div>
                    </button>

                    <div className="px-4 pb-4">
                      <div className="mb-3">
                        <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                          <span>Occupancy</span>
                          <span>{Math.round(percentage)}%</span>
                        </div>
                        <div className="h-2 overflow-hidden bg-slate-200">
                          <div
                            className={`h-full ${colorMap[hall.color] || "bg-[#23205C]"}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>

                      <div className="mb-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                        {SHIFT_OPTIONS.map((shift) => (
                          <div key={shift.code} className="border border-slate-200 bg-slate-50 px-2 py-2 text-center">
                            <div className="font-semibold text-slate-700">{shift.code}</div>
                            <div className="text-slate-500">{shiftBreakdown[shift.code] || 0}</div>
                          </div>
                        ))}
                      </div>

                      {isOpen && (
                        <div className="mt-4 grid grid-cols-1 gap-4 border-t border-slate-200 pt-4 sm:grid-cols-3 xl:grid-cols-4">
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-600">Hall name</label>
                            <input
                              value={hall.name || ""}
                              onChange={(e) => updateHall(hall.id, { name: e.target.value })}
                              className="w-full border-2 border-slate-200 bg-white px-3 py-2 outline-none focus:border-[#23205C]"
                              placeholder="Hall name"
                              disabled={loading}
                            />
                          </div>

                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-600">Base capacity</label>
                            <input
                              type="number"
                              min="0"
                              value={hall.capacity ?? 0}
                              onChange={(e) => updateHall(hall.id, { capacity: Number(e.target.value) })}
                              className="w-full border-2 border-slate-200 bg-white px-3 py-2 outline-none focus:border-[#23205C]"
                              placeholder="Capacity"
                              disabled={loading}
                            />
                          </div>

                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-600">Color</label>
                            <select
                              value={hall.color || "blue"}
                              onChange={(e) => updateHall(hall.id, { color: e.target.value })}
                              className="w-full border-2 border-slate-200 bg-white px-3 py-2 outline-none focus:border-[#23205C]"
                              disabled={loading}
                            >
                              {Object.keys(colorMap).map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="flex items-end">
                            <div className={`w-full border-2 px-4 py-2 text-center text-sm font-semibold ${accent.soft}`}>
                              Editable fields
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
              No halls added yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}