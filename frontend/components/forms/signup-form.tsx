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
  AlertCircle,
  Eye,
  EyeOff
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
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [showPassword, setShowPassword] = useState(false);
  const [registrationId, setRegistrationId] = useState<number | null>(null);
  const [emailOtp, setEmailOtp] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [serverEmailOtp, setServerEmailOtp] = useState<string | null>(null);
  const [serverPhoneOtp, setServerPhoneOtp] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);

  const colleges = useMemo(
    () => ["SDJ International College", "Navyug Science College", "VNSGU Department of ICT", "Sutex Bank College"],
    []
  );
  const courses = useMemo(() => ["BCA", "BBA", "B.Com"], []);
  const semesters = useMemo(() => ["Sem 1", "Sem 2", "Sem 3", "Sem 4", "Sem 5", "Sem 6"], []);

  // Validation Metrics
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isPhoneValid = /^\+?[0-9]{10,14}$/.test(phone);
  const isPasswordValid = password.length >= 6;
  const isPasswordMatch = password === confirmPassword;

  const isFormValid = 
    fullName.trim().length >= 2 &&
    username.trim().length >= 3 &&
    seatNo.trim().length >= 4 &&
    isEmailValid &&
    isPhoneValid &&
    isPasswordValid &&
    isPasswordMatch &&
    college !== "" &&
    course !== "" &&
    sem !== "" &&
    !loading;

  async function startRegistration() {
    if (!isFormValid) return;
    setLoading(true);
    setMessage(null);
    setIsError(false);

    try {
      const payload = await apiFetch<StartResponse>("/api/auth/register/start", {
        method: "POST",
        body: JSON.stringify({ 
          full_name: fullName.trim(), 
          username: username.trim(), 
          seat_no: seatNo.trim(), 
          email: email.trim(), 
          phone: phone.trim(), 
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
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "Registration initialization failed.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyEmail() {
    if (registrationId == null) return;
    setLoading(true);
    setMessage(null);
    setIsError(false);
    try {
      await apiFetch<OTPResponse>("/api/auth/register/verify-email-otp", {
        method: "POST",
        body: JSON.stringify({ registration_id: registrationId, contact: email, otp: emailOtp.trim() })
      });
      setEmailVerified(true);
      setMessage("Email verified successfully.");
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "Email code verification failed.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyPhone() {
    if (registrationId == null) return;
    setLoading(true);
    setMessage(null);
    setIsError(false);
    try {
      await apiFetch<OTPResponse>("/api/auth/register/verify-phone-otp", {
        method: "POST",
        body: JSON.stringify({ registration_id: registrationId, contact: phone, otp: phoneOtp.trim() })
      });
      setPhoneVerified(true);
      setMessage("Phone verified successfully.");
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "Phone code verification failed.");
    } finally {
      setLoading(false);
    }
  }

  async function completeRegistration() {
    if (registrationId == null) return;
    setLoading(true);
    setMessage(null);
    setIsError(false);
    try {
      const payload = await apiFetch<CompleteResponse>("/api/auth/register/complete", {
        method: "POST",
        body: JSON.stringify({ registration_id: registrationId })
      });
      setMessage(`Registration finalized for ${payload.username}. Redirecting to system login...`);
      setTimeout(() => {
        window.location.href = "/login";
      }, 1500);
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "Finalization workflow failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Account Setup
        </span>
        <div className="flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-600">
          <Sparkles className="h-3 w-3 animate-pulse" />
          <span>{registrationId ? "Step 2: Verification" : "Step 1: Details"}</span>
        </div>
      </div>

      {!registrationId ? (
        /* PHASE 1: FILL DETAILS FORM */
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full Name" value={fullName} onChange={setFullName} icon={<User className="h-4 w-4" />} placeholder="John Doe" />
            <Field label="Desired Username" value={username} onChange={setUsername} icon={<UserCheck className="h-4 w-4" />} placeholder="johndoe12" />
            <Field label="Seat Number" value={seatNo} onChange={setSeatNo} icon={<Shield className="h-4 w-4" />} placeholder="E23BCA091" />
            <Field 
              label="Email Address" 
              type="email" 
              value={email} 
              onChange={setEmail} 
              icon={<Mail className="h-4 w-4" />} 
              placeholder="john@college.edu" 
              error={email.length > 0 && !isEmailValid ? "Invalid academic email format" : undefined}
            />
            <Field 
              label="Mobile Number" 
              value={phone} 
              onChange={setPhone} 
              icon={<Smartphone className="h-4 w-4" />} 
              placeholder="e.g. +919876543210" 
              error={phone.length > 0 && !isPhoneValid ? "Include country code (+91)" : undefined}
            />
            
            {/* Password input with structural validation */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Choose Password</label>
              <div className="relative mt-2">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-3 pl-11 pr-12 text-sm font-medium text-slate-800 transition focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Field 
              label="Confirm Password" 
              type="password" 
              value={confirmPassword} 
              onChange={setConfirmPassword} 
              icon={<Lock className="h-4 w-4" />} 
              placeholder="••••••••" 
              error={confirmPassword.length > 0 && !isPasswordMatch ? "Passwords do not match" : undefined}
            />
          </div>
          
          <div className="grid gap-4 sm:grid-cols-3">
            <SelectField label="College" value={college} onChange={setCollege} options={colleges} icon={<GraduationCap className="h-4 w-4" />} />
            <SelectField label="Course" value={course} onChange={setCourse} options={courses} icon={<BookOpen className="h-4 w-4" />} />
            <SelectField label="Semester" value={sem} onChange={setSem} options={semesters} icon={<Sparkles className="h-4 w-4" />} />
          </div>

          <button
            type="button"
            onClick={startRegistration}
            disabled={!isFormValid}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-indigo-600 py-3.5 text-sm font-bold text-white shadow-md shadow-indigo-500/10 transition-all hover:from-indigo-600 hover:to-indigo-700 hover:shadow-lg disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]"
          >
            <span>Initiate OTP Verification</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      ) : (
        /* PHASE 2: VERIFY OTPS */
        <div className="space-y-6">
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 text-xs shadow-sm">
            <div className="font-bold text-indigo-800 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
              <span>Simulated Verification Keys (Dev Sandbox)</span>
            </div>
            <div className="grid grid-cols-2 gap-2 font-semibold text-indigo-700">
              <div>Registration ID: <span className="font-extrabold text-slate-800">{registrationId}</span></div>
              <div className="text-right">Portal Link: <span className="text-emerald-600">Secure Active</span></div>
              <div className="mt-1 bg-white/70 rounded-xl p-2.5 border border-indigo-100/50">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider">Email OTP</div>
                <div className="text-base font-black text-slate-800 tracking-widest mt-0.5">{serverEmailOtp}</div>
              </div>
              <div className="mt-1 bg-white/70 rounded-xl p-2.5 border border-indigo-100/50">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider">Phone OTP</div>
                <div className="text-base font-black text-slate-800 tracking-widest mt-0.5">{serverPhoneOtp}</div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Email OTP Input Group */}
            <div className={`rounded-3xl border p-5 transition-all ${emailVerified ? "border-emerald-100 bg-emerald-50/25" : "border-slate-100 bg-white"}`}>
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
                onChange={(e) => setEmailOtp(e.target.value)}
                placeholder="Enter Email Code"
                className="mt-3.5 w-full text-center tracking-widest font-extrabold text-lg rounded-2xl border border-slate-200 bg-slate-50/50 py-2.5 text-slate-800 focus:bg-white outline-none"
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

            {/* Phone OTP Input Group */}
            <div className={`rounded-3xl border p-5 transition-all ${phoneVerified ? "border-emerald-100 bg-emerald-50/25" : "border-slate-100 bg-white"}`}>
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
                onChange={(e) => setPhoneOtp(e.target.value)}
                placeholder="Enter Phone Code"
                className="mt-3.5 w-full text-center tracking-widest font-extrabold text-lg rounded-2xl border border-slate-200 bg-slate-50/50 py-2.5 text-slate-800 focus:bg-white outline-none"
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

      {/* Action Messages info block */}
      {message && (
        <div className={`flex items-start gap-2.5 rounded-2xl border p-4 text-xs font-semibold leading-relaxed ${
          isError ? "border-rose-100 bg-rose-50 text-rose-700" : "border-emerald-100 bg-emerald-50 text-emerald-700"
        }`}>
          {isError ? <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /> : <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />}
          <span>{message}</span>
        </div>
      )}

      <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-400">
        <span>Already have an account? </span>
        <a href="/login" className="font-bold text-indigo-600 hover:text-indigo-700 transition">
          Sign in
        </a>
      </div>
    </div>
  );
}

// Reusable fields
function Field({
  label,
  value,
  onChange,
  icon,
  placeholder,
  error,
  type = "text"
}: Readonly<{
  label: string;
  value: string;
  onChange: (val: string) => void;
  icon: React.ReactNode;
  placeholder?: string;
  error?: string;
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
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full rounded-2xl border bg-slate-50/50 py-3 pl-11 pr-4 text-sm font-medium text-slate-800 transition outline-none focus:bg-white focus:ring-2 ${
            error ? "border-rose-300 focus:ring-rose-100" : "border-slate-200 focus:border-indigo-500 focus:ring-indigo-100"
          }`}
        />
      </div>
      {error && <p className="mt-1 text-[11px] font-semibold text-rose-500">{error}</p>}
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
  onChange: (val: string) => void;
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
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-3 pl-11 pr-10 text-sm font-medium text-slate-800 transition focus:bg-white outline-none appearance-none focus:ring-2 focus:ring-indigo-100"
        >
          <option value="">Select...</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
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