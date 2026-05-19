"use client";

import { useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { 
  User, 
  Mail, 
  Phone, 
  Shield, 
  BookOpen, 
  GraduationCap, 
  Lock, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  Smartphone, 
  UserCheck, 
  AlertCircle
} from "lucide-react";

type StartResponse = {
  status: string;
  registration_id: number;
  email_otp: string;
  phone_otp: string;
  message: string;
};

type OTPResponse = {
  status: string;
  message: string;
};

type CompleteResponse = {
  status: string;
  user_id: number;
  username: string;
};

export function SignupForm() {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [seatNo, setSeatNo] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [college, setCollege] = useState("");
  const [course, setCourse] = useState("");
  const [sem, setSem] = useState("");
  const [password, setPassword] = useState("");
  
  const [registrationId, setRegistrationId] = useState<number | null>(null);
  const [emailOtp, setEmailOtp] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [serverEmailOtp, setServerEmailOtp] = useState<string | null>(null);
  const [serverPhoneOtp, setServerPhoneOtp] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);

  const colleges = useMemo(
    () => ["SDJ International College", "Navyug Science College", "VNSGU Department of ICT", "Sutex Bank College"],
    []
  );
  const courses = useMemo(() => ["BCA", "BBA", "B.Com"], []);
  const semesters = useMemo(() => ["Sem 1", "Sem 2", "Sem 3", "Sem 4", "Sem 5", "Sem 6"], []);

  async function startRegistration() {
    setLoading(true);
    setMessage(null);
    try {
      const payload = await apiFetch<StartResponse>("/api/auth/register/start", {
        method: "POST",
        body: JSON.stringify({ 
          full_name: fullName, 
          username, 
          seat_no: seatNo, 
          email, 
          phone, 
          college, 
          course, 
          sem, 
          password 
        })
      });
      setRegistrationId(payload.registration_id);
      setServerEmailOtp(payload.email_otp);
      setServerPhoneOtp(payload.phone_otp);
      setMessage(payload.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Registration start failed");
    } finally {
      setLoading(false);
    }
  }

  async function verifyEmail() {
    if (registrationId == null) return;
    setLoading(true);
    setMessage(null);
    try {
      await apiFetch<OTPResponse>("/api/auth/register/verify-email-otp", {
        method: "POST",
        body: JSON.stringify({ registration_id: registrationId, contact: email, otp: emailOtp })
      });
      setEmailVerified(true);
      setMessage("Email address verified successfully.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Email verification failed");
    } finally {
      setLoading(false);
    }
  }

  async function verifyPhone() {
    if (registrationId == null) return;
    setLoading(true);
    setMessage(null);
    try {
      await apiFetch<OTPResponse>("/api/auth/register/verify-phone-otp", {
        method: "POST",
        body: JSON.stringify({ registration_id: registrationId, contact: phone, otp: phoneOtp })
      });
      setPhoneVerified(true);
      setMessage("Mobile number verified successfully.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Phone verification failed");
    } finally {
      setLoading(false);
    }
  }

  async function completeRegistration() {
    if (registrationId == null) return;
    setLoading(true);
    setMessage(null);
    try {
      const payload = await apiFetch<CompleteResponse>("/api/auth/register/complete", {
        method: "POST",
        body: JSON.stringify({ registration_id: registrationId })
      });
      setMessage(`Registration complete for ${payload.username}. Redirecting...`);
      setTimeout(() => {
        window.location.href = "/login";
      }, 1500);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Completion failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      
      {/* Visual Step Indicator Banner */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Account Setup
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-600">
          <Sparkles className="h-3 w-3 animate-pulse" />
          <span>{registrationId ? "Step 2: Verification" : "Step 1: Details"}</span>
        </div>
      </div>

      {!registrationId ? (
        /* PHASE 1: Fill details form */
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full Name" value={fullName} onChange={setFullName} icon={<User className="h-4 w-4" />} placeholder="John Doe" />
            <Field label="Desired Username" value={username} onChange={setUsername} icon={<UserCheck className="h-4 w-4" />} placeholder="johndoe12" />
            <Field label="Seat Number" value={seatNo} onChange={setSeatNo} icon={<Shield className="h-4 w-4" />} placeholder="E23BCA091" />
            <Field label="Email Address" type="email" value={email} onChange={setEmail} icon={<Mail className="h-4 w-4" />} placeholder="john@college.edu" />
            <Field label="Mobile Number" value={phone} onChange={setPhone} icon={<Smartphone className="h-4 w-4" />} placeholder="+919876543210" />
            <Field label="Choose Password" type="password" value={password} onChange={setPassword} icon={<Lock className="h-4 w-4" />} placeholder="••••••••" />
          </div>
          
          <div className="grid gap-4 sm:grid-cols-3">
            <SelectField label="College" value={college} onChange={setCollege} options={colleges} icon={<GraduationCap className="h-4 w-4" />} />
            <SelectField label="Course" value={course} onChange={setCourse} options={courses} icon={<BookOpen className="h-4 w-4" />} />
            <SelectField label="Semester" value={sem} onChange={setSem} options={semesters} icon={<Sparkles className="h-4 w-4" />} />
          </div>

          <button
            type="button"
            onClick={startRegistration}
            disabled={loading || !fullName || !username || !seatNo || !email || !phone || !password || !college || !course || !sem}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-indigo-600 py-3.5 text-sm font-bold text-white shadow-md shadow-indigo-500/10 transition hover:from-indigo-600 hover:to-indigo-700 hover:shadow-lg disabled:opacity-50 disabled:pointer-events-none"
          >
            <span>Initiate OTP Verification</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      ) : (
        /* PHASE 2: Verify OTPs */
        <div className="space-y-6">
          
          {/* Debugging OTP Showcase (Extremely Premium Glass Panel) */}
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 text-xs shadow-sm">
            <div className="font-bold text-indigo-800 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
              <span>Simulated Verification Keys</span>
            </div>
            <div className="grid grid-cols-2 gap-2 font-semibold text-indigo-700">
              <div>Registration ID: <span className="font-extrabold text-slate-800">{registrationId}</span></div>
              <div className="text-right">Portal Environment: <span className="text-emerald-600">Active</span></div>
              <div className="mt-1 bg-white/70 rounded-xl p-2.5 border border-indigo-100">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider">Email OTP</div>
                <div className="text-base font-extrabold text-slate-800 tracking-widest mt-0.5">{serverEmailOtp}</div>
              </div>
              <div className="mt-1 bg-white/70 rounded-xl p-2.5 border border-indigo-100">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider">Phone OTP</div>
                <div className="text-base font-extrabold text-slate-800 tracking-widest mt-0.5">{serverPhoneOtp}</div>
              </div>
            </div>
          </div>

          {/* OTP Verification Grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            
            {/* Email OTP Verification */}
            <div className={`rounded-3xl border p-5 transition-all ${
              emailVerified ? "border-emerald-100 bg-emerald-50/20" : "border-slate-100 bg-white"
            }`}>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Mail className="h-4 w-4 text-indigo-500" />
                  <span>Verify Email OTP</span>
                </h3>
                {emailVerified && <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />}
              </div>
              <input
                disabled={emailVerified}
                value={emailOtp}
                onChange={(event) => setEmailOtp(event.target.value)}
                placeholder="Enter Email Code"
                className="mt-3.5 w-full text-center tracking-widest font-extrabold text-lg rounded-2xl border border-slate-200 bg-slate-50/50 py-2.5 text-slate-800 focus:bg-white disabled:opacity-60"
              />
              <button
                type="button"
                onClick={verifyEmail}
                disabled={loading || emailVerified || !emailOtp}
                className="mt-3 w-full rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800 transition disabled:opacity-40"
              >
                {emailVerified ? "Verified ✓" : "Verify Email"}
              </button>
            </div>

            {/* Phone OTP Verification */}
            <div className={`rounded-3xl border p-5 transition-all ${
              phoneVerified ? "border-emerald-100 bg-emerald-50/20" : "border-slate-100 bg-white"
            }`}>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Smartphone className="h-4 w-4 text-indigo-500" />
                  <span>Verify Phone OTP</span>
                </h3>
                {phoneVerified && <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />}
              </div>
              <input
                disabled={phoneVerified}
                value={phoneOtp}
                onChange={(event) => setPhoneOtp(event.target.value)}
                placeholder="Enter Phone Code"
                className="mt-3.5 w-full text-center tracking-widest font-extrabold text-lg rounded-2xl border border-slate-200 bg-slate-50/50 py-2.5 text-slate-800 focus:bg-white disabled:opacity-60"
              />
              <button
                type="button"
                onClick={verifyPhone}
                disabled={loading || phoneVerified || !phoneOtp}
                className="mt-3 w-full rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800 transition disabled:opacity-40"
              >
                {phoneVerified ? "Verified ✓" : "Verify Phone"}
              </button>
            </div>
            
          </div>

          {/* Action Row */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setRegistrationId(null);
                setEmailVerified(false);
                setPhoneVerified(false);
              }}
              className="px-4 py-3 rounded-2xl border border-slate-200 bg-white text-xs font-bold text-slate-500 hover:bg-slate-50 transition"
            >
              Back
            </button>
            <button
              type="button"
              onClick={completeRegistration}
              disabled={loading || !emailVerified || !phoneVerified}
              className="flex-1 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 py-3 text-sm font-extrabold text-white shadow-md shadow-emerald-500/10 hover:from-emerald-600 hover:to-emerald-700 hover:shadow-lg transition disabled:opacity-50 disabled:pointer-events-none"
            >
              Finalize Registration
            </button>
          </div>
        </div>
      )}

      {/* Action Messages */}
      {message ? (
        <div className={`flex items-start gap-2.5 rounded-2xl border p-4 text-xs font-semibold leading-relaxed ${
          message.includes("complete") || message.includes("verified") || message.includes("generated")
            ? "border-emerald-100 bg-emerald-50 text-emerald-700"
            : "border-rose-100 bg-rose-50 text-rose-700"
        }`}>
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{message}</span>
        </div>
      ) : null}

      {/* Form Footer */}
      <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-400">
        <span>Already have an account? </span>
        <a href="/login" className="font-bold text-indigo-600 hover:text-indigo-700 transition">
          Sign in
        </a>
      </div>

    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  icon,
  placeholder,
  type = "text"
}: Readonly<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  icon: React.ReactNode;
  placeholder?: string;
  type?: string;
}>) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
        {label}
      </label>
      <div className="relative mt-2">
        <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400">
          {icon}
        </div>
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          required
          className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-3 pl-11 pr-4 text-sm font-medium text-slate-800 transition focus:bg-white placeholder:text-slate-300"
        />
      </div>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  icon
}: Readonly<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  icon: React.ReactNode;
}>) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
        {label}
      </label>
      <div className="relative mt-2">
        <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400">
          {icon}
        </div>
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required
          className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-3 pl-11 pr-4 text-sm font-medium text-slate-800 transition focus:bg-white focus:ring-0 outline-none appearance-none"
        >
          <option value="">Select...</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400 text-xs font-bold">
          ▼
        </div>
      </div>
    </div>
  );
}
