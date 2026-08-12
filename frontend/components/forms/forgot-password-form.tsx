"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { Mail, Sparkles, Loader2, AlertCircle, ArrowRight } from "lucide-react";

type ForgotResponse = {
  status: string;
  email: string;
  otp: string;
};

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [otp, setOtp] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    setOtp(null);
    try {
      const payload = await apiFetch<ForgotResponse>("/api/auth/password/forgot", {
        method: "POST",
        body: JSON.stringify({ email })
      });
      setOtp(payload.otp);
      setMessage(`Security key generated. Provide the OTP on the next screen.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      {/* Email Input Field */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
          Registered Email Address
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
            className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-3.5 pl-11 pr-4 text-sm font-medium text-slate-800 transition placeholder:text-slate-400 focus:bg-white focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Dynamic Action Response Message */}
      {message ? (
        <div className={`flex items-start gap-2.5 rounded-2xl border p-4 text-xs font-semibold leading-relaxed ${
          otp 
            ? "border-emerald-100 bg-emerald-50 text-emerald-700 shadow-sm"
            : "border-rose-100 bg-rose-50 text-rose-700 shadow-sm animate-shake"
        }`}>
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{message}</span>
        </div>
      ) : null}

      {/* Beautiful Debug OTP card if active */}
      {otp ? (
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 text-xs shadow-sm">
          <div className="font-bold text-indigo-800 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5 text-indigo-500 animate-pulse" />
            <span>Simulated OTP Verification Key</span>
          </div>
          <div className="text-slate-600">
            Passkey OTP: <span className="font-extrabold text-slate-800 tracking-wider text-base">{otp}</span>
          </div>
        </div>
      ) : null}

      {/* Actions Grid */}
      <div className="space-y-3">
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/25 transition-all duration-200 hover:from-indigo-700 hover:to-indigo-800 hover:shadow-xl hover:shadow-indigo-600/30 active:scale-[0.98] disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Verifying Identity...</span>
            </>
          ) : (
            <span>Send OTP Key</span>
          )}
        </button>


        {otp && (
          <a
            href={`/reset-password?email=${encodeURIComponent(email)}`}
            className="w-full flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3.5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition"
          >
            <span>Proceed to Reset</span>
            <ArrowRight className="h-4 w-4" />
          </a>
        )}
      </div>

      {/* Footer redirection link */}
      <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-400">
        <a href="/login" className="font-bold text-indigo-600 hover:text-indigo-700 transition">
          Return to sign in
        </a>
      </div>
    </form>
  );
}
