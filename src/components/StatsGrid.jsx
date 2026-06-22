import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Users,
  Warehouse,
  ShieldAlert,
} from 'lucide-react';
import { useHR } from '../context/HRContext';

export default function StatsGrid() {
  const { totals, state, canOverride } = useHR();

  const items = [
    {
      title: 'Total selected',
      value: totals.selectedCount,
      helper: `Capacity ${totals.totalCapacity}`,
      icon: Users,
      tone: 'text-brand-700 bg-brand-50 border-brand-200',
    },
    {
      title: 'Remaining seats',
      value: totals.remainingCount,
      helper: 'Auto-lock on zero',
      icon: Warehouse,
      tone: 'text-blue-700 bg-blue-50 border-blue-200',
    },
    {
      title: 'Entry status',
      value: totals.locked ? 'Locked' : 'Open',
      helper: totals.locked ? 'No more scans allowed' : 'Scan running',
      icon: AlertTriangle,
      tone: totals.locked
        ? 'text-rose-700 bg-rose-50 border-rose-200'
        : 'text-emerald-700 bg-emerald-50 border-emerald-200',
    },
    {
      title: 'Eligibility engine',
      value: '6-day',
      helper: 'Week off + attendance check',
      icon: CheckCircle2,
      tone: 'text-violet-700 bg-violet-50 border-violet-200',
    },
    {
      title: 'Override power',
      value: canOverride ? 'Enabled' : 'Disabled',
      helper: `Role: ${String(state.currentUserRole || 'HR')}`,
      icon: ShieldAlert,
      tone: canOverride
        ? 'text-amber-700 bg-amber-50 border-amber-200'
        : 'text-slate-700 bg-slate-50 border-slate-200',
    },
  ];

  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
      {items.map((item) => {
        const Icon = item.icon;

        return (
          <div key={item.title} className="overflow-hidden border border-slate-200 bg-white shadow-xl">
            <div className="flex items-start justify-between gap-3 p-5">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {item.title}
                </p>
                <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                  {item.value}
                </p>
                <p className="mt-1 text-sm text-slate-500">{item.helper}</p>
              </div>

              <div className={`rounded-none border p-3 ${item.tone}`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}