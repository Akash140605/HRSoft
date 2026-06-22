import React from "react";
import { Building2, Download, RotateCcw, ShieldCheck, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useHR } from "../context/HRContext";
import { downloadTextFile, formatRosterCsv } from "../utils/helpers";

export default function Header() {
  const { state, resetAll, totals, logout, currentUser } = useHR();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="card overflow-hidden">
      <div className="border-b border-slate-200 bg-white px-5 py-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-none border border-brand-200 bg-brand-50 text-brand-700">
              <Building2 className="h-7 w-7" />
            </div>

            <div className="min-w-0">
              <div className="mb-2 inline-flex items-center gap-2 rounded-none border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                <ShieldCheck className="h-4 w-4" />
                Local first HR gate software
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                HR Gate Allocation System
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                4 hall configurable capacity, instant barcode/punch check, roster management,
                shift-based attendance, HR override power, and localStorage persistence.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              className="btn-secondary"
              onClick={() =>
                downloadTextFile(
                  "roster-template.csv",
                  formatRosterCsv(state.employees),
                  "text/csv;charset=utf-8;"
                )
              }
              type="button"
            >
              <Download className="h-4 w-4" />
              Export roster CSV
            </button>

            <button className="btn-secondary" onClick={resetAll} type="button">
              <RotateCcw className="h-4 w-4" />
              Full reset
            </button>

            <button className="btn-danger" onClick={handleLogout} type="button">
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 bg-slate-50 px-5 py-4 sm:grid-cols-4">
        <div className="rounded-none border border-slate-200 bg-white px-4 py-3">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Employees</div>
          <div className="mt-1 text-lg font-semibold text-slate-900">{state.employees.length}</div>
        </div>

        <div className="rounded-none border border-slate-200 bg-white px-4 py-3">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Today entries</div>
          <div className="mt-1 text-lg font-semibold text-slate-900">{state.entries.length}</div>
        </div>

        <div className="rounded-none border border-slate-200 bg-white px-4 py-3">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Halls</div>
          <div className="mt-1 text-lg font-semibold text-slate-900">{state.halls.length}</div>
        </div>

        <div className="rounded-none border border-slate-200 bg-white px-4 py-3">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Remaining seats</div>
          <div className="mt-1 text-lg font-semibold text-slate-900">{totals.remainingCount}</div>
        </div>
      </div>
    </header>
  );
}