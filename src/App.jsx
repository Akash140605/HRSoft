import React from 'react';
import { HRProvider } from './context/HRContext';
import ScannerPanel from './components/ScannerPanel';
import EntryTable from './components/EntryTable';
import EmployeeTracker from './components/EmployeeTracker';
import RosterManager from './components/RosterManager';
import HRLogsPanel from './components/HRLogsPanel';

export default function App() {
  return (
    <HRProvider>
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
          <div className="mb-6 border border-slate-200 bg-white px-5 py-6 shadow-sm">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Dixon Dehradun Attendance Dashboard
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Hall assignment, HR override, transfer, and tracker demo
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <ScannerPanel />
            <RosterManager />
            <EmployeeTracker />
            <EntryTable />
            <HRLogsPanel />
          </div>
        </div>
      </div>
    </HRProvider>
  );
}