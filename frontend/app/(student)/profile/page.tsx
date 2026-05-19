"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/shell";
import { apiFetch } from "@/lib/api";
import { studentNav } from "@/lib/constants";
import { 
  User, 
  Mail, 
  Smartphone, 
  Lock, 
  Sparkles, 
  GraduationCap, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle,
  FileSpreadsheet,
  Settings,
  ShieldAlert
} from "lucide-react";

type MeResponse = {
  status: string;
  role: string;
  data: {
    full_name: string;
    username: string;
    email: string;
    phone: string | null;
    college: string | null;
    course_year: string | null;
    seat_no: string;
    is_email_verified: boolean;
    is_phone_verified: boolean;
  };
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<MeResponse["data"] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [course, setCourse] = useState("");
  const [sem, setSem] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiFetch<MeResponse>("/api/me")
      .then((payload) => {
        setProfile(payload.data);
        setNewEmail(payload.data.email);
        setNewPhone(payload.data.phone ?? "");
        const [courseValue = "", semValue = ""] = (payload.data.course_year ?? "").split(" - ");
        setCourse(courseValue);
        setSem(semValue);
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "Failed to load profile"));
  }, []);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;
    setLoading(true);
    setMessage(null);
    try {
      await apiFetch("/api/me", {
        method: "PUT",
        body: JSON.stringify({
          full_name: profile.full_name,
          seat_no: profile.seat_no,
          college: profile.college ?? "",
          course,
          sem
        })
      });
      setProfile({ ...profile, course_year: `${course} - ${sem}` });
      setMessage("Profile updated successfully.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Profile update failed");
    } finally {
      setLoading(false);
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await apiFetch("/api/me/password", {
        method: "PUT",
        body: JSON.stringify({ new_password: newPassword })
      });
      setNewPassword("");
      setMessage("Password updated successfully.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Password update failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell 
      title="My Profile" 
      subtitle="Verify your credentials, manage contact records, update semesters, and change secure passwords." 
      nav={studentNav}
    >
      <div className="space-y-6">
        
        {/* Profile Center Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
              <Settings className="h-5 w-5 text-indigo-500" />
              <span>Student Profile Settings</span>
            </h3>
            <p className="mt-1 text-sm text-slate-500">Configure your account details, verification OTP logs, and security passkeys.</p>
          </div>
          <div className="rounded-full bg-indigo-50 border border-indigo-100 px-3.5 py-1 text-xs font-bold text-indigo-600 flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            <span>Academic Center</span>
          </div>
        </div>

        {/* Form & Info Layout columns */}
        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          
          {/* Left Column: Visual User card */}
          <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm flex flex-col justify-between">
            <div className="text-center pt-4">
              {/* Glowing Avatar */}
              <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-500 to-indigo-600 text-4xl font-black text-white shadow-xl shadow-indigo-600/30 ring-4 ring-indigo-50">
                {(profile?.full_name ?? "U").slice(0, 1).toUpperCase()}
              </div>
              <h4 className="text-xl font-extrabold text-slate-800 tracking-tight">
                {profile?.full_name ?? "Student Portal"}
              </h4>
              <p className="mt-1 text-xs font-semibold text-slate-400">
                @{profile?.username ?? "username"}
              </p>
              
              <span className="mt-4 inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-100 px-3.5 py-1 text-xs font-bold text-indigo-600">
                <GraduationCap className="h-3.5 w-3.5" />
                <span>{profile?.course_year || "Syllabus Unassigned"}</span>
              </span>
            </div>

            {/* Structured DL Metadata grid */}
            <dl className="mt-8 space-y-3.5 rounded-2xl bg-slate-50/50 border border-slate-100 p-5 text-xs font-semibold">
              <Row 
                label="Primary Email Address" 
                value={profile?.email ?? "Loading..."} 
                verified={profile?.is_email_verified} 
              />
              <Row 
                label="Registered Mobile" 
                value={profile?.phone ?? "Not configured"} 
                verified={profile?.is_phone_verified} 
              />
              <Row 
                label="Assigned College" 
                value={profile?.college ?? "Not configured"} 
              />
              <Row 
                label="Academic Seat Number" 
                value={profile?.seat_no ?? "Not configured"} 
              />
            </dl>
          </section>

          {/* Right Column: Update Forms stack */}
          <section className="space-y-6">
            
            {/* Form 1: General profile fields */}
            <form className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm space-y-4" onSubmit={saveProfile}>
              <h5 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-50 pb-3">
                <User className="h-4.5 w-4.5 text-indigo-500" />
                <span>General Profile Records</span>
              </h5>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <EditField 
                  label="Full Name" 
                  value={profile?.full_name ?? ""} 
                  onChange={(val) => profile && setProfile({ ...profile, full_name: val })} 
                  placeholder="John Doe" 
                />
                <EditField 
                  label="Seat Number" 
                  value={profile?.seat_no ?? ""} 
                  onChange={(val) => profile && setProfile({ ...profile, seat_no: val })} 
                  placeholder="Seat No" 
                />
                <EditField 
                  label="Active College" 
                  value={profile?.college ?? ""} 
                  onChange={(val) => profile && setProfile({ ...profile, college: val })} 
                  placeholder="College" 
                />
                <div className="grid gap-3 grid-cols-2">
                  <EditField 
                    label="Course" 
                    value={course} 
                    onChange={setCourse} 
                    placeholder="Course" 
                  />
                  <EditField 
                    label="Semester" 
                    value={sem} 
                    onChange={setSem} 
                    placeholder="Sem" 
                  />
                </div>
              </div>

              <button className="rounded-2xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800 transition duration-200">
                Save Records
              </button>
            </form>

            {/* Form 2: Email update */}
            <form
              className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm space-y-4"
              onSubmit={async (event) => {
                event.preventDefault();
                setLoading(true);
                setMessage(null);
                if (!profile) return;
                try {
                  await apiFetch("/api/me/email", {
                    method: "PUT",
                    body: JSON.stringify({ email: newEmail })
                  });
                  setProfile((current) => (current ? { ...current, email: newEmail, is_email_verified: false } : current));
                  setMessage("Email updated successfully. Please re-verify.");
                } catch (error) {
                  setMessage(error instanceof Error ? error.message : "Email update failed");
                } finally {
                  setLoading(false);
                }
              }}
            >
              <h5 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-50 pb-3">
                <Mail className="h-4.5 w-4.5 text-indigo-500" />
                <span>Contact Email Address</span>
              </h5>
              
              <EditField 
                label="Registered Email" 
                value={newEmail} 
                onChange={setNewEmail} 
                type="email" 
              />
              
              <button className="rounded-2xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800 transition duration-200">
                Update Email
              </button>
            </form>

            {/* Form 3: Phone update */}
            <form
              className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm space-y-4"
              onSubmit={async (event) => {
                event.preventDefault();
                setLoading(true);
                setMessage(null);
                if (!profile) return;
                try {
                  await apiFetch("/api/me/phone", {
                    method: "PUT",
                    body: JSON.stringify({ phone: newPhone })
                  });
                  setProfile((current) => (current ? { ...current, phone: newPhone, is_phone_verified: false } : current));
                  setMessage("Phone number updated successfully. Please re-verify.");
                } catch (error) {
                  setMessage(error instanceof Error ? error.message : "Phone update failed");
                } finally {
                  setLoading(false);
                }
              }}
            >
              <h5 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-50 pb-3">
                <Smartphone className="h-4.5 w-4.5 text-indigo-500" />
                <span>Contact Mobile Number</span>
              </h5>
              
              <EditField 
                label="Registered Mobile" 
                value={newPhone} 
                onChange={setNewPhone} 
                type="tel" 
              />
              
              <button className="rounded-2xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800 transition duration-200">
                Update Mobile
              </button>
            </form>

            {/* Form 4: Security Password Change */}
            <form className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm space-y-4" onSubmit={changePassword}>
              <h5 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-50 pb-3">
                <Lock className="h-4.5 w-4.5 text-indigo-500" />
                <span>Change secure Passkey</span>
              </h5>
              
              <EditField 
                label="New Secure Password" 
                value={newPassword} 
                onChange={setNewPassword} 
                type="password" 
                placeholder="••••••••"
              />
              
              <button className="rounded-2xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800 transition duration-200">
                Update Password
              </button>
            </form>

            {/* Dynamic response alert panel */}
            {message ? (
              <div className={`flex items-start gap-2.5 rounded-2xl border p-4 text-xs font-semibold leading-relaxed ${
                message.toLowerCase().includes("successfully") 
                  ? "border-emerald-100 bg-emerald-50 text-emerald-700 shadow-sm"
                  : "border-indigo-100 bg-indigo-50 text-indigo-700 shadow-sm"
              }`}>
                <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                <span>{message}</span>
              </div>
            ) : null}

          </section>

        </div>
      </div>
    </AppShell>
  );
}

function Row({ 
  label, 
  value, 
  verified 
}: Readonly<{ 
  label: string; 
  value: string; 
  verified?: boolean;
}>) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3.5 last:border-b-0 last:pb-0">
      <dt className="text-slate-400 font-medium">{label}</dt>
      <dd className="text-right flex items-center gap-1.5 text-slate-800">
        <span>{value}</span>
        {verified !== undefined && (
          verified ? (
            <span className="text-emerald-500 flex h-4 w-4 items-center justify-center bg-emerald-50 rounded-full border border-emerald-100"><ShieldCheck className="h-2.5 w-2.5" /></span>
          ) : (
            <span className="text-amber-500 flex h-4 w-4 items-center justify-center bg-amber-50 rounded-full border border-amber-100"><ShieldAlert className="h-2.5 w-2.5" /></span>
          )
        )}
      </dd>
    </div>
  );
}

function EditField({
  label,
  value,
  onChange,
  placeholder = "",
  type = "text"
}: Readonly<{
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  type?: string;
}>) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-xs font-semibold text-slate-800 transition focus:bg-white placeholder:text-slate-300 outline-none"
      />
    </div>
  );
}
