import React, { useState } from 'react';
import { HRProvider, useHR } from './context/HRContext';
import ScannerPanel from './components/ScannerPanel';
import RosterManager from './components/RosterManager';
import EmployeeTracker from './components/EmployeeTracker';
import EntryTable from './components/EntryTable';
import HallManager from './components/HallManager';
import OverrideModal from './components/OverrideModal';

function DashboardShell() {
  const { state, setCurrentUserRole, canOverride } = useHR();
  const [activeTab, setActiveTab] = useState('scanner');
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideEmployee, setOverrideEmployee] = useState(null);

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="border-b border-slate-200 bg-white px-5 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">HR Gate System</h1>
            <p className="text-sm text-slate-500">
              Shift, hall, attendance aur HR override one dashboard.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              className="input min-w-[160px]"
              value={state.currentUserRole}
              onChange={(e) => setCurrentUserRole(e.target.value)}
            >
              <option value="HR">HR</option>
              <option value="ADMIN">ADMIN</option>
              <option value="USER">USER</option>
            </select>

            <div className="text-sm text-slate-500">
              Override access: <span className="font-semibold text-slate-900">{canOverride ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {[
            ['scanner', 'Scanner'],
            ['roster', 'Roster'],
            ['tracker', 'Tracker'],
            ['attendance', 'Attendance'],
            ['halls', 'Halls']
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`btn-secondary ${activeTab === key ? 'border-brand-600 bg-brand-50 text-brand-700' : ''}`}
              onClick={() => setActiveTab(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-7xl p-5">
        {activeTab === 'scanner' && <ScannerPanel />}
        {activeTab === 'roster' && <RosterManager />}
        {activeTab === 'tracker' && <EmployeeTracker />}
        {activeTab === 'attendance' && <EntryTable />}
        {activeTab === 'halls' && <HallManager />}
      </div>

      <OverrideModal
        open={overrideOpen}
        employee={overrideEmployee}
        onClose={() => {
          setOverrideOpen(false);
          setOverrideEmployee(null);
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <HRProvider>
      <DashboardShell />
    </HRProvider>
  );
}