"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { setSession } from "@/lib/auth";
import { KeyRound, Mail, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

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
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  // Field validation status
  const isEmail = identifier.includes("@");
  const isIdentifierValid = identifier.trim().length >= 3;
  const isPasswordValid = password.length >= 6;
  const isFormValid = isIdentifierValid && isPasswordValid && !loading;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isFormValid) return;

    setLoading(true);
    setMessage(null);
    setIsError(false);

    try {
      const payload = await apiFetch<LoginResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ identifier: identifier.trim(), password })
      });
      
      setSession(payload.access_token, payload.role);
      setIsError(false);
      setMessage(`Signed in as ${payload.role}. Redirecting...`);
      
      setTimeout(() => {
        window.location.href =
          payload.role === "student"
            ? "/dashboard"
            : payload.role === "superadmin"
              ? "/superadmin"
              : "/teacher";
      }, 1000);
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "Authentication failed. Please check credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={onSubmit} noValidate>
      {/* Username or Email Input */}
      <div>
        <label 
          htmlFor="identifier" 
          className="block text-xs font-bold uppercase tracking-wider text-slate-500"
        >
          Username or Email Address
        </label>
        <div className="relative mt-2">
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400">
            <Mail className="h-4.5 w-4.5" />
          </div>
          <input
            id="identifier"
            type="text"
            required
            autoFocus
            aria-required="true"
            aria-invalid={identifier.length > 0 && !isIdentifierValid}
            placeholder="john.doe@college.edu or johndoe"
            value={identifier}
            onChange={(e) => {
              setIdentifier(e.target.value);
              if (message) setMessage(null);
            }}
            className={`w-full rounded-2xl border bg-slate-50/50 py-3.5 pl-11 pr-4 text-sm font-medium text-slate-800 transition-all outline-none focus:bg-white focus:ring-2 ${
              identifier.length > 0 && !isIdentifierValid 
                ? "border-rose-300 focus:ring-rose-200" 
                : "border-slate-200 focus:border-indigo-500 focus:ring-indigo-100"
            }`}
            autoComplete={isEmail ? "email" : "username"}
          />
        </div>
        {identifier.length > 0 && !isIdentifierValid && (
          <p className="mt-1.5 text-xs text-rose-500 font-medium">Identifier is too short.</p>
        )}
      </div>

      {/* Password Input */}
      <div>
        <div className="flex items-center justify-between">
          <label 
            htmlFor="password" 
            className="block text-xs font-bold uppercase tracking-wider text-slate-500"
          >
            Password
          </label>
          <a
            href="/forgot-password"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition"
          >
            Forgot Password?
          </a>
        </div>
        <div className="relative mt-2">
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400">
            <KeyRound className="h-4.5 w-4.5" />
          </div>
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            required
            aria-required="true"
            aria-invalid={password.length > 0 && !isPasswordValid}
            placeholder="••••••••"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (message) setMessage(null);
            }}
            className={`w-full rounded-2xl border bg-slate-50/50 py-3.5 pl-11 pr-12 text-sm font-medium text-slate-800 transition-all outline-none focus:bg-white focus:ring-2 ${
              password.length > 0 && !isPasswordValid 
                ? "border-rose-300 focus:ring-rose-200" 
                : "border-slate-200 focus:border-indigo-500 focus:ring-indigo-100"
            }`}
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-slate-600 transition"
          >
            {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
          </button>
        </div>
        {password.length > 0 && !isPasswordValid && (
          <p className="mt-1.5 text-xs text-rose-500 font-medium">Password must be at least 6 characters.</p>
        )}
      </div>

      {/* Message feedback card */}
      {message && (
        <div
          role="alert"
          aria-live="assertive"
          className={`flex items-start gap-2.5 rounded-2xl border p-4 text-xs font-semibold leading-relaxed shadow-sm ${
            !isError
              ? "border-emerald-100 bg-emerald-50 text-emerald-700"
              : "border-rose-100 bg-rose-50 text-rose-700 animate-shake"
          }`}
        >
          {isError ? <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /> : <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />}
          <span>{message}</span>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!isFormValid}
        className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-indigo-600 py-3.5 text-sm font-bold text-white shadow-md shadow-indigo-500/10 transition-all duration-200 hover:from-indigo-600 hover:to-indigo-700 hover:shadow-lg disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Establishing JWT Session...</span>
          </>
        ) : (
          <span>Authenticate & Access Portal</span>
        )}
      </button>

      {/* Footer redirect */}
      <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-400">
        <span>No credentials yet? </span>
        <a href="/signup" className="font-bold text-indigo-600 hover:text-indigo-700 transition">
          Create student account
        </a>
      </div>
    </form>
  );
}