"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { setSession } from "@/lib/auth";
import { KeyRound, Mail, Eye, EyeOff, Loader2, AlertCircle, Sparkles, User, ShieldCheck, GraduationCap } from "lucide-react";

type LoginResponse = {
  status: string;
  role: "student" | "teacher" | "superadmin";
  access_token: string;
};

export function LoginForm({
  mode = "student"
}: Readonly<{
  mode?: "student" | "admin";
}>) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function fillDemo(usernameStr: string, passStr: string) {
    setIdentifier(usernameStr);
    setPassword(passStr);
    setMessage(`Filled credentials for '${usernameStr}'. Click 'Authenticate & Access' below.`);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const payload = await apiFetch<LoginResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ identifier, password })
      });
      setSession(payload.access_token, payload.role);
      setMessage(`Signed in as ${payload.role}. Redirecting...`);
      window.location.href =
        payload.role === "student"
          ? "/dashboard"
          : payload.role === "superadmin"
            ? "/superadmin"
            : "/teacher";
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      
      {/* Quick Demo Login Bar */}
      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-3.5 text-xs">
        <div className="flex items-center justify-between mb-2">
          <span className="font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5 text-[10px]">
            <Sparkles className="h-3.5 w-3.5 text-indigo-500 animate-pulse" />
            <span>Quick Demo Credentials</span>
          </span>
          <span className="text-[10px] font-bold text-indigo-600 bg-white px-2 py-0.5 rounded-full border border-indigo-100">1-Click Fill</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5 font-bold">
          <button
            type="button"
            onClick={() => fillDemo("jignesh", "12345678")}
            className="flex items-center justify-center gap-1 rounded-xl bg-white border border-indigo-100 px-2 py-1.5 text-[11px] text-slate-700 hover:bg-indigo-600 hover:text-white transition shadow-sm"
          >
            <GraduationCap className="h-3 w-3" />
            <span>Student</span>
          </button>
          <button
            type="button"
            onClick={() => fillDemo("admin", "12345678")}
            className="flex items-center justify-center gap-1 rounded-xl bg-white border border-indigo-100 px-2 py-1.5 text-[11px] text-slate-700 hover:bg-indigo-600 hover:text-white transition shadow-sm"
          >
            <User className="h-3 w-3" />
            <span>Teacher</span>
          </button>
          <button
            type="button"
            onClick={() => fillDemo("superadmin", "12345678")}
            className="flex items-center justify-center gap-1 rounded-xl bg-white border border-indigo-100 px-2 py-1.5 text-[11px] text-slate-700 hover:bg-indigo-600 hover:text-white transition shadow-sm"
          >
            <ShieldCheck className="h-3 w-3" />
            <span>SuperAdmin</span>
          </button>
        </div>
      </div>

      {/* Identifier Input */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
          Username or Email Address
        </label>
        <div className="relative mt-2">
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400">
            <Mail className="h-4 w-4" />
          </div>
          <input
            type="text"
            required
            placeholder="e.g. jignesh or admin"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-3.5 pl-11 pr-4 text-sm font-medium text-slate-800 transition placeholder:text-slate-400 focus:bg-white focus:border-indigo-500"
            autoComplete="username"
          />
        </div>
      </div>

      {/* Password Input */}
      <div>
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
            Password
          </label>
          <a
            href="/forgot-password"
            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition"
          >
            Forgot?
          </a>
        </div>
        <div className="relative mt-2">
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400">
            <KeyRound className="h-4 w-4" />
          </div>
          <input
            type={showPassword ? "text" : "password"}
            required
            placeholder="••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-3.5 pl-11 pr-12 text-sm font-medium text-slate-800 transition placeholder:text-slate-400 focus:bg-white focus:border-indigo-500"
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-slate-600 transition"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Message feedback card */}
      {message ? (
        <div className={`flex items-start gap-2.5 rounded-2xl border p-4 text-xs font-semibold leading-relaxed ${
          message.includes("Redirecting") || message.includes("Filled")
            ? "border-emerald-100 bg-emerald-50 text-emerald-700 shadow-sm"
            : "border-rose-100 bg-rose-50 text-rose-700 shadow-sm animate-shake"
        }`}>
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{message}</span>
        </div>
      ) : null}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/25 transition-all duration-200 hover:from-indigo-700 hover:to-indigo-800 hover:shadow-xl hover:shadow-indigo-600/30 active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Establishing Session...</span>
          </>
        ) : (
          <span>Authenticate &amp; Access</span>
        )}
      </button>

      {/* Footer redirection link */}
      <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-400">
        <span>Need a student account? </span>
        <a href="/signup" className="font-bold text-indigo-600 hover:text-indigo-700 transition">
          Register new student
        </a>
      </div>
    </form>
  );
}

