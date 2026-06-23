// src/pages/HRTrainingRoute.jsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Activity,
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Database,
  Eye,
  EyeOff,
  FileCheck2,
  Keyboard,
  LayoutDashboard,
  LogOut,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Users2,
  Home,
  Loader2,
} from "lucide-react";

const AUTO_SLIDE_MS = 14000;
const TYPE_SPEED_FAST = 20;
const TYPE_SPEED_SLOW = 42;
const TYPE_DELAY = 90;
const LOGIN_DELAY = 1200;

const roleAccess = {
  USER: {
    id: "user1",
    password: "user123",
    title: "User Login",
    subtitle: "Self attendance access",
    afterTitle: "User ke baad kya dikhega",
    afterDesc:
      "User login ke baad sirf self scanner, attendance verify button, aur basic status panels dikhenge. Roster, hall manager, aur admin level controls hide rahenge.",
    modules: ["Self Scanner", "My Attendance", "Basic Status"],
    badge: "Limited Access",
    color: "border-slate-300 bg-white text-slate-800",
    accent: "from-slate-900 via-slate-800 to-slate-700",
  },
  HR: {
    id: "hr1",
    password: "hr123",
    title: "HR Login",
    subtitle: "Attendance entries roster hall control",
    afterTitle: "HR ke baad kya dikhega",
    afterDesc:
      "HR login ke baad scanner panel, attendance entries, roster manager, aur hall manager visible honge. HR employee hall transfer aur roster mapping handle karega.",
    modules: ["Scanner", "Entries", "Roster", "Hall Manager"],
    badge: "Operational Access",
    color: "border-[#23205C] bg-[#23205C] text-white",
    accent: "from-[#23205C] via-[#342f73] to-[#E0222A]",
  },
  ADMIN: {
    id: "admin1",
    password: "admin123",
    title: "Admin Login",
    subtitle: "Full access and master visibility",
    afterTitle: "Admin ke baad kya dikhega",
    afterDesc:
      "Admin login ke baad full module visibility, hall summary, role overview, roster data, attendance insight, aur system level control cards dikhenge.",
    modules: [
      "Scanner",
      "Entries",
      "Roster",
      "Hall",
      "Role Summary",
      "System Control",
    ],
    badge: "Full Access",
    color: "border-[#E0222A] bg-white text-[#E0222A]",
    accent: "from-[#E0222A] via-[#ff5470] to-[#23205C]",
  },
  EVAPS: {
    id: "evaps1",
    password: "evaps123",
    title: "EVAPS Login",
    subtitle: "Visitor, approval, and workflow access",
    afterTitle: "EVAPS ke baad kya dikhega",
    afterDesc:
      "EVAPS login ke baad approval cards, visitor tracking, status checks, aur workflow timeline dikhega. Ye flow intentionally simpler aur guided hai.",
    modules: ["Approvals", "Visitor Flow", "Status", "Timeline"],
    badge: "Workflow Access",
    color: "border-emerald-300 bg-white text-emerald-700",
    accent: "from-emerald-700 via-teal-600 to-slate-900",
  },
};

const steps = [
  { title: "Login Access", tab: "login", icon: ShieldCheck },
  { title: "User View", tab: "user", icon: ScanLine },
  { title: "HR Entries", tab: "hrEntries", icon: FileCheck2 },
  { title: "HR Roster", tab: "hrRoster", icon: Users2 },
  { title: "Admin Summary", tab: "admin", icon: Building2 },
  { title: "EVAPS Flow", tab: "evaps", icon: Activity },
];

const rosterRows = [
  ["MOHNI SONI", "499561", "OPERATOR", "Hall 2", "AA", "Sunday"],
  ["DIVYANSHU", "499567", "OPERATOR", "Hall 2", "AA", "Thursday"],
  ["RAJKUMAR", "499576", "OPERATOR", "Hall 2", "AA", "Wednesday"],
  ["VISHAL", "499565", "OPERATOR", "Hall 2", "AA", "Tuesday"],
];

const entryRows = [
  ["2026-06-22", "0916", "499561", "MOHNI SONI", "AA", "Hall 4", "HR"],
  ["2026-06-22", "0812", "492290", "VISWA KUMARI", "B", "Hall 4", "HR"],
  ["2026-06-22", "0810", "491792", "PRIYANKA", "A", "Hall 2", "HR"],
  ["2026-06-22", "0808", "495091", "MOHIT", "B", "Hall 3", "HR"],
];

const hallCards = [
  { name: "Hall 1", used: 3, total: 88, shift: "A1 B2 C0" },
  { name: "Hall 2", used: 9, total: 145, shift: "A1 AA0 BB8" },
  { name: "Hall 3", used: 1, total: 71, shift: "A0 B1 C0" },
  { name: "Hall 4", used: 6, total: 85, shift: "A0 B4 AA1 BB1" },
];

const cx = (...classes) => classes.filter(Boolean).join(" ");

function TypewriterText({
  text,
  speed = TYPE_SPEED_FAST,
  delay = 0,
  className = "",
  as: Tag = "div",
}) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    let timeoutId;
    let tickId;
    let index = 0;
    setDisplayed("");
    timeoutId = window.setTimeout(() => {
      const tick = () => {
        index += 1;
        setDisplayed(text.slice(0, index));
        if (index < text.length) tickId = window.setTimeout(tick, speed);
      };
      tick();
    }, delay);
    return () => {
      clearTimeout(timeoutId);
      clearTimeout(tickId);
    };
  }, [text, speed, delay]);
  return <Tag className={className}>{displayed}</Tag>;
}

function StatCard({ label, value, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
          {label}
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-700">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-2 text-2xl font-black tracking-tight text-slate-900">
        {value}
      </div>
    </div>
  );
}

function MiniBadge({ children, active = false }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold",
        active
          ? "border-[#23205C] bg-[#23205C] text-white"
          : "border-slate-200 bg-white text-slate-700"
      )}
    >
      {children}
    </span>
  );
}

function AnimatedMascot({ role = "HR" }) {
  const face =
    role === "ADMIN" ? "🤖" : role === "EVAPS" ? "🧭" : role === "USER" ? "👟" : "🧑‍💼";
  const bg =
    role === "ADMIN"
      ? "from-[#E0222A] to-[#23205C]"
      : role === "EVAPS"
      ? "from-emerald-700 to-slate-900"
      : role === "USER"
      ? "from-slate-900 to-slate-700"
      : "from-[#23205C] to-[#E0222A]";
  return (
    <div
      className={`relative mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br shadow-lg ${bg} animate-[float_2.8s_ease-in-out_infinite]`}
    >
      <div className="absolute inset-2 rounded-full bg-white/15 backdrop-blur-sm" />
      <div className="absolute bottom-2 left-3 h-3 w-3 rounded-full bg-white/90" />
      <div className="absolute bottom-2 right-3 h-3 w-3 rounded-full bg-white/90" />
      <div className="absolute top-3 h-3 w-3 rounded-full bg-white/80" />
      <div className="relative text-5xl drop-shadow">{face}</div>
    </div>
  );
}

function RolePreview({ role }) {
  const info = roleAccess[role];
  return (
    <div className="overflow-hidden rounded-3xl border-2 border-slate-200 bg-white shadow-sm">
      <div className={`bg-gradient-to-r px-5 py-4 text-white ${info.accent}`}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/70">
              After login preview
            </div>
            <div className="mt-1 text-xl font-black">{info.afterTitle}</div>
          </div>
          <div
            className={`rounded-full border border-white/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${info.color}`}
          >
            {info.badge}
          </div>
        </div>
      </div>
      <div className="p-5">
        <p className="text-sm leading-6 text-slate-600">{info.afterDesc}</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {info.modules.map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-700"
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ConsoleLine({ text, tone = "default" }) {
  return (
    <div
      className={cx(
        "flex items-start gap-2 text-[12px] leading-5 md:text-[13px]",
        tone === "success"
          ? "text-emerald-400"
          : tone === "error"
          ? "text-red-400"
          : tone === "muted"
          ? "text-slate-400"
          : "text-slate-100"
      )}
    >
      <span className="mt-[2px] shrink-0 text-slate-500">&gt;</span>
      <span>{text}</span>
    </div>
  );
}

function ConsoleWindow({ title, lines }) {
  const endRef = useRef(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 shadow-sm">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-[10px] uppercase tracking-[0.26em] text-slate-300">
        <span>{title}</span>
        <span className="text-emerald-400">LIVE</span>
      </div>
      <div className="h-[255px] overflow-auto p-4 font-mono text-[12px] leading-5 text-slate-100 md:h-[320px]">
        {lines.map((line) => (
          <ConsoleLine key={line.id} text={line.text} tone={line.tone} />
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}

function UserDashboard() {
  return (
    <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Role" value="User" icon={Users2} />
          <StatCard label="Access" value="Self" icon={ShieldCheck} />
          <StatCard label="Panel" value="Scan" icon={ScanLine} />
        </div>
        <div className="overflow-hidden rounded-3xl border-2 border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
            User scanner panel
          </div>
          <h3 className="mt-2 text-2xl font-black text-slate-900">
            Self Attendance Screen
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            User login ke baad employee apna code enter karega, verify button
            dekhega, aur apni last attendance status check karega.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input
              defaultValue="491676"
              className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#23205C] focus:ring-4 focus:ring-[#23205C]/10"
            />
            <button className="inline-flex items-center justify-center rounded-2xl bg-[#23205C] px-4 py-3 text-sm font-bold text-white transition hover:scale-[1.01] hover:bg-[#2f2a71]">
              Verify Attendance
            </button>
          </div>
        </div>
      </div>
      <div className="overflow-hidden rounded-3xl border-2 border-slate-200 bg-white p-5 shadow-sm">
        <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
          User ko kya dikhega
        </div>
        <div className="mt-3 space-y-3">
          {["Self Scanner", "My Attendance Status", "Basic Access Only"].map(
            (x) => (
              <div
                key={x}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700"
              >
                {x}
              </div>
            )
          )}
        </div>
        <div className="mt-5">
          <AnimatedMascot role="USER" />
        </div>
      </div>
    </div>
  );
}
function HREntriesDashboard() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard label="Rows" value="19" icon={FileCheck2} />
        <StatCard label="Halls" value="4" icon={Building2} />
        <StatCard label="Moves" value="16" icon={Activity} />
        <StatCard label="Role" value="HR" icon={ShieldCheck} />
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="overflow-hidden rounded-3xl border-2 border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
            Scanner visible after HR login
          </div>
          <div className="mt-2 text-lg font-black text-slate-900">
            HR Scanner
          </div>
          <div className="mt-4 flex items-center justify-center">
            <AnimatedMascot role="HR" />
          </div>
          <div className="mt-4 grid gap-2">
            <input
              defaultValue="491676"
              className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#23205C] focus:ring-4 focus:ring-[#23205C]/10"
            />
            <button className="rounded-2xl bg-[#23205C] px-4 py-3 text-sm font-bold text-white transition hover:scale-[1.01]">
              Verify Save
            </button>
          </div>
        </div>
        <div className="overflow-hidden rounded-3xl border-2 border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
            Entries visible after HR login
          </div>
          <div className="mt-3 space-y-2">
            {entryRows.slice(0, 3).map((r) => (
              <div
                key={r.join("-")}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700"
              >
                {r.join(" | ")}
              </div>
            ))}
          </div>
        </div>
        <div className="overflow-hidden rounded-3xl border-2 border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
            Hall move visible after HR login
          </div>
          <div className="mt-3 grid gap-2">
            <input
              placeholder="Employee code"
              className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#E0222A] focus:ring-4 focus:ring-[#E0222A]/10"
            />
            <select className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#E0222A] focus:ring-4 focus:ring-[#E0222A]/10">
              <option>Hall 1</option>
              <option>Hall 2</option>
              <option>Hall 3</option>
              <option>Hall 4</option>
            </select>
            <button className="rounded-2xl bg-[#E0222A] px-4 py-3 text-sm font-bold text-white transition hover:scale-[1.01]">
              Move Hall
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function HRRosterDashboard() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard label="Employees" value="389" icon={Users2} />
        <StatCard label="Mapped" value="4 Hall" icon={Building2} />
        <StatCard label="Mode" value="Roster" icon={Database} />
        <StatCard label="Access" value="HR" icon={ShieldCheck} />
      </div>
      <div className="overflow-hidden rounded-3xl border-2 border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
              Roster visible after HR login
            </div>
            <div className="mt-1 text-lg font-black text-slate-900">
              Roster Manager
            </div>
          </div>
          <div className="flex gap-2">
            <button className="rounded-xl border border-slate-300 px-3 py-2 text-xs transition hover:bg-slate-50">
              CSV
            </button>
            <button className="rounded-xl border border-slate-300 px-3 py-2 text-xs transition hover:bg-slate-50">
              Excel
            </button>
          </div>
        </div>
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
          <table className="min-w-full text-left text-xs">
            <thead>
              <tr className="border-b bg-slate-50 text-slate-500">
                {["Name", "Code", "Designation", "Hall", "Shift", "Week Off"].map(
                  (h) => (
                    <th key={h} className="px-3 py-3">
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {rosterRows.map((r) => (
                <tr key={r[1]} className="border-b last:border-0">
                  {r.map((cell, i) => (
                    <td
                      key={i}
                      className={cx("px-3 py-3", i === 0 && "font-semibold")}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AdminDashboard() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard label="Role" value="Admin" icon={ShieldCheck} />
        <StatCard label="Modules" value="6" icon={LayoutDashboard} />
        <StatCard label="Users" value="389" icon={Users2} />
        <StatCard label="Halls" value="4" icon={Building2} />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="overflow-hidden rounded-3xl border-2 border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
            Admin ko kya dikhega
          </div>
          <div className="mt-2 text-lg font-black text-slate-900">
            All role summaries and modules
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {[
              "Scanner",
              "Entries",
              "Roster",
              "Hall Manager",
              "Role Visibility",
              "System Summary",
            ].map((x) => (
              <div
                key={x}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-700"
              >
                {x}
              </div>
            ))}
          </div>
          <div className="mt-5 flex items-center justify-center">
            <AnimatedMascot role="ADMIN" />
          </div>
        </div>
        <div className="overflow-hidden rounded-3xl border-2 border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
            Hall summary visible after Admin login
          </div>
          <div className="mt-3 space-y-2">
            {hallCards.map((h) => (
              <div
                key={h.name}
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
              >
                <span className="font-semibold">{h.name}</span>
                <span>
                  {h.used}/{h.total}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function EVAPSFlow() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard label="Mode" value="EVAPS" icon={Activity} />
        <StatCard label="Tasks" value="4" icon={FileCheck2} />
        <StatCard label="Status" value="Live" icon={CheckCircle2} />
        <StatCard label="Flow" value="Guided" icon={Keyboard} />
      </div>
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="overflow-hidden rounded-3xl border-2 border-emerald-200 bg-white p-5 shadow-sm">
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-600">
            EVAPS option added
          </div>
          <h3 className="mt-2 text-2xl font-black text-slate-900">
            Approval and visitor workflow
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Yahan approvals, visitor tracking, aur status timeline clean animated
            cards ke through show hoga.
          </p>
          <div className="mt-5 grid gap-3">
            {[
              ["Approval Queue", "Pending requests with faster checks."],
              ["Visitor Flow", "Simple guided step-by-step movement."],
              ["Status Timeline", "Live updates with motion cards."],
            ].map(([a, b]) => (
              <div
                key={a}
                className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-4"
              >
                <div className="font-semibold text-slate-900">{a}</div>
                <div className="mt-1 text-sm text-slate-600">{b}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="overflow-hidden rounded-3xl border-2 border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
            Animated walkthrough
          </div>
          <div className="mt-4 flex items-center gap-4 overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white px-5 py-6">
            <div className="animate-[float_2.8s_ease-in-out_infinite] text-4xl">
              🚶
            </div>
            <div className="flex-1">
              <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-slate-900" />
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                <MiniBadge active>Login</MiniBadge>
                <MiniBadge>Approve</MiniBadge>
                <MiniBadge>Track</MiniBadge>
                <MiniBadge>Finish</MiniBadge>
              </div>
            </div>
            <div className="animate-[float_2.8s_ease-in-out_infinite] text-4xl">
              📋
            </div>
          </div>
          <div className="mt-5 flex items-center justify-center">
            <AnimatedMascot role="EVAPS" />
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginAccessPanel({
  role,
  setRole,
  user,
  setUser,
  pass,
  setPass,
  onLogin,
  loginError,
  isLoggedIn,
  passwordRef,
  consoleLines,
  loginBusy,
}) {
  const current = roleAccess[role];
  const roleKeys = Object.keys(roleAccess);
  const [showPass, setShowPass] = useState(false);

  return (
    <div className="grid h-full gap-4 xl:grid-cols-[1fr_0.92fr]">
      <div className="flex items-start">
        <div className="w-full space-y-4">
          <div className="inline-flex items-center rounded-full border border-slate-300 bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-600 shadow-sm">
            Dixon Role Access
          </div>

          <TypewriterText
            text="Role Based Login Flow"
            speed={TYPE_SPEED_SLOW}
            className="text-[38px] font-black leading-[1.05] tracking-tight text-[#241d72] xl:text-[52px]"
          />
          <TypewriterText
            text="Role select karne ke baad pehle ID auto-fill hoti hai. Enter dabane par cursor password field me shift hota hai."
            speed={TYPE_SPEED_FAST}
            delay={TYPE_DELAY}
            className="mt-3 max-w-3xl text-[15px] leading-6 text-slate-600"
          />

          <div className="grid gap-2 md:grid-cols-4">
            {roleKeys.map((item) => (
              <button
                key={item}
                onClick={() => {
                  setRole(item);
                  setUser(roleAccess[item].id);
                  setPass("");
                  setTimeout(() => passwordRef.current?.focus(), 0);
                }}
                className={cx(
                  "rounded-2xl border-2 px-4 py-3 text-left transition duration-300 hover:-translate-y-0.5",
                  role === item
                    ? roleAccess[item].color + " shadow-md"
                    : "border-slate-300 bg-white text-slate-800"
                )}
              >
                <div className="text-[18px] font-black">
                  {item === "USER"
                    ? "User"
                    : item === "HR"
                    ? "HR"
                    : item === "ADMIN"
                    ? "Admin"
                    : "EVAPS"}
                </div>
                <div
                  className={cx(
                    "mt-1 text-[12px] leading-5",
                    role === item ? "text-white/80" : "text-slate-500"
                  )}
                >
                  {roleAccess[item].subtitle}
                </div>
              </button>
            ))}
          </div>

          <div className="overflow-hidden rounded-3xl border-2 border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
              Selected role credentials
            </div>
            <TypewriterText
              key={current.title}
              text={current.title}
              speed={16}
              className="mt-2 text-[22px] font-black text-slate-900"
            />
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Login ID
                </div>
                <div className="mt-1 text-sm font-bold text-slate-900">
                  {current.id}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Password
                </div>
                <div className="mt-1 text-sm font-bold text-slate-900">
                  {showPass ? current.password : "••••••••"}
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setShowPass((s) => !s)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                {showPass ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
                {showPass ? "Hide" : "Show"}
              </button>
              <div className="text-xs text-slate-500">
                Enter to password field auto-focus
              </div>
            </div>
          </div>

          <RolePreview role={role} />
        </div>
      </div>

      <div className="space-y-4">
        <div className="overflow-hidden rounded-3xl border-2 border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-2 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.26em] text-[#2b275d]">
            <ShieldCheck className="h-3.5 w-3.5" /> Secure Access
          </div>
          <TypewriterText
            text="Login"
            speed={22}
            className="text-[32px] font-black leading-none text-slate-900"
          />
          <TypewriterText
            text="Selected role ki ID daaliye, Enter dabaiye, phir password bhariye."
            speed={12}
            delay={100}
            className="mt-2 text-[14px] leading-6 text-slate-500"
          />
          <div className="mt-5 space-y-4">
            <div>
              <label className="mb-2 block text-[14px] font-semibold text-slate-800">
                Role ID
              </label>
              <input
                value={user}
                onChange={(e) => setUser(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    passwordRef.current?.focus();
                  }
                }}
                className="w-full rounded-2xl border border-slate-400 px-4 py-3 text-[15px] outline-none transition focus:border-[#2b275d] focus:ring-4 focus:ring-[#2b275d]/10"
                placeholder="Enter role ID..."
                autoComplete="username"
              />
            </div>
            <div>
              <label className="mb-2 block text-[14px] font-semibold text-slate-800">
                Password
              </label>
              <div className="relative">
                <input
                  ref={passwordRef}
                  type={showPass ? "text" : "password"}
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  className="w-full rounded-2xl border border-slate-400 px-4 py-3 pr-12 text-[15px] outline-none transition focus:border-[#2b275d] focus:ring-4 focus:ring-[#2b275d]/10"
                  placeholder="Enter password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-700"
                >
                  {showPass ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            <button
              onClick={onLogin}
              disabled={loginBusy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2b275d] px-4 py-3 text-[15px] font-bold text-white shadow-lg shadow-[#2b275d]/20 transition hover:scale-[1.01] hover:bg-[#342f73] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loginBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {loginBusy ? "Signing in..." : `Login as ${role}`}
            </button>
          </div>
          <div className="mt-5 flex items-center justify-between gap-3 text-[12px] text-slate-500">
            <span>Current role</span>
            <span className="rounded-full border border-slate-300 px-3 py-1">
              {current.badge}
            </span>
          </div>
          {loginError ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-3 py-3 text-sm font-semibold text-red-600">
              Selected role ke liye ID ya password match nahi hua.
            </div>
          ) : null}
          {isLoggedIn ? (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm font-semibold text-emerald-700">
              Login successful. Ab role ke hisaab se aage ka dashboard visible hai.
            </div>
          ) : null}
        </div>
        <ConsoleWindow title="Role Console" lines={consoleLines} />
      </div>
    </div>
  );
}
export default function HRTrainingRoute() {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [showSidebar, setShowSidebar] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [timer, setTimer] = useState(0);
  const [role, setRole] = useState("HR");
  const [user, setUser] = useState(roleAccess.HR.id);
  const [pass, setPass] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginError, setLoginError] = useState(false);
  const [consoleLines, setConsoleLines] = useState([]);
  const [loginBusy, setLoginBusy] = useState(false);

  const passwordRef = useRef(null);
  const autoplayRef = useRef(null);
  const timerRef = useRef(null);

  const current = steps[step];
  const progress = useMemo(
    () => ((step + 1) / steps.length) * 100,
    [step]
  );

  useEffect(() => {
    if (!playing) return;
    autoplayRef.current = window.setInterval(() => {
      setStep((s) => (s + 1) % steps.length);
    }, AUTO_SLIDE_MS);
    return () => clearInterval(autoplayRef.current);
  }, [playing]);

  useEffect(() => {
    timerRef.current = window.setInterval(
      () => setTimer((t) => t + 1),
      1000
    );
    return () => clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    const body = document.body;
    const html = document.documentElement;
    const prevBodyOverflow = body.style.overflow;
    const prevHtmlOverflow = html.style.overflow;
    body.style.overflow = "hidden";
    html.style.overflow = "hidden";
    return () => {
      body.style.overflow = prevBodyOverflow;
      html.style.overflow = prevHtmlOverflow;
    };
  }, []);

  useEffect(() => {
    const onFullscreenChange = () =>
      setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () =>
      document.removeEventListener(
        "fullscreenchange",
        onFullscreenChange
      );
  }, []);

  useEffect(() => {
    setUser(roleAccess[role].id);
    setPass("");
    setLoginError(false);
    setIsLoggedIn(false);
    setConsoleLines([
      {
        id: "boot-1",
        text: "System booting role access console...",
        tone: "muted",
      },
      {
        id: "boot-2",
        text: `Role selected: ${roleAccess[role].title}`,
        tone: "default",
      },
      {
        id: "boot-3",
        text: `Login ID loaded: ${roleAccess[role].id}`,
        tone: "default",
      },
      {
        id: "boot-4",
        text: "Password field ready for input.",
        tone: "muted",
      },
      {
        id: "boot-5",
        text: `Preview modules: ${roleAccess[role].modules.join(", ")}`,
        tone: "muted",
      },
    ]);
    const t = setTimeout(
      () => passwordRef.current?.focus(),
      0
    );
    return () => clearTimeout(t);
  }, [role]);

  const goPrev = () =>
    setStep((s) => (s - 1 + steps.length) % steps.length);
  const goNext = () => setStep((s) => (s + 1) % steps.length);

  const resetToHome = () => {
    setShowSidebar(true);
    setStep(0);
    setPlaying(false);
    setFullscreen(false);
    setTimer(0);
    setRole("HR");
    setUser(roleAccess.HR.id);
    setPass("");
    setIsLoggedIn(false);
    setLoginError(false);
    setLoginBusy(false);
    setConsoleLines([
      {
        id: "reset-1",
        text: "Session reset completed.",
        tone: "muted",
      },
    ]);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setLoginError(false);
    setPass("");
    setStep(0);
    setConsoleLines((prev) => [
      ...prev,
      {
        id: `logout-${Date.now()}`,
        text: "Session ended. Returned to login state.",
        tone: "muted",
      },
    ]);
  };

  const appendConsole = (line) =>
    setConsoleLines((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        ...line,
      },
    ]);

  const handleLogin = async () => {
    const correct = roleAccess[role];
    setLoginBusy(true);
    appendConsole({
      text: `Checking credentials for ${role}...`,
      tone: "muted",
    });
    await new Promise((r) => setTimeout(r, LOGIN_DELAY));
    if (
      user.trim() === correct.id &&
      pass.trim() === correct.password
    ) {
      setIsLoggedIn(true);
      setLoginError(false);
      appendConsole({
        text: "Authentication successful.",
        tone: "success",
      });
      appendConsole({
        text: "Loading role dashboard...",
        tone: "default",
      });
      if (role === "USER") setStep(1);
      else if (role === "HR") setStep(2);
      else if (role === "ADMIN") setStep(4);
      else setStep(5);
    } else {
      setIsLoggedIn(false);
      setLoginError(true);
      appendConsole({
        text: "Authentication failed. Invalid ID or password.",
        tone: "error",
      });
    }
    setLoginBusy(false);
  };

  const fmtTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(
      2,
      "0"
    )}`;
  };

  const shellTitle =
    {
      login: {
        title: "Role Based Login Access",
        desc: "Role select karte hi ID auto-fill hoti hai. Password field me Enter ke baad focus shift hota hai, aur login ke baad specific dashboard preview dikhaya jata hai.",
      },
      user: {
        title: "User Flow After Login",
        desc: "User ko sirf self scanner aur apni attendance related basic view dikhna chahiye.",
      },
      hrEntries: {
        title: "HR Flow Entries and Scanner",
        desc: "HR login ke turant baad scanner, attendance entries, aur hall transfer controls visible honge.",
      },
      hrRoster: {
        title: "HR Flow Roster Manager",
        desc: "HR employee roster, hall mapping, aur shift level data manage karega.",
      },
      admin: {
        title: "Admin Flow Full Summary",
        desc: "Admin ko sab roles ka overview, hall summary, aur complete control layout dikhna chahiye.",
      },
      evaps: {
        title: "EVAPS Workflow Access",
        desc: "EVAPS approvals aur visitor workflow ko guided animated layout me show karega.",
      },
    }[current.tab];

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      }
      if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      }
      if (e.key.toLowerCase() === "f") {
        e.preventDefault();
        const toggleFullscreen = async () => {
          if (!document.fullscreenElement)
            await document.documentElement
              .requestFullscreen()
              .catch(() => {});
          else
            await document
              .exitFullscreen()
              .catch(() => {});
        };
        toggleFullscreen();
      }
    },
    [] // deliberate: stable handlers
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () =>
      window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement)
      await document.documentElement
        .requestFullscreen()
        .catch(() => {});
    else
      await document.exitFullscreen().catch(() => {});
  };

  const renderStepContent = () => {
    if (current.tab === "login")
      return (
        <LoginAccessPanel
          role={role}
          setRole={setRole}
          user={user}
          setUser={setUser}
          pass={pass}
          setPass={setPass}
          onLogin={handleLogin}
          loginError={loginError}
          isLoggedIn={isLoggedIn}
          passwordRef={passwordRef}
          consoleLines={consoleLines}
          loginBusy={loginBusy}
        />
      );
    if (current.tab === "user") return <UserDashboard />;
    if (current.tab === "hrEntries") return <HREntriesDashboard />;
    if (current.tab === "hrRoster") return <HRRosterDashboard />;
    if (current.tab === "admin") return <AdminDashboard />;
    return <EVAPSFlow />;
  };

  return (
    <div className="fixed inset-0 z-[999] overflow-hidden bg-[#f4f6fb] text-slate-900">
      <style>{`
        @keyframes float { 0%,100% { transform: translateY(0px) } 50% { transform: translateY(-8px) } }
      `}</style>

      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        {/* top bar */}
        <div className="border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto max-w-[1600px] px-3 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#23205C] text-white shadow-sm">
                  <LayoutDashboard className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-2xl font-black tracking-tight text-[#23205C]">
                    Dixon
                  </div>
                  <div className="text-xs text-slate-500">
                    The brand behind brands
                  </div>
                </div>
              </div>

              <div className="hidden xl:flex flex-wrap items-center gap-2">
                {steps.map((t, idx) => {
                  const ActiveIcon = t.icon;
                  return (
                    <button
                      key={t.tab}
                      onClick={() => setStep(idx)}
                      className={cx(
                        "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition duration-300 hover:-translate-y-0.5",
                        current.tab === t.tab
                          ? "border-[#23205C] bg-[#23205C] text-white shadow-sm"
                          : "border-slate-300 bg-white text-slate-700"
                      )}
                    >
                      <ActiveIcon className="h-4 w-4" />
                      {t.title}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSidebar((s) => !s)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  {showSidebar ? "Hide Map" : "Show Map"}
                </button>
                <button
                  onClick={() => setPlaying((p) => !p)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  {playing ? (
                    <Pause className="mr-1 inline h-4 w-4" />
                  ) : (
                    <Play className="mr-1 inline h-4 w-4" />
                  )}
                  {playing ? "Pause" : "Play"}
                </button>
                <button
                  onClick={resetToHome}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <Home className="mr-1 inline h-4 w-4" /> Home
                </button>
                <button
                  onClick={toggleFullscreen}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  {fullscreen ? (
                    <Minimize2 className="mr-1 inline h-4 w-4" />
                  ) : (
                    <Maximize2 className="mr-1 inline h-4 w-4" />
                  )}
                  {fullscreen ? "Exit Full" : "Fullscreen"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* main area */}
        <div className="mx-auto flex h-full min-h-0 w-full max-w-[1600px] flex-1 gap-3 px-3 py-3">
          {showSidebar && (
            <div className="hidden w-[260px] shrink-0 flex-col rounded-3xl border border-slate-200 bg-white p-4 shadow-sm lg:flex">
              <div className="mb-3 flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                <span>Training Map</span>
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-0.5 text-[10px]">
                  <Clock3 className="h-3 w-3" />
                  {fmtTime(timer)}
                </span>
              </div>
              <div className="space-y-2">
                {steps.map((s, idx) => {
                  const Icon = s.icon;
                  const isActive = idx === step;
                  return (
                    <button
                      key={s.tab}
                      onClick={() => setStep(idx)}
                      className={cx(
                        "flex w-full items-center justify-between rounded-2xl border px-3 py-2 text-left text-xs transition hover:bg-slate-50",
                        isActive
                          ? "border-[#23205C] bg-[#23205C] text-white shadow-sm"
                          : "border-slate-200 bg-white text-slate-700"
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <Icon className="h-3.5 w-3.5" />
                        {s.title}
                      </span>
                      {isActive && (
                        <span className="text-[10px] uppercase tracking-[0.18em]">
                          Active
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 space-y-2 text-[11px] text-slate-500">
                <div className="flex items-center justify-between">
                  <span>Progress</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#23205C] via-[#342f73] to-[#E0222A]"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span>Auto-play</span>
                  <span>{playing ? "On" : "Off"}</span>
                </div>
              </div>
              <div className="mt-auto pt-4 text-[10px] text-slate-400">
                <div className="flex items-center justify-between">
                  <span>
                    <Keyboard className="mr-1 inline h-3 w-3" />
                    Keys
                  </span>
                  <span>← → space F</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-hidden rounded-3xl border border-slate-200 bg-slate-50/60 p-3 shadow-sm">
            <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-600">
                  <Sparkles className="h-3 w-3" />
                  {shellTitle.title}
                </div>
                <p className="mt-2 text-[13px] text-slate-600">
                  {shellTitle.desc}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={goPrev}
                  className="rounded-full border border-slate-300 bg-white p-2 text-slate-600 hover:bg-slate-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={goNext}
                  className="rounded-full border border-slate-300 bg-white p-2 text-slate-600 hover:bg-slate-50"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  onClick={handleLogout}
                  className="rounded-full border border-slate-300 bg-white p-2 text-slate-600 hover:bg-slate-50"
                >
                  <LogOut className="h-4 w-4" />
                </button>
                <button
                  onClick={resetToHome}
                  className="rounded-full border border-slate-300 bg-white p-2 text-slate-600 hover:bg-slate-50"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-3 h-[calc(100%-3.5rem)] overflow-auto px-1 pb-2">
              {renderStepContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}