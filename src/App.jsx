import React, { useEffect, useMemo, useState } from "react";
import {
  ScanBarcode,
  GraduationCap,
  ClipboardList,
  Users2,
  Warehouse,
  Activity,
  FileClock,
  LogOut,
  ArrowLeft,
  CalendarPlus,
} from "lucide-react";
import { HRProvider, useHR } from "./context/HRContext";
import ScannerPanel from "./components/ScannerPanel";
import EntryTable from "./components/EntryTable";
import EmployeeTracker from "./components/EmployeeTracker";
import RosterManager from "./components/RosterManager";
import HRLogsPanel from "./components/HRLogsPanel";
import HallManager from "./components/HallManager";
import LoginScreen from "./components/LoginScreen";
import MonthBackfill from "./components/MonthBackfill";
import HRTrainingRoute from "./pages/HRTrainingRoute";

const TAB_ICON = {
  scanner: ScanBarcode,
  training: GraduationCap,
  entries: ClipboardList,
  roster: Users2,
  hall: Warehouse,
  backfill: CalendarPlus,
  tracker: Activity,
  logs: FileClock,
};

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
  const showBackfill =  role === "ADMIN";
  const isGuest = role === "GUEST";

  const tabs = useMemo(() => {
    const base = [
      { key: "scanner", label: "Scanner" },
      { key: "training", label: "Training" },
    ];

    if (showEntryTable) base.push({ key: "entries", label: "Entries" });
    if (showRoster) base.push({ key: "roster", label: "Roster" });
    if (showHallManager) base.push({ key: "hall", label: "Hall" });
    if (showBackfill) base.push({ key: "backfill", label: "Backfill" });
    if (showTracker) base.push({ key: "tracker", label: "Tracker" });
    if (showHRLogs) base.push({ key: "logs", label: "Logs" });

    return base;
  }, [showEntryTable, showHRLogs, showRoster, showTracker, showHallManager, showBackfill]);

  useEffect(() => {
    if (isGuest) {
      setActiveTab("scanner");
    } else {
      setGuestTrainingOpen(false);
    }
  }, [isGuest]);

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
      case "backfill":
        return showBackfill ? <MonthBackfill /> : <ScannerPanel />;
      case "tracker":
        return showTracker ? <EmployeeTracker /> : <ScannerPanel />;
      case "logs":
        return showHRLogs ? <HRLogsPanel /> : <ScannerPanel />;
      case "scanner":
      default:
        return <ScannerPanel />;
    }
  };

  const selectTab = (key) => setActiveTab(key);

  const handleLogout = async () => {
    setActiveTab("scanner");
    setGuestTrainingOpen(false);
    await logout();
  };

  if (isGuest && guestTrainingOpen) {
    return (
      <div className="flex min-h-dvh flex-col bg-slate-50 text-slate-900">
        <div className="sticky top-0 z-50 flex items-center justify-between border-b border-slate-200 bg-white px-3 py-2 shadow-sm">
          <img src="/logod.png" alt="Dixon" className="block h-8 w-auto max-w-[44vw] object-contain" />
          <button
            type="button"
            onClick={() => setGuestTrainingOpen(false)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#23205C] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#1a1847]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
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
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <img src="/logod.png" alt="Dixon" className="block h-8 w-auto max-w-[40vw] object-contain" />

          <div className="flex items-center gap-2">
            <span className="hidden rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 sm:inline-block">
              {role}
            </span>
            <button
              onClick={handleLogout}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#E0222A] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#c01d24]"
            >
              <LogOut className="h-3.5 w-3.5" />
              Logout
            </button>
          </div>
        </div>

        <div className="border-t border-slate-200 bg-white px-2 py-2">
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {tabs.map((tab) => {
              const Icon = TAB_ICON[tab.key];
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => selectTab(tab.key)}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    active
                      ? "bg-[#23205C] text-white shadow-sm"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {Icon && <Icon className="h-3.5 w-3.5" />}
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-2 pb-3 pt-[7.1rem]">
        <div className="grid grid-cols-1 gap-3">{renderTab()}</div>
      </main>
    </div>
  );
}

export default function App() {
  return <DashboardApp />;
}