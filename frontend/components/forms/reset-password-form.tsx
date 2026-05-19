"use client";

import type { FormEvent } from "react";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Mail, KeyRound, Lock, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const payload = await apiFetch<{ status: string; message: string }>("/api/auth/password/reset", {
        method: "POST",
        body: JSON.stringify({ email, otp, new_password: newPassword })
      });
      setMessage(payload.message + " Redirecting in 1.5 seconds...");
      setTimeout(() => {
        window.location.href = "/login";
      }, 1500);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Reset failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      {/* Email Input Field */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
          Email Address
        </label>
        <div className="relative mt-2">
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400">
            <Mail className="h-4 w-4" />
          </div>
          <input
            type="email"
            required
            placeholder="e.g. john@college.edu"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-3.5 pl-11 pr-4 text-sm font-medium text-slate-800 transition placeholder:text-slate-400 focus:bg-white"
          />
        </div>
      </div>

      {/* OTP Code Field */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
          Reset OTP Code
        </label>
        <div className="relative mt-2">
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400">
            <KeyRound className="h-4 w-4" />
          </div>
          <input
            type="text"
            required
            placeholder="Enter security key"
            value={otp}
            onChange={(event) => setOtp(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-3.5 pl-11 pr-4 text-sm font-medium text-slate-800 transition placeholder:text-slate-400 focus:bg-white"
          />
        </div>
      </div>

      {/* New Password Input Field */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
          New Secure Password
        </label>
        <div className="relative mt-2">
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400">
            <Lock className="h-4 w-4" />
          </div>
          <input
            type={showPassword ? "text" : "password"}
            required
            placeholder="••••••••"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-3.5 pl-11 pr-12 text-sm font-medium text-slate-800 transition placeholder:text-slate-400 focus:bg-white"
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

      {/* Dynamic Action Response Message */}
      {message ? (
        <div className={`flex items-start gap-2.5 rounded-2xl border p-4 text-xs font-semibold leading-relaxed ${
          message.toLowerCase().includes("redirecting") 
            ? "border-emerald-100 bg-emerald-50 text-emerald-700 shadow-sm"
            : "border-rose-100 bg-rose-50 text-rose-700 shadow-sm"
        }`}>
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{message}</span>
        </div>
      ) : null}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-indigo-600 py-3.5 text-sm font-bold text-white shadow-md transition hover:from-indigo-600 hover:to-indigo-700 active:scale-[0.98] disabled:opacity-60"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Establishing New Password...</span>
          </>
        ) : (
          <span>Update Credentials</span>
        )}
      </button>

      {/* Footer redirection link */}
      <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-400">
        <a href="/login" className="font-bold text-indigo-600 hover:text-indigo-700 transition">
          Return to sign in
        </a>
      </div>
    </form>
  );
}
