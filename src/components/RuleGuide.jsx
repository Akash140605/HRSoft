import React from 'react';

const rules = [
  {
    title: 'Roster lookup',
    description: 'When an employee code is scanned, the system first searches the roster.'
  },
  {
    title: 'Week-off check',
    description: 'If the employee is on week off for the current day, the request is rejected immediately.'
  },
  {
    title: 'Shift check',
    description: 'Employee ke assigned shift ke bahar punch aaya to request reject hoga. HR override sirf allowed role ke liye hoga.'
  },
  {
    title: 'Attendance validation',
    description: 'If the last 6 days are all marked as P, it means the employee worked continuously for 6 days, so the request is rejected.'
  },
  {
    title: 'Allowed attendance pattern',
    description: 'If at least one of the last 6 days is marked L, A, WO, or an override entry exists, the request is allowed.'
  },
  {
    title: 'Hall allocation',
    description: 'When allowed, the employee is automatically assigned to the next available hall.'
  },
  {
    title: 'HR override power',
    description: 'Agar system reject kare aur current role HR/ADMIN ho, to manual override karke entry save ki ja sakti hai.'
  },
  {
    title: 'Capacity limit',
    description: 'When all hall capacities are full, both scan entry and manual entry are disabled.'
  }
];

export default function RuleGuide() {
  return (
    <div className="card overflow-hidden">
      <div className="border-b border-slate-200 bg-white px-5 py-4">
        <h2 className="text-base font-semibold text-slate-900">Rule Engine Logic</h2>
        <p className="mt-1 text-sm text-slate-500">
          The system follows the checks below before allowing an employee entry.
        </p>
      </div>

      <div className="space-y-3 p-5">
        {rules.map((rule, index) => (
          <div key={rule.title} className="rounded-none border border-slate-200 bg-slate-50 p-4">
            <div className="mb-1 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-none bg-brand-700 text-xs font-semibold text-white">
                {index + 1}
              </span>
              <h3 className="text-sm font-semibold text-slate-900">{rule.title}</h3>
            </div>
            <p className="text-sm leading-6 text-slate-600">{rule.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}