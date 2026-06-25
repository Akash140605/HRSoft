import React, { useEffect, useMemo, useState } from "react";
import { HRProvider, useHR } from "./context/HRContext";
import ScannerPanel from "./components/ScannerPanel";
import EntryTable from "./components/EntryTable";
import EmployeeTracker from "./components/EmployeeTracker";
import RosterManager from "./components/RosterManager";
import HRLogsPanel from "./components/HRLogsPanel";
import HallManager from "./components/HallManager";
import LoginScreen from "./components/LoginScreen";
import HRTrainingRoute from "./pages/HRTrainingRoute";

function DashboardApp() {
  const { state, logout } = useHR();
  const [activeTab, setActiveTab] = useState("scanner");
  const [guestTrainingOpen, setGuestTrainingOpen] = useState(false);

  const role = state.currentRole || "GUEST";
  const showRoster = role === "HR" || role === "ADMIN";
  const showHRLogs = role === "ADMIN";
  const showTracker = role === "ADMIN";
  const showEntryTable = role === "HR" || role === "ADMIN";
  const showHallManager = role === "HR" || role === "ADMIN";
  const isGuest = role === "GUEST";

  useEffect(() => {
    if (isGuest) {
      setActiveTab("scanner");
    } else {
      setGuestTrainingOpen(false);
    }
  }, [isGuest]);

  const tabs = useMemo(() => {
    const base = [
      { key: "scanner", label: "Scanner" },
      { key: "training", label: "Training" },
    ];

    if (showEntryTable) base.push({ key: "entries", label: "Entries" });
    if (showRoster) base.push({ key: "roster", label: "Roster" });
    if (showHallManager) base.push({ key: "hall", label: "Hall" });
    if (showTracker) base.push({ key: "tracker", label: "Tracker" });
    if (showHRLogs) base.push({ key: "logs", label: "Logs" });

    return base;
  }, [showEntryTable, showHRLogs, showRoster, showTracker, showHallManager]);

  const renderTab = () => {
    switch (activeTab) {
      case "training":
        return (
          <div className="h-[calc(100dvh-7rem)] overflow-hidden">
            <HRTrainingRoute />
          </div>
        );
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
  };

  const handleLogout = async () => {
    setActiveTab("scanner");
    setGuestTrainingOpen(false);
    await logout();
  };

  if (isGuest && guestTrainingOpen) {
    return (
      <div className="flex min-h-dvh flex-col bg-slate-50 text-slate-900">
        <div className="sticky top-0 z-50 flex items-center justify-between border-b border-slate-200 bg-white px-2 py-2 shadow-sm">
          <img
            src="/logod.png"
            alt="Dixon"
            className="block h-8 w-auto max-w-[44vw] object-contain"
          />
          <button
            type="button"
            onClick={() => setGuestTrainingOpen(false)}
            className="rounded border-2 border-[#23205C] bg-[#23205C] px-3 py-1.5 text-xs font-semibold text-white"
          >
            Back
          </button>
        </div>

        <div className="flex-1 overflow-hidden">
          <HRTrainingRoute />
        </div>
      </div>
    );
  }

  if (isGuest) {
    return <LoginScreen onOpenTraining={() => setGuestTrainingOpen(true)} />;
  }

  return (
    <div className="flex min-h-dvh w-full flex-col overflow-x-hidden bg-slate-50 text-slate-900">
      <header className="fixed inset-x-0 top-0 z-50 w-full border-b border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-2 px-2 py-2">
          <img
            src="/logod.png"
            alt="Dixon"
            className="block h-8 w-auto max-w-[44vw] object-contain"
          />

          <button
            onClick={handleLogout}
            className="inline-flex shrink-0 items-center justify-center rounded border-2 border-[#E0222A] bg-[#E0222A] px-3 py-1.5 text-xs font-semibold text-white shadow-sm"
          >
            Logout
          </button>
        </div>

        <div className="border-t border-slate-200 bg-white px-2 py-2">
          <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => selectTab(tab.key)}
                className={`shrink-0 rounded border px-3 py-1.5 text-xs font-semibold transition ${
                  activeTab === tab.key
                    ? "border-[#23205C] bg-[#23205C] text-white"
                    : "border-slate-300 bg-white text-slate-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-2 pb-3 pt-[7.1rem]">
        <div className="grid  grid-cols-1 gap-3">{renderTab()}</div>
      </main>
    </div>
  );
}

export default function App() {
  return (
  
      <DashboardApp />
  
  );
}