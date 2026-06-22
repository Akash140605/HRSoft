import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  CheckCircle2,
  CirclePlay,
  Layers3,
  MonitorSmartphone,
  ShieldCheck,
  Sparkles,
  Users2,
  Building2,
  FileDown,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  ScanLine,
  PanelTop,
  BadgeInfo,
  LayoutDashboard,
  FileUp,
  Search,
  ChevronDown,
} from "lucide-react";

const steps = [
  {
    title: "Welcome",
    desc: "Sabse pehle user ko bataya jata hai ki ye software attendance aur roster manage karta hai.",
    icon: Sparkles,
    example: "Example: Aaj hum scanner se entry process karna seekhenge.",
    points: ["Simple start", "Friendly training", "Clear flow"],
  },
  {
    title: "Scanner / Entry",
    desc: "Code scan ya type karke employee verify hota hai aur entry save hoti hai.",
    icon: ScanLine,
    example: "Example: 491676 type karo aur Verify pe click karo.",
    points: ["Scan code", "Verify employee", "Save entry"],
  },
  {
    title: "Hall Movement",
    desc: "Employee ko correct hall me move karna ya hall change karna yahan dikhaya jata hai.",
    icon: Building2,
    example: "Example: Hall 1 full ho to Hall 2 select karo aur Move Hall dabao.",
    points: ["Select hall", "Capacity check", "Move safely"],
  },
  {
    title: "Roster / Master",
    desc: "Employee list, code, designation, week off aur hall mapping manage hoti hai.",
    icon: Users2,
    example: "Example: ANITA, 499978, OPERATOR, Sunday, AA, Hall 2",
    points: ["Add employee", "Edit details", "Bulk import"],
  },
  {
    title: "Reports / Logs",
    desc: "Logs aur reports se pata chalta hai kis time kya action hua.",
    icon: PanelTop,
    example: "Example: Aaj kitne employees aaye aur kis hall me gaye.",
    points: ["Live logs", "Quick reports", "Easy monitoring"],
  },
  {
    title: "Export / Download",
    desc: "CSV aur Excel export se data share aur backup ho jata hai.",
    icon: FileDown,
    example: "Example: Roster ka Excel nikalo aur manager ko bhejo.",
    points: ["CSV export", "Excel export", "Share data"],
  },
  {
    title: "Security & Rules",
    desc: "Software ka proper use aur safe workflow end me samjhaya jata hai.",
    icon: ShieldCheck,
    example: "Example: Galat hall me entry na ho, isliye verify zaroor karo.",
    points: ["Safe usage", "Proper roles", "Best practice"],
  },
];

const panelMotion = {
  initial: { opacity: 0, y: 28, scale: 0.985 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -18, scale: 0.985 },
};

const quickStats = [
  { label: "Modules", value: 7, icon: LayoutDashboard },
  { label: "Downloads", value: "CSV / Excel", icon: FileUp },
  { label: "Search", value: "Fast lookup", icon: Search },
  { label: "Mode", value: "Auto guided", icon: CirclePlay },
];

export default function HRTrainingRoute() {
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [showSidebar, setShowSidebar] = useState(true);

  const current = steps[step];
  const Icon = current.icon;
  const progress = useMemo(() => ((step + 1) / steps.length) * 100, [step]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setStep((s) => (s + 1) % steps.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [playing]);

  const goPrev = () => setStep((s) => (s - 1 + steps.length) % steps.length);
  const goNext = () => setStep((s) => (s + 1) % steps.length);
  const restart = () => {
    setStep(0);
    setPlaying(false);
  };

  const togglePlay = () => setPlaying((p) => !p);

  return (
    <div className="min-h-screen bg-[#f4f6fb] text-slate-900">
      <div className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-[1680px] px-4 py-3 md:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center bg-[#23205C] text-white shadow-sm">
                <LayoutDashboard className="h-6 w-6" />
              </div>
              <div>
                <div className="text-3xl font-black tracking-tight text-[#23205C]">Dixon</div>
                <div className="text-sm text-slate-500">The brand behind brands</div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="border-2 border-slate-200 bg-white px-4 py-2.5 font-semibold text-slate-700 hover:bg-slate-50"
              >
                Dashboard
              </button>
              <button
                type="button"
                className="border-2 border-slate-200 bg-white px-4 py-2.5 font-semibold text-slate-700 hover:bg-slate-50"
              >
                Settings
              </button>
              <button
                type="button"
                className="border-2 border-[#E0222A] bg-[#E0222A] px-5 py-2.5 font-semibold text-white shadow-sm"
              >
                Logout
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-200 pt-4">
            {["Scanner", "Training", "Entries", "Roster", "Hall Manager", "Tracker", "HR Logs"].map((tab, i) => (
              <button
                key={tab}
                type="button"
                className={`border-2 px-4 py-2 font-medium transition ${
                  i === 1
                    ? "border-[#23205C] bg-[#23205C] text-white shadow-sm"
                    : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1680px] px-4 py-5 md:px-6">
        <motion.section
          initial={reduceMotion ? false : { opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden border-2 border-[#23205C] bg-gradient-to-r from-[#23205C] via-[#23205C] to-[#E0222A] p-6 text-white shadow-xl"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_28%)]" />
          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]">
                <CirclePlay className="h-3.5 w-3.5" />
                Training Showcase
              </div>
              <h1 className="mt-4 text-3xl font-black leading-tight md:text-5xl">
                HR Software ka premium guided training
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/80 md:text-base">
                Ye screen ek proper product landing feel deti hai, jahan user ko steps clearly samajh aate hain,
                controls easy hote hain, aur progress visually strong lagti hai.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="inline-flex items-center gap-2 border-2 border-white/20 bg-white/10 px-4 py-2.5 font-semibold text-white hover:bg-white/15"
                >
                  {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  {playing ? "Pause demo" : "Play demo"}
                </button>
                <button
                  type="button"
                  onClick={restart}
                  className="inline-flex items-center gap-2 border-2 border-white/20 bg-white/10 px-4 py-2.5 font-semibold text-white hover:bg-white/15"
                >
                  <RotateCcw className="h-4 w-4" />
                  Restart
                </button>
                <button
                  type="button"
                  onClick={() => setShowSidebar((s) => !s)}
                  className="inline-flex items-center gap-2 border-2 border-white/20 bg-white/10 px-4 py-2.5 font-semibold text-white hover:bg-white/15"
                >
                  <ChevronDown className={`h-4 w-4 transition ${showSidebar ? "rotate-180" : ""}`} />
                  {showSidebar ? "Hide map" : "Show map"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:w-[620px]">
              {[
                ["Modules", steps.length],
                ["Current", step + 1],
                ["Progress", `${Math.round(progress)}%`],
                ["Mode", playing ? "Auto" : "Manual"],
              ].map(([label, value]) => (
                <div key={label} className="border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
                  <div className="text-[10px] uppercase tracking-[0.25em] text-white/60">{label}</div>
                  <div className="mt-1 text-lg font-bold">{value}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        <div className="mt-5 grid gap-5 xl:grid-cols-[1.22fr_0.78fr]">
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {quickStats.map((card) => {
                const CardIcon = card.icon;
                return (
                  <div key={card.label} className="border-2 border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{card.label}</div>
                      <div className="flex h-9 w-9 items-center justify-center bg-slate-100 text-slate-700">
                        <CardIcon className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="mt-3 text-2xl font-black text-slate-900">{card.value}</div>
                  </div>
                );
              })}
            </div>

            <div className="overflow-hidden border-2 border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Live demo</div>
                    <h2 className="mt-1 text-xl font-bold text-slate-900">Step by step training</h2>
                  </div>
                  <div className="inline-flex items-center gap-2 border-2 border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-700">
                    Step {step + 1} of {steps.length}
                  </div>
                </div>
              </div>

              <div className="px-5 pt-5">
                <div className="h-2 w-full overflow-hidden bg-slate-200">
                  <motion.div
                    className="h-full bg-gradient-to-r from-[#23205C] via-[#E0222A] to-[#E0222A]"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.45, ease: "easeOut" }}
                  />
                </div>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  variants={panelMotion}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.35 }}
                  className="p-5"
                >
                  <div className="border-2 border-slate-200 bg-[#fdfdff] p-5">
                    <div className="flex items-start gap-4">
                      <motion.div
                        animate={reduceMotion ? undefined : { y: [0, -6, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="flex h-14 w-14 items-center justify-center bg-[#23205C] text-white shadow-sm"
                      >
                        <Icon className="h-7 w-7" />
                      </motion.div>
                      <div className="flex-1">
                        <h3 className="text-2xl font-black text-slate-900">{current.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{current.desc}</p>
                      </div>
                    </div>

                    <div className="mt-5 border border-amber-200 bg-amber-50 px-4 py-4">
                      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-700">
                        <BadgeInfo className="h-4 w-4" />
                        Example
                      </div>
                      <p className="text-sm leading-6 text-slate-700">{current.example}</p>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      {current.points.map((p, idx) => (
                        <motion.div
                          key={p}
                          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.08 }}
                          whileHover={reduceMotion ? undefined : { y: -2, scale: 1.01 }}
                          className="border-2 border-slate-200 bg-white p-4"
                        >
                          <div className="mb-2 flex items-center gap-2 text-[#23205C]">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="text-sm font-semibold">Step</span>
                          </div>
                          <div className="text-sm text-slate-700">{p}</div>
                        </motion.div>
                      ))}
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                      <div className="border-2 border-[#23205C]/20 bg-[#23205C]/5 p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-[#23205C]">
                          <MonitorSmartphone className="h-4 w-4" />
                          Teacher Note
                        </div>
                        <p className="mt-2 text-sm text-slate-700">
                          “Pehle code likho, phir verify karo, uske baad save karo” — is tarah bolkar demo dikhao.
                        </p>
                      </div>
                      <div className="border-2 border-[#E0222A]/20 bg-[#E0222A]/5 p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-[#E0222A]">
                          <Layers3 className="h-4 w-4" />
                          Flow
                        </div>
                        <p className="mt-2 text-sm text-slate-700">
                          Scanner → Verify → Save Entry → Hall Check → Logs → Export.
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>

              <div className="flex flex-wrap gap-3 border-t border-slate-200 p-5">
                <button
                  type="button"
                  onClick={goPrev}
                  className="border-2 border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <ChevronLeft className="mr-1 inline h-4 w-4" />
                  Prev
                </button>
                <button
                  type="button"
                  onClick={togglePlay}
                  className="border-2 border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {playing ? <Pause className="mr-1 inline h-4 w-4" /> : <Play className="mr-1 inline h-4 w-4" />}
                  {playing ? "Pause" : "Play"}
                </button>
                <button
                  type="button"
                  onClick={restart}
                  className="border-2 border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <RotateCcw className="mr-1 inline h-4 w-4" />
                  Restart
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  className="border-2 border-[#E0222A] bg-[#E0222A] px-5 py-3 font-semibold text-white shadow-sm"
                >
                  Next
                  <ChevronRight className="ml-1 inline h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {showSidebar && (
            <div className="space-y-5">
              <div className="border-2 border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-900">Training Map</h2>
                  <div className="border-2 border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                    Auto guided
                  </div>
                </div>

                <div className="space-y-3">
                  {steps.map((s, idx) => {
                    const ActiveIcon = s.icon;
                    const active = idx === step;
                    return (
                      <motion.button
                        key={s.title}
                        type="button"
                        whileHover={{ x: 4 }}
                        onClick={() => setStep(idx)}
                        className={`w-full border-2 p-4 text-left transition ${
                          active ? "border-[#23205C] bg-[#23205C]/5" : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`flex h-10 w-10 items-center justify-center ${
                              active ? "bg-[#23205C] text-white" : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            <ActiveIcon className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between gap-3">
                              <div className="font-semibold text-slate-900">{s.title}</div>
                              {active && <ArrowRight className="h-4 w-4 text-[#E0222A]" />}
                            </div>
                            <p className="mt-1 text-sm text-slate-600">{s.desc}</p>
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              <div className="border-2 border-[#E0222A]/20 bg-[#E0222A]/5 p-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#E0222A]">
                  <CheckCircle2 className="h-4 w-4" />
                  Ready for training
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  Ye page auto chal raha hai. Har step me example diya gaya hai, isliye ye demo training ke liye perfect hai.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}