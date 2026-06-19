import React, { useMemo } from 'react';
import { Plus, Trash2, Building2, Users2, CalendarRange } from 'lucide-react';
import { useHR } from '../context/HRContext';

const colorMap = {
  teal: 'bg-teal-500',
  blue: 'bg-blue-500',
  violet: 'bg-violet-500',
  amber: 'bg-amber-500',
  slate: 'bg-slate-500'
};

export default function HallManager() {
  const { hallSummary, updateHall, addHall, removeHall, SHIFT_OPTIONS, entriesForSelectedDate } = useHR();

  const shiftSummary = useMemo(() => {
    return SHIFT_OPTIONS.map((shift) => {
      const count = entriesForSelectedDate.filter((entry) => entry.shift === shift.code).length;
      return { ...shift, count };
    });
  }, [SHIFT_OPTIONS, entriesForSelectedDate]);

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-slate-200 bg-white px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Hall setup</h2>
            <p className="mt-1 text-sm text-slate-500">
              Yahan se hall capacity, occupancy aur shift-wise flow manage kar sakte ho.
            </p>
          </div>

          <button className="btn-primary" onClick={addHall} type="button">
            <Plus className="h-4 w-4" />
            Add hall
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 border-b border-slate-200 bg-slate-50 p-5 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-none border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-none border border-brand-200 bg-brand-50 p-2 text-brand-700">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total halls</div>
              <div className="text-xl font-bold text-slate-900">{hallSummary.length}</div>
            </div>
          </div>
        </div>

        <div className="rounded-none border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-none border border-emerald-200 bg-emerald-50 p-2 text-emerald-700">
              <Users2 className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Used seats</div>
              <div className="text-xl font-bold text-slate-900">
                {hallSummary.reduce((sum, hall) => sum + Number(hall.used || 0), 0)}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-none border border-slate-200 bg-white p-4">
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

       {shiftSummary.map((shift) => (
          <div key={shift.code} className="rounded-none border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{shift.label}</div>
            <div className="mt-1 text-xl font-bold text-slate-900">{shift.count}</div>
            <div className="text-xs text-slate-500">
              {shift.start} - {shift.end}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3 p-5">
        {hallSummary.length ? (
          hallSummary.map((hall, index) => {
            const capacity = Number(hall.capacity ?? 0);
            const used = Number(hall.used ?? 0);
            const percentage = capacity > 0 ? Math.min((used / capacity) * 100, 100) : 0;
            const hallName = hall.name || `Hall ${index + 1}`;

            return (
              <div key={hall.id} className="rounded-none border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-none border border-slate-200 bg-white text-slate-700">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{hallName}</div>
                    <div className="text-xs text-slate-500">Hall #{index + 1}</div>
                  </div>
                </div>

               <div className="grid grid-cols-1 gap-3 border-b border-slate-200 bg-slate-50 p-5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Hall name</label>
                    <input
                      value={hall.name}
                      onChange={(e) => updateHall(hall.id, { name: e.target.value })}
                      className="input"
                      placeholder="Hall name"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Capacity</label>
                    <input
                      type="number"
                      min="0"
                      value={hall.capacity}
                      onChange={(e) => updateHall(hall.id, { capacity: Number(e.target.value) })}
                      className="input"
                      placeholder="Capacity"
                    />
                  </div>

                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      {used} / {capacity}
                    </div>
                    <div className="text-xs text-slate-500">Used / Capacity</div>
                  </div>

                  <div className="flex lg:justify-end">
                    <button className="btn-danger" onClick={() => removeHall(hall.id)} type="button">
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </button>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                    <span>Occupancy</span>
                    <span>{Math.round(percentage)}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-none bg-slate-200">
                    <div
                      className={`h-full ${colorMap[hall.color] || 'bg-slate-500'}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-none border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            No halls added yet.
          </div>
        )}
      </div>
    </div>
  );
}