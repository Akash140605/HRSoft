import React, { useEffect, useMemo, useState } from "react";
import { HRProvider, useHR } from "./context/HRContext";
import ScannerPanel from "./components/ScannerPanel";
import EntryTable from "./components/EntryTable";
import EmployeeTracker from "./components/EmployeeTracker";
import RosterManager from "./components/RosterManager";
import HRLogsPanel from "./components/HRLogsPanel";
import HallManager from "./components/HallManager";
import LoginScreen from "./components/LoginScreen";
import { Menu, X } from "lucide-react";

function DashboardApp() {
  const { state, logout } = useHR();
  const [activeTab, setActiveTab] = useState("scanner");
  const [tabsOpen, setTabsOpen] = useState(false);

  const showRoster = state.currentRole === "HR" || state.currentRole === "ADMIN";
  const showHRLogs = state.currentRole === "ADMIN";
  const showTracker = state.currentRole === "ADMIN";
  const showEntryTable = state.currentRole === "HR" || state.currentRole === "ADMIN";
  const showHallManager = state.currentRole === "HR" || state.currentRole === "ADMIN";
  const isGuest = state.currentRole === "GUEST";

  useEffect(() => {
    if (isGuest) {
      setActiveTab("scanner");
      setTabsOpen(false);
    }
  }, [isGuest]);

  const tabs = useMemo(() => {
    const base = [{ key: "scanner", label: "Scanner" }];
    if (showEntryTable) base.push({ key: "entries", label: "Entries" });
    if (showRoster) base.push({ key: "roster", label: "Roster" });
    if (showHallManager) base.push({ key: "hall", label: "Hall Manager" });
    if (showTracker) base.push({ key: "tracker", label: "Tracker" });
    if (showHRLogs) base.push({ key: "logs", label: "HR Logs" });
    return base;
  }, [showEntryTable, showHallManager, showHRLogs, showRoster, showTracker]);

  const renderTab = () => {
    switch (activeTab) {
      case "entries":
        return showEntryTable ? <EntryTable /> : <ScannerPanel />;
      case "roster":
        return showRoster ? <RosterManager /> : <ScannerPanel />;
      case "hall":
        return showHallManager ? <HallManager /> : <ScannerPanel />;
      case "tracker":
        return showTracker ? <EmployeeTracker /> : <ScannerPanel />;
      case "logs":
        return showHRLogs ? <HRLogsPanel /> : <ScannerPanel />;
      case "scanner":
      default:
        return <ScannerPanel />;
    }
  };

  const selectTab = (key) => {
    setActiveTab(key);
    setTabsOpen(false);
  };

  const handleLogout = () => {
    setTabsOpen(false);
    setActiveTab("scanner");
    logout();
  };

  if (isGuest) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden overflow-y-auto">
      <header className="fixed top-0 left-0 right-0 z-50 w-full border-b border-slate-200 bg-white shadow-sm">
        <div className="flex w-full items-center justify-between px-4 py-3 md:px-6 box-border">
          <img
            src="/logod.png"
            alt="Dixon"
            className="block h-9 w-auto max-w-[55vw] object-contain sm:h-10 md:h-12"
          />

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="md:hidden inline-flex items-center justify-center border-2 border-slate-300 bg-white px-3 py-2 text-slate-700"
              onClick={() => setTabsOpen((v) => !v)}
            >
              {tabsOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            <button
              onClick={handleLogout}
              className="shrink-0 inline-flex items-center justify-center border-2 border-[#E0222A] bg-[#E0222A] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#E0222A]/25 transition hover:scale-[1.02] hover:shadow-[#E0222A]/30 active:scale-[0.98]"
            >
              Logout
            </button>
          </div>
        </div>

        <div
          className={`border-t border-slate-200 bg-white px-4 md:px-6 ${tabsOpen ? "block" : "hidden"} md:block`}
        >
          <div className="flex flex-col gap-5 py-4 md:flex-row md:flex-wrap md:items-center">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => selectTab(tab.key)}
                className={`w-full md:w-auto px-4 py-2 text-sm font-semibold transition border-2 ${
                  activeTab === tab.key
                    ? "border-[#23205C] bg-[#23205C] text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="w-full px-4 py-6 md:px-6 pt-24 md:pt-40">
        <div className="grid grid-cols-1 gap-6">{renderTab()}</div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <HRProvider>
      <DashboardApp />
    </HRProvider>
  );
}