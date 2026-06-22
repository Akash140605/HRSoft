import React, { useState } from "react";
import { useHR } from "../context/HRContext";
import {
  Loader2,
  Eye,
  EyeOff,
  ShieldCheck,
  LogIn,
  GraduationCap,
  Sparkles,
  ArrowRight,
} from "lucide-react";

export default function LoginScreen({ onOpenTraining }) {
  const { state, login } = useHR();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const validate = () => {
    if (!username.trim()) return "Username is required.";
    if (!password.trim()) return "Password is required.";
    return "";
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setMsg("");

    const error = validate();
    if (error) {
      setMsg(error);
      return;
    }

    setLoading(true);
    try {
      const res = await Promise.resolve(login(username, password));
      setMsg(res?.message || (res?.ok ? "Login successful." : "Login failed."));
      if (res?.ok) {
        setPassword("");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-white px-4 py-6 text-slate-900 sm:px-6 sm:py-8 lg:px-8">
      <style>{`
        @keyframes driftX {
          0% { background-position: 0 0, 0 0; }
          100% { background-position: 120px 0, 0 0; }
        }
        @keyframes driftY {
          0% { background-position: 0 0, 0 0; }
          100% { background-position: 0 120px, 0 0; }
        }
        @keyframes floatBlob {
          0%,100% { transform: translate3d(0,0,0) scale(1); }
          50% { transform: translate3d(0,-14px,0) scale(1.03); }
        }
        @keyframes pulseRing {
          0% { transform: scale(0.985); opacity: 0.45; }
          70% { transform: scale(1.03); opacity: 0; }
          100% { transform: scale(1.03); opacity: 0; }
        }
        @keyframes shine {
          0% { transform: translateX(-140%); }
          100% { transform: translateX(140%); }
        }
      `}</style>

      <div className="absolute inset-0 bg-white" />

      <div
        className="absolute inset-0 opacity-[0.16] sm:opacity-[0.22]"
        aria-hidden="true"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(35,32,92,0.10) 1px, transparent 1px), linear-gradient(to bottom, rgba(35,32,92,0.10) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          animation: "driftX 28s linear infinite",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.12] sm:opacity-[0.18]"
        aria-hidden="true"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(224,34,42,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(224,34,42,0.08) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          animation: "driftY 34s linear infinite reverse",
        }}
      />

      <div
        className="absolute -top-16 left-[-30px] h-52 w-52 bg-[#23205C]/8 blur-3xl sm:h-72 sm:w-72"
        aria-hidden="true"
        style={{ animation: "floatBlob 8s ease-in-out infinite" }}
      />
      <div
        className="absolute bottom-[-30px] right-[-30px] h-56 w-56 bg-[#E0222A]/8 blur-3xl sm:h-80 sm:w-80"
        aria-hidden="true"
        style={{ animation: "floatBlob 10s ease-in-out infinite reverse" }}
      />

      <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-7xl items-center">
        <div className="grid w-full items-center gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
          <section className="order-2 lg:order-1">
            <div className="inline-flex items-center border border-slate-300 bg-white px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-700 shadow-sm sm:px-4">
              Dixon Attendance System
            </div>

            <div className="mt-8 sm:mt-10">
              <img
                src="/logod.png"
                alt="Dixon logo"
                className="block h-16 w-auto object-contain sm:h-24 lg:h-[clamp(6rem,14vw,12rem)]"
              />
            </div>

            <h1 className="mt-6 max-w-2xl text-3xl font-black leading-tight text-[#23205C] sm:text-4xl lg:text-6xl">
              Attendance and training access from a single interface.
            </h1>

            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600 sm:text-base lg:text-lg">
              Sign in to continue to the dashboard, or open the training module to review the guided workflow before login.
            </p>

            <div className="mt-6 max-w-xl sm:mt-8">
              <button
                type="button"
                onClick={() => onOpenTraining?.()}
                className="group relative inline-flex w-full items-start justify-between overflow-hidden border-2 border-[#E0222A] bg-white px-4 py-4 text-left shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#E0222A]/10 sm:px-5"
              >
                <span
                  className="pointer-events-none absolute inset-0"
                  aria-hidden="true"
                  style={{
                    animation: "pulseRing 2.4s ease-out infinite",
                    border: "2px solid rgba(224,34,42,0.20)",
                  }}
                />
                <span
                  className="pointer-events-none absolute inset-y-0 left-0 w-20 -skew-x-12 bg-gradient-to-r from-transparent via-[#E0222A]/10 to-transparent sm:w-24"
                  aria-hidden="true"
                  style={{ animation: "shine 2.8s linear infinite" }}
                />

                <span className="relative flex min-w-0 items-start gap-3 sm:gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center bg-[#E0222A] text-white shadow-sm sm:h-12 sm:w-12">
                    <GraduationCap className="h-5 w-5 sm:h-6 sm:w-6" />
                  </span>

                  <span className="min-w-0">
                    <span className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#E0222A] sm:text-[11px]">
                      <Sparkles className="h-3.5 w-3.5" />
                      Training Module
                    </span>
                    <span className="mt-2 block text-lg font-black text-[#23205C] sm:text-xl">
                      Open Training Preview
                    </span>
                    <span className="mt-1 block text-sm leading-6 text-slate-600">
                      Review the attendance, scanner, roster, and hall workflow in guided mode.
                    </span>
                  </span>
                </span>

                <ArrowRight className="relative mt-1 h-5 w-5 shrink-0 text-[#23205C] transition duration-300 group-hover:translate-x-1" />
              </button>
            </div>
          </section>

          <section className="order-1 lg:order-2">
            <div className="relative mx-auto w-full max-w-md border-2 border-[#E0222A] bg-white p-5 shadow-[0_20px_60px_rgba(0,0,0,0.10)] sm:p-6 lg:ml-auto lg:p-8">
              <div className="absolute -left-2 -top-2 hidden h-10 w-10 border-l-4 border-t-4 border-[#23205C] sm:block" />
              <div className="absolute -right-2 -bottom-2 hidden h-10 w-10 border-r-4 border-b-4 border-[#E0222A] sm:block" />

              <div className="mb-6 sm:mb-8">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-[#23205C] sm:text-[0.72rem]">
                  <ShieldCheck className="h-4 w-4" />
                  Secure Access
                </div>
                <h2 className="mt-3 text-2xl font-black text-[#23205C] sm:text-3xl">
                  Login
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Enter your credentials to continue.
                </p>
              </div>

              <form className="space-y-4 sm:space-y-5" onSubmit={handleLogin} noValidate>
                <div>
                  <label
                    htmlFor="username"
                    className="mb-2 block text-sm font-semibold text-slate-800"
                  >
                    Username
                  </label>
                  <input
                    id="username"
                    name="username"
                    autoComplete="username"
                    className="w-full border-2 border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition duration-200 hover:border-slate-400 focus:border-[#E0222A] focus:ring-4 focus:ring-[#E0222A]/10"
                    placeholder="Enter username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-semibold text-slate-800"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      autoComplete="current-password"
                      className="w-full border-2 border-slate-300 bg-white px-4 py-3 pr-12 text-slate-900 outline-none transition duration-200 hover:border-slate-400 focus:border-[#E0222A] focus:ring-4 focus:ring-[#E0222A]/10"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 transition hover:text-slate-700"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex w-full items-center justify-center gap-2 border-2 border-[#23205C] bg-[#23205C] px-4 py-3 font-semibold text-white transition hover:translate-y-[-1px] hover:shadow-lg hover:shadow-[#23205C]/20 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LogIn className="h-4 w-4" />
                  )}
                  {loading ? "Signing in..." : "Login"}
                </button>
              </form>

              {msg && (
                <div
                  role="alert"
                  className={`mt-4 border-2 px-4 py-3 text-sm sm:mt-5 ${
                    msg.toLowerCase().includes("success")
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                      : "border-[#E0222A] bg-[#E0222A]/10 text-[#E0222A]"
                  }`}
                >
                  {msg}
                </div>
              )}

              <div className="mt-5 flex flex-col gap-2 text-xs text-slate-500 sm:mt-6 sm:flex-row sm:items-center sm:justify-between">
                <span className="font-medium">
                  Current role: <span className="text-slate-700">{state.currentRole}</span>
                </span>
                <span className="inline-flex w-fit border border-slate-300 bg-white px-3 py-1 font-medium text-slate-600">
                  Protected Area
                </span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}