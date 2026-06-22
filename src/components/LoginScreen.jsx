import React, { useState } from "react";
import { useHR } from "../context/HRContext";
import { Loader2, Eye, EyeOff, ShieldCheck, LogIn } from "lucide-react";

export default function LoginScreen() {
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
    <div className="relative min-h-screen overflow-hidden bg-white text-slate-900 flex items-center justify-center px-4 py-8">
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
          50% { transform: translate3d(0,-18px,0) scale(1.04); }
        }
      `}</style>

      <div className="absolute inset-0 bg-white" />
      <div
        className="absolute inset-0 opacity-[0.22]"
        aria-hidden="true"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(35,32,92,0.10) 1px, transparent 1px), linear-gradient(to bottom, rgba(35,32,92,0.10) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          animation: "driftX 28s linear infinite",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.18]"
        aria-hidden="true"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(224,34,42,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(224,34,42,0.08) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          animation: "driftY 34s linear infinite reverse",
        }}
      />
      <div
        className="absolute -top-24 left-[-40px] h-72 w-72 bg-[#23205C]/8 blur-3xl"
        aria-hidden="true"
        style={{ animation: "floatBlob 8s ease-in-out infinite" }}
      />
      <div
        className="absolute bottom-[-40px] right-[-50px] h-80 w-80 bg-[#E0222A]/8 blur-3xl"
        aria-hidden="true"
        style={{ animation: "floatBlob 10s ease-in-out infinite reverse" }}
      />

      <div className="relative w-full max-w-7xl">
        <div className="grid items-center gap-12 lg:grid-cols-[1.25fr_0.85fr]">
          <div className="order-2 lg:order-1">
            <div className="inline-flex items-center border border-slate-300 bg-white px-4 py-2 text-xs font-semibold tracking-[0.2em] text-slate-700 shadow-sm">
              Dixon Attendance System
            </div>

            <div className="mt-10 max-w-5xl">
              <div className="flex items-end gap-5 leading-none flex-wrap">
                <img
                  src="/logod.png"
                  alt="Dixon logo"
                  className="block h-[clamp(5rem,16vw,13rem)] w-auto select-none object-contain"
                />
              </div>
            </div>

            <p className="mt-6 max-w-xl text-base md:text-lg text-slate-600 leading-7">
              Login as User, HR, or Admin to access the attendance dashboard.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <span className="border border-slate-300 bg-white px-4 py-2 text-sm text-slate-600">User</span>
              <span className="border border-slate-300 bg-white px-4 py-2 text-sm text-slate-600">HR</span>
              <span className="border border-slate-300 bg-white px-4 py-2 text-sm text-slate-600">Admin</span>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <div className="relative ml-auto w-full max-w-md border-2 border-[#E0222A] bg-white p-6 md:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.10)]">
              <div className="absolute -left-2 -top-2 h-10 w-10 border-l-4 border-t-4 border-[#23205C]" />
              <div className="absolute -right-2 -bottom-2 h-10 w-10 border-r-4 border-b-4 border-[#E0222A]" />

              <div className="mb-8">
                <div className="flex items-center gap-2 text-[0.72rem] font-semibold uppercase tracking-[0.35em] text-[#23205C]">
                  <ShieldCheck className="h-4 w-4" />
                  Secure Access
                </div>
                <h2 className="mt-3 text-3xl font-black text-[#23205C]">Login</h2>
                <p className="mt-2 text-sm text-slate-600">Enter your credentials to continue.</p>
              </div>

              <form className="space-y-5" onSubmit={handleLogin} noValidate>
                <div>
                  <label htmlFor="username" className="mb-2 block text-sm font-semibold text-slate-800">
                    Username
                  </label>
                  <input
                    id="username"
                    name="username"
                    autoComplete="username"
                    className="w-full border-2 border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition duration-200 hover:border-slate-400 focus:border-[#E0222A] focus:ring-4 focus:ring-[#E0222A]/10"
                    placeholder="user1 / hr1 / admin1"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>

                <div>
                  <label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-800">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      autoComplete="current-password"
                      className="w-full border-2 border-slate-300 bg-white px-4 py-3 pr-12 text-slate-900 outline-none transition duration-200 hover:border-slate-400 focus:border-[#E0222A] focus:ring-4 focus:ring-[#E0222A]/10"
                      type={showPassword ? "text" : "password"}
                      placeholder="user123 / hr123 / admin123"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 hover:text-slate-700"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex w-full items-center justify-center gap-2 border-2 border-[#23205C] bg-[#23205C] px-4 py-3 font-semibold text-white transition hover:translate-y-[-1px] hover:shadow-lg hover:shadow-[#23205C]/20 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                  {loading ? "Logging in..." : "Login"}
                </button>
              </form>

              {msg && (
                <div
                  role="alert"
                  className={`mt-5 border-2 px-4 py-3 text-sm ${
                    msg.toLowerCase().includes("success")
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                      : "border-[#E0222A] bg-[#E0222A]/10 text-[#E0222A]"
                  }`}
                >
                  {msg}
                </div>
              )}

              <div className="mt-6 flex items-center justify-between text-xs text-slate-500">
                <span className="font-medium">
                  Current role: <span className="text-slate-700">{state.currentRole}</span>
                </span>
                <span className="border border-slate-300 bg-white px-3 py-1 font-medium text-slate-600">
                  Protected Area
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}