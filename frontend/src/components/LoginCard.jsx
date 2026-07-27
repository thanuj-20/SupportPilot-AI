import { useState } from "react";

export default function LoginCard({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = (u = username, p = password) => {
    setLoading(true);
    setError("");
    setTimeout(() => {
      const ok = onLogin(u, p);
      if (!ok) setError("Invalid username or password.");
      setLoading(false);
    }, 400);
  };

  const fillAndLogin = () => {
    setUsername("admin");
    setPassword("admin123");
    setTimeout(() => handleSubmit("admin", "admin123"), 50);
  };

  return (
    <div className="w-full max-w-md">
      {/* Logo + Title */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 shadow-lg mb-4">
          <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M9 12h6m-3-3v6M3 12a9 9 0 1118 0A9 9 0 013 12z" />
          </svg>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">SupportPilot</h1>
        <p className="text-blue-300 text-sm mt-1 font-medium">AI Ticket Resolution Agent</p>
      </div>

      {/* Card */}
      <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl p-8 space-y-5">
        <h2 className="text-lg font-semibold text-white">Sign in to your account</h2>

        {/* Username */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Username</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-gray-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="Enter username"
              className="w-full bg-gray-900 border border-gray-600 text-white placeholder-gray-500 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Password</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-gray-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="Enter password"
              className="w-full bg-gray-900 border border-gray-600 text-white placeholder-gray-500 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 bg-red-900/40 border border-red-700 text-red-300 rounded-lg px-3 py-2 text-sm">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            {error}
          </div>
        )}

        {/* Login Button */}
        <button
          onClick={() => handleSubmit()}
          disabled={loading}
          className="w-full py-2.5 rounded-lg font-semibold text-sm text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:opacity-50 transition-all shadow-lg shadow-blue-900/40 active:scale-95"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Signing in…
            </span>
          ) : "Login"}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-700" />
          <span className="text-xs text-gray-500">Demo Credentials</span>
          <div className="flex-1 h-px bg-gray-700" />
        </div>

        {/* Demo Credentials Box */}
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Demo Admin Login</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-xs text-gray-500">Username</p>
              <p className="text-white font-mono font-medium">admin</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Password</p>
              <p className="text-white font-mono font-medium">admin123</p>
            </div>
          </div>
          <button
            onClick={fillAndLogin}
            className="w-full py-2 rounded-lg text-sm font-semibold text-blue-400 border border-blue-700 hover:bg-blue-900/30 transition-colors active:scale-95"
          >
            Login as Demo Admin
          </button>
        </div>
      </div>
    </div>
  );
}
