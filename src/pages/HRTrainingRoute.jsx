import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  FileCheck2,
  Keyboard,
  LayoutDashboard,
  Lock,
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
} from "lucide-react";

const AUTO_SLIDE_MS = 120000;

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
  },
  HR: {
    id: "hr1",
    password: "hr123",
    title: "HR Login",
    subtitle: "Attendance + entries + roster + hall control",
    afterTitle: "HR ke baad kya dikhega",
    afterDesc:
      "HR login ke baad scanner panel, attendance entries, roster manager, aur hall manager visible honge. HR employee hall transfer aur roster mapping handle karega.",
    modules: ["Scanner", "Entries", "Roster", "Hall Manager"],
    badge: "Operational Access",
    color: "border-[#23205C] bg-[#23205C] text-white",
  },
  ADMIN: {
    id: "admin1",
    password: "admin123",
    title: "Admin Login",
    subtitle: "Full access and master visibility",
    afterTitle: "Admin ke baad kya dikhega",
    afterDesc:
      "Admin login ke baad full module visibility, hall summary, role overview, roster data, attendance insight, aur system level control cards dikhenge.",
    modules: ["Scanner", "Entries", "Roster", "Hall", "Role Summary", "System Control"],
    badge: "Full Access",
    color: "border-[#E0222A] bg-white text-[#E0222A]",
  },
};

const steps = [
  { title: "Login Access", tab: "login", icon: ShieldCheck },
  { title: "User View", tab: "user", icon: ScanLine },
  { title: "HR Entries", tab: "hrEntries", icon: FileCheck2 },
  { title: "HR Roster", tab: "hrRoster", icon: Users2 },
  { title: "Admin Summary", tab: "admin", icon: Building2 },
];

const rosterRows = [
  ["MOHNI SONI", "499561", "OPERATOR", "Hall 2", "AA", "Sunday"],
  ["DIVYANSHU", "499567", "OPERATOR", "Hall 2", "AA", "Thursday"],
  ["RAJKUMAR", "499576", "OPERATOR", "Hall 2", "AA", "Wednesday"],
  ["VISHAL", "499565", "OPERATOR", "Hall 2", "AA", "Tuesday"],
];

const entryRows = [
  ["2026-06-22", "09:16", "499561", "MOHNI SONI", "AA", "Hall 4", "HR"],
  ["2026-06-22", "08:12", "492290", "VISWA KUMARI", "B", "Hall 4", "HR"],
  ["2026-06-22", "08:10", "491792", "PRIYANKA", "A", "Hall 2", "HR"],
  ["2026-06-22", "08:08", "495091", "MOHIT", "B", "Hall 3", "HR"],
];

const hallCards = [
  { name: "Hall 1", used: 3, total: 88, shift: "A:1 B:2 C:0" },
  { name: "Hall 2", used: 9, total: 145, shift: "A:1 AA:0 BB:8" },
  { name: "Hall 3", used: 1, total: 71, shift: "A:0 B:1 C:0" },
  { name: "Hall 4", used: 6, total: 85, shift: "A:0 B:4 AA:1 BB:1" },
];

const cx = (...classes) => classes.filter(Boolean).join(" ");

function TypewriterText({ text, speed = 18, delay = 0, className = "", as: Tag = "div" }) {
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
    <div className="border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</div>
        <div className="flex h-8 w-8 items-center justify-center bg-slate-50 text-slate-700">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-2 text-2xl font-black tracking-tight text-slate-900">{value}</div>
    </div>
  );
}

function MiniBadge({ children, active = false }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 border px-2.5 py-1 text-xs font-semibold",
        active ? "border-[#2b275d] bg-[#2b275d] text-white" : "border-slate-200 bg-white text-slate-700"
      )}
    >
      {children}
    </span>
  );
}

function RolePreview({ role }) {
  const info = roleAccess[role];
  return (
    <div className="border-2 border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">After login preview</div>
          <div className="mt-1 text-xl font-black text-slate-900">{info.afterTitle}</div>
        </div>
        <div className="border border-slate-300 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">
          {info.badge}
        </div>
      </div>

      <p className="mt-3 text-sm leading-6 text-slate-600">{info.afterDesc}</p>

      <div className="mt-4 grid gap-2 md:grid-cols-3">
        {info.modules.map((item) => (
          <div key={item} className="border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-700">
            {item}
          </div>
        ))}
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
}) {
  const current = roleAccess[role];

  return (
    <div className="grid h-full gap-4 xl:grid-cols-[1fr_0.92fr]">
      <div className="flex items-center">
        <div className="w-full">
          <div className="inline-flex items-center border border-slate-300 bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-600 shadow-sm">
            Dixon Role Access
          </div>

          <div className="mt-4">
            <TypewriterText
              text="Role Based Login Flow"
              speed={26}
              className="text-[38px] font-black leading-[1] tracking-tight text-[#241d72] xl:text-[52px]"
            />
            <TypewriterText
              text="HR pe click karoge to HR ki ID-password aur uske baad visible screens dono dikhenge. User aur Admin ke liye bhi same preview flow rahega."
              speed={12}
              delay={160}
              className="mt-3 max-w-3xl text-[15px] leading-6 text-slate-600"
            />
          </div>

          <div className="mt-4 grid gap-2 md:grid-cols-3">
            {["USER", "HR", "ADMIN"].map((item) => (
              <button
                key={item}
                onClick={() => {
                  setRole(item);
                  setUser(roleAccess[item].id);
                  setPass(roleAccess[item].password);
                }}
                className={cx(
                  "border-2 px-4 py-3 text-left transition",
                  role === item ? roleAccess[item].color : "border-slate-300 bg-white text-slate-800"
                )}
              >
                <div className="text-[18px] font-black">{item === "USER" ? "User" : item}</div>
                <div className={cx("mt-1 text-[12px] leading-5", role === item && item === "HR" ? "text-white/80" : role === item && item === "ADMIN" ? "text-[#E0222A]/80" : "text-slate-500")}>
                  {roleAccess[item].subtitle}
                </div>
              </button>
            ))}
          </div>

          <div className="mt-4 border-2 border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Selected role credentials</div>
            <TypewriterText
              key={current.title}
              text={current.title}
              speed={18}
              className="mt-2 text-[22px] font-black text-slate-900"
            />
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <div className="border border-slate-200 bg-slate-50 px-3 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Login ID</div>
                <div className="mt-1 text-sm font-bold text-slate-900">{current.id}</div>
              </div>
              <div className="border border-slate-200 bg-slate-50 px-3 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Password</div>
                <div className="mt-1 text-sm font-bold text-slate-900">{current.password}</div>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <RolePreview role={role} />
          </div>

          {isLoggedIn && (
            <div className="mt-4 border-2 border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              Login successful. Ab role ke hisaab se aage ka dashboard visible hai.
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-center">
        <div className="w-full max-w-[430px] border-2 border-red-300 bg-white p-5 shadow-sm">
          <div className="mb-2 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.26em] text-[#2b275d]">
            <ShieldCheck className="h-3.5 w-3.5" />
            Secure Access
          </div>

          <TypewriterText
            text="Login"
            speed={22}
            className="text-[32px] font-black leading-none text-slate-900"
          />
          <TypewriterText
            text="Selected role ki ID aur password daal kar continue karo."
            speed={12}
            delay={100}
            className="mt-2 text-[14px] leading-6 text-slate-500"
          />

          <div className="mt-5 space-y-4">
            <div>
              <label className="mb-2 block text-[14px] font-semibold text-slate-800">Role ID</label>
              <input
                value={user}
                onChange={(e) => setUser(e.target.value)}
                className="w-full border border-slate-400 px-4 py-3 text-[15px] outline-none focus:border-[#2b275d]"
              />
            </div>

            <div>
              <label className="mb-2 block text-[14px] font-semibold text-slate-800">Password</label>
              <input
                type="password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                className="w-full border border-slate-400 px-4 py-3 text-[15px] outline-none focus:border-[#2b275d]"
              />
            </div>

            <button
              onClick={onLogin}
              className="w-full bg-[#2b275d] px-4 py-3 text-[15px] font-bold text-white"
            >
              Login as {role}
            </button>
          </div>

          <div className="mt-5 flex items-center justify-between gap-3 text-[12px] text-slate-500">
            <span>Current role: {role}</span>
            <span className="border border-slate-300 px-3 py-1">{current.badge}</span>
          </div>

          {loginError && (
            <div className="mt-4 border border-red-200 bg-red-50 px-3 py-3 text-sm font-semibold text-red-600">
              Selected role ke liye ID ya password match nahi hua.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function UserDashboard() {
  return (
    <div className="grid h-full gap-4 xl:grid-cols-[1.08fr_0.92fr]">
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Role" value="User" icon={Users2} />
          <StatCard label="Access" value="Self" icon={ShieldCheck} />
          <StatCard label="Panel" value="Scan" icon={ScanLine} />
        </div>

        <div className="border-2 border-slate-200 bg-white p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">User scanner panel</div>
          <h3 className="mt-1 text-2xl font-black text-slate-900">Self Attendance Screen</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            User login ke baad employee apna code enter karega, verify button dekhega, aur apni last attendance status check karega.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input defaultValue="491676" className="border border-slate-300 px-4 py-3 text-sm outline-none" />
            <button className="bg-[#2b275d] px-4 py-3 text-sm font-bold text-white">Verify Attendance</button>
          </div>
        </div>
      </div>

      <div className="border-2 border-slate-200 bg-white p-4">
        <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">User ko kya dikhega</div>
        <div className="mt-3 space-y-3">
          {["Self Scanner", "My Attendance Status", "Basic Access Only"].map((x) => (
            <div key={x} className="border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-700">
              {x}
            </div>
          ))}
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
        <div className="border-2 border-slate-200 bg-white p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Scanner visible after HR login</div>
          <div className="mt-2 text-lg font-black text-slate-900">HR Scanner</div>
          <div className="mt-3 grid gap-2">
            <input defaultValue="491676" className="border border-slate-300 px-4 py-3 text-sm outline-none" />
            <button className="bg-[#2b275d] px-4 py-3 text-sm font-bold text-white">Verify & Save</button>
          </div>
        </div>

        <div className="border-2 border-slate-200 bg-white p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Entries visible after HR login</div>
          <div className="mt-2 space-y-2">
            {entryRows.slice(0, 3).map((r) => (
              <div key={r[2]} className="border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                {r[3]} · {r[5]} · {r[6]}
              </div>
            ))}
          </div>
        </div>

        <div className="border-2 border-slate-200 bg-white p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Hall move visible after HR login</div>
          <div className="mt-3 grid gap-2">
            <input placeholder="Employee code" className="border border-slate-300 px-4 py-3 text-sm outline-none" />
            <select className="border border-slate-300 px-4 py-3 text-sm outline-none">
              <option>Hall 1</option>
              <option>Hall 2</option>
              <option>Hall 3</option>
              <option>Hall 4</option>
            </select>
            <button className="bg-[#E0222A] px-4 py-3 text-sm font-bold text-white">Move Hall</button>
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

      <div className="border-2 border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Roster visible after HR login</div>
          <div className="flex gap-2">
            <button className="border border-slate-300 px-3 py-2 text-xs">CSV</button>
            <button className="border border-slate-300 px-3 py-2 text-xs">Excel</button>
          </div>
        </div>

        <div className="mt-4 overflow-hidden">
          <table className="min-w-full text-left text-xs">
            <thead>
              <tr className="border-b bg-slate-50 text-slate-500">
                {["Name", "Code", "Designation", "Hall", "Shift", "Week Off"].map((h) => (
                  <th key={h} className="px-3 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rosterRows.map((r) => (
                <tr key={r[1]} className="border-b">
                  {r.map((cell, i) => (
                    <td key={i} className={cx("px-3 py-3", i === 0 && "font-semibold")}>{cell}</td>
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
        <div className="border-2 border-slate-200 bg-white p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Admin ko kya dikhega</div>
          <div className="mt-2 text-lg font-black text-slate-900">All role summaries and modules</div>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {["Scanner", "Entries", "Roster", "Hall Manager", "Role Visibility", "System Summary"].map((x) => (
              <div key={x} className="border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-700">
                {x}
              </div>
            ))}
          </div>
        </div>

        <div className="border-2 border-slate-200 bg-white p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Hall summary visible after Admin login</div>
          <div className="mt-3 space-y-2">
            {hallCards.map((h) => (
              <div key={h.name} className="flex items-center justify-between border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
                <span className="font-semibold">{h.name}</span>
                <span>{h.used}/{h.total}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HRTrainingRoute() {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [timer, setTimer] = useState(0);

  const [role, setRole] = useState("HR");
  const [user, setUser] = useState(roleAccess.HR.id);
  const [pass, setPass] = useState(roleAccess.HR.password);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginError, setLoginError] = useState(false);

  const autoplayRef = useRef(null);
  const timerRef = useRef(null);

  const current = steps[step];
  const progress = useMemo(() => ((step + 1) / steps.length) * 100, [step]);

  useEffect(() => {
    if (!playing) {
      clearInterval(autoplayRef.current);
      return;
    }
    autoplayRef.current = setInterval(() => {
      setStep((s) => (s + 1) % steps.length);
    }, AUTO_SLIDE_MS);
    return () => clearInterval(autoplayRef.current);
  }, [playing]);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimer((t) => t + 1);
    }, 1000);
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
    const onFullscreenChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const goPrev = () => setStep((s) => (s - 1 + steps.length) % steps.length);
  const goNext = () => setStep((s) => (s + 1) % steps.length);

  const restart = () => {
    setStep(0);
    setTimer(0);
    setPlaying(false);
    setIsLoggedIn(false);
    setLoginError(false);
    setRole("HR");
    setUser(roleAccess.HR.id);
    setPass(roleAccess.HR.password);
  };

  const logoutAll = () => {
    setIsLoggedIn(false);
    setLoginError(false);
    setStep(0);
  };

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen().catch(() => {});
    } else {
      await document.exitFullscreen().catch(() => {});
    }
  };

  const handleLogin = () => {
    const correct = roleAccess[role];
    if (user === correct.id && pass === correct.password) {
      setIsLoggedIn(true);
      setLoginError(false);

      if (role === "USER") setStep(1);
      if (role === "HR") setStep(2);
      if (role === "ADMIN") setStep(4);
    } else {
      setIsLoggedIn(false);
      setLoginError(true);
    }
  };

  const fmtTime = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
  const activeTab = current.tab;

  const shellTitle = {
    login: {
      title: "Role Based Login Access",
      desc: "HR, Admin, aur User pe click karne par unki ID-password aur login ke baad ka exact screen flow dono dikh rahe hain.",
    },
    user: {
      title: "User Flow After Login",
      desc: "User ko sirf self scanner aur apni attendance related basic view dikhna chahiye.",
    },
    hrEntries: {
      title: "HR Flow: Entries and Scanner",
      desc: "HR login ke turant baad scanner, attendance entries, aur hall transfer controls visible honge.",
    },
    hrRoster: {
      title: "HR Flow: Roster Manager",
      desc: "HR employee roster, hall mapping, aur shift level data manage karega.",
    },
    admin: {
      title: "Admin Flow: Full Summary",
      desc: "Admin ko sab roles ka overview, hall summary, aur complete control layout dikhna chahiye.",
    },
  }[activeTab];

  const handleKeyDown = useCallback((e) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      setStep((s) => (s + 1) % steps.length);
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setStep((s) => (s - 1 + steps.length) % steps.length);
    }
    if (e.key === " ") {
      e.preventDefault();
      setPlaying((p) => !p);
    }
    if (e.key.toLowerCase() === "f") {
      e.preventDefault();
      toggleFullscreen();
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="fixed inset-0 z-[999] overflow-hidden bg-[#f4f6fb] text-slate-900">
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto max-w-[1600px] px-3 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center bg-[#23205C] text-white shadow-sm">
                  <LayoutDashboard className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-2xl font-black tracking-tight text-[#23205C]">Dixon</div>
                  <div className="text-xs text-slate-500">The brand behind brands</div>
                </div>
              </div>

              <div className="hidden xl:flex flex-wrap items-center gap-2">
                {steps.map((t, idx) => (
                  <button
                    key={t.tab}
                    onClick={() => setStep(idx)}
                    className={cx(
                      "border px-3 py-2 text-sm font-medium transition",
                      activeTab === t.tab
                        ? "border-[#23205C] bg-[#23205C] text-white shadow-sm"
                        : "border-slate-300 bg-white text-slate-700"
                    )}
                  >
                    {t.title}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSidebar((s) => !s)}
                  className="border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                >
                  {showSidebar ? "Hide Map" : "Show Map"}
                </button>
                <button
                  onClick={toggleFullscreen}
                  className="border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                >
                  {fullscreen ? <Minimize2 className="mr-1 inline h-4 w-4" /> : <Maximize2 className="mr-1 inline h-4 w-4" />}
                  {fullscreen ? "Exit" : "Full"}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto flex h-full min-h-0 w-full max-w-[1600px] gap-3 overflow-hidden px-3 py-3">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <section className="relative overflow-hidden border-2 border-[#23205C] bg-gradient-to-r from-[#23205C] via-[#342f73] to-[#E0222A] p-4 text-white shadow-xl">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_28%)]" />
              <div className="relative flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div className="max-w-4xl">
                  <div className="inline-flex items-center gap-2 border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]">
                    <Sparkles className="h-3 w-3" />
                    Guided Role Demo
                  </div>

                  <TypewriterText
                    key={shellTitle.title}
                    text={shellTitle.title}
                    speed={16}
                    className="mt-3 text-3xl font-black leading-tight md:text-5xl"
                  />

                  <TypewriterText
                    key={shellTitle.desc}
                    text={shellTitle.desc}
                    speed={11}
                    delay={120}
                    className="mt-2 max-w-3xl text-sm leading-6 text-white/85 md:text-lg"
                  />
                </div>

                <div className="grid grid-cols-4 gap-2 xl:w-[520px]">
                  <div className="border border-white/15 bg-white/10 px-3 py-2 backdrop-blur-sm">
                    <div className="text-[9px] uppercase tracking-[0.25em] text-white/70">Role</div>
                    <div className="mt-1 text-lg font-bold">{role}</div>
                  </div>
                  <div className="border border-white/15 bg-white/10 px-3 py-2 backdrop-blur-sm">
                    <div className="text-[9px] uppercase tracking-[0.25em] text-white/70">Login</div>
                    <div className="mt-1 text-lg font-bold">{isLoggedIn ? "Done" : "Pending"}</div>
                  </div>
                  <div className="border border-white/15 bg-white/10 px-3 py-2 backdrop-blur-sm">
                    <div className="text-[9px] uppercase tracking-[0.25em] text-white/70">Progress</div>
                    <div className="mt-1 text-lg font-bold">{Math.round(progress)}%</div>
                  </div>
                  <div className="border border-white/15 bg-white/10 px-3 py-2 backdrop-blur-sm">
                    <div className="text-[9px] uppercase tracking-[0.25em] text-white/70">Timer</div>
                    <div className="mt-1 text-lg font-bold">{fmtTime(timer)}</div>
                  </div>
                </div>
              </div>
            </section>

            <section className="mt-3 flex min-h-0 flex-1 gap-3 overflow-hidden">
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-2 border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-4 py-3">
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Full role flow</div>
                      <h2 className="mt-1 text-2xl font-bold text-slate-900">{shellTitle.title}</h2>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <MiniBadge active>Step {step + 1}/{steps.length}</MiniBadge>
                      <MiniBadge>{playing ? "Auto" : "Manual"}</MiniBadge>
                      <MiniBadge>
                        <Clock3 className="h-3 w-3" />
                        {fmtTime(timer)}
                      </MiniBadge>
                    </div>
                  </div>

                  <div className="mt-3 h-2 w-full overflow-hidden bg-slate-200">
                    <div
                      className="h-full bg-gradient-to-r from-[#23205C] via-[#5b53c7] to-[#E0222A]"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-hidden p-4">
                  {activeTab === "login" && (
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
                    />
                  )}
                  {activeTab === "user" && <UserDashboard />}
                  {activeTab === "hrEntries" && <HREntriesDashboard />}
                  {activeTab === "hrRoster" && <HRRosterDashboard />}
                  {activeTab === "admin" && <AdminDashboard />}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-4">
                  <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                    <MiniBadge>
                      <Keyboard className="h-3 w-3" />
                      Space
                    </MiniBadge>
                    <MiniBadge>← Prev</MiniBadge>
                    <MiniBadge>→ Next</MiniBadge>
                    <MiniBadge>F Full</MiniBadge>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button onClick={goPrev} className="border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
                      <ChevronLeft className="mr-1 inline h-4 w-4" />
                      Prev
                    </button>
                    <button onClick={() => setPlaying((p) => !p)} className="border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
                      {playing ? <Pause className="mr-1 inline h-4 w-4" /> : <Play className="mr-1 inline h-4 w-4" />}
                      {playing ? "Pause" : "Play"}
                    </button>
                    <button onClick={restart} className="border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
                      <RotateCcw className="mr-1 inline h-4 w-4" />
                      Reset
                    </button>
                    <button onClick={logoutAll} className="border border-[#E0222A] bg-[#E0222A] px-4 py-2 text-sm font-semibold text-white shadow-sm">
                      <LogOut className="mr-1 inline h-4 w-4" />
                      Logout
                    </button>
                    <button onClick={goNext} className="border border-[#23205C] bg-[#23205C] px-4 py-2 text-sm font-semibold text-white shadow-sm">
                      Next
                      <ChevronRight className="ml-1 inline h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {showSidebar && (
            <aside className="hidden w-[320px] shrink-0 xl:flex xl:min-h-0 xl:flex-col xl:overflow-hidden">
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-2 border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-slate-900">Flow Map</h2>
                  <div className="border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-semibold text-slate-600">
                    Guided
                  </div>
                </div>

                <div className="space-y-2">
                  {steps.map((s, idx) => {
                    const ActiveIcon = s.icon;
                    const active = idx === step;
                    return (
                      <button
                        key={s.title}
                        type="button"
                        onClick={() => setStep(idx)}
                        className={cx(
                          "w-full border-2 p-3 text-left transition",
                          active ? "border-[#23205C] bg-[#23205C]/5" : "border-slate-200 bg-white hover:border-slate-300"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className={cx("flex h-10 w-10 items-center justify-center", active ? "bg-[#23205C] text-white" : "bg-slate-100 text-slate-700")}>
                            <ActiveIcon className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-sm font-semibold text-slate-900">{s.title}</div>
                              {active && <ArrowRight className="h-4 w-4 text-[#E0222A]" />}
                            </div>
                            <p className="mt-1 text-xs leading-5 text-slate-600">
                              {s.tab === "login" && "Role choose karo, ID-password dekho, login karo."}
                              {s.tab === "user" && "User ko sirf self scanner visible hoga."}
                              {s.tab === "hrEntries" && "HR ko entries aur hall move controls milenge."}
                              {s.tab === "hrRoster" && "HR roster aur hall mapping manage karega."}
                              {s.tab === "admin" && "Admin ko full modules aur summary dikhengi."}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 border-2 border-[#E0222A]/20 bg-[#E0222A]/5 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#E0222A]">
                    <CheckCircle2 className="h-4 w-4" />
                    Ready
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-700">
                    Ab HR pe click karne se hr1 aur hr123 dikhega; user pe user1 aur admin pe admin1 ke saath full post-login flow visible rahega.
                  </p>
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}