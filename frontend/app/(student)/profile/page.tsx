"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/shell";
import { apiFetch } from "@/lib/api";
import { studentNav } from "@/lib/constants";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  GraduationCap,
  Lock,
  Mail,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
  User
} from "lucide-react";

type MeResponse = {
  status: string;
  role: string;
  data: {
    id: number;
    full_name: string;
    username: string;
    email: string;
    phone: string | null;
    college: string | null;
    course_year: string | null;
    seat_no: string;
    is_email_verified: boolean;
    is_phone_verified: boolean;
    created_at?: string | null;
  };
};

type SubmitResponse = {
  status: string;
  message: string;
};

function splitCourseYear(courseYear: string | null) {
  const [course = "", sem = ""] = (courseYear ?? "").split(" - ");
  return { course, sem };
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<MeResponse["data"] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [seatNo, setSeatNo] = useState("");
  const [college, setCollege] = useState("");
  const [course, setCourse] = useState("");
  const [sem, setSem] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    apiFetch<MeResponse>("/api/me")
      .then((payload) => {
        setProfile(payload.data);
        setFullName(payload.data.full_name);
        setSeatNo(payload.data.seat_no);
        setCollege(payload.data.college ?? "");
        const split = splitCourseYear(payload.data.course_year);
        setCourse(split.course);
        setSem(split.sem);
        setNewEmail(payload.data.email);
        setNewPhone(payload.data.phone ?? "");
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "Failed to load profile"));
  }, []);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await apiFetch<SubmitResponse>("/api/me", {
        method: "PUT",
        body: JSON.stringify({
          full_name: fullName,
          seat_no: seatNo,
          college,
          course,
          sem
        })
      });

      setProfile((current) =>
        current
          ? {
              ...current,
              full_name: fullName,
              seat_no: seatNo,
              college,
              course_year: `${course} - ${sem}`
            }
          : current
      );
      setMessage("Profile updated successfully.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Profile update failed");
    } finally {
      setLoading(false);
    }
  }

  async function saveEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await apiFetch<SubmitResponse>("/api/me/email", {
        method: "PUT",
        body: JSON.stringify({ email: newEmail })
      });
      setProfile((current) => (current ? { ...current, email: newEmail, is_email_verified: false } : current));
      setMessage("Email updated successfully.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Email update failed");
    } finally {
      setLoading(false);
    }
  }

  async function savePhone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await apiFetch<SubmitResponse>("/api/me/phone", {
        method: "PUT",
        body: JSON.stringify({ phone: newPhone })
      });
      setProfile((current) => (current ? { ...current, phone: newPhone, is_phone_verified: false } : current));
      setMessage("Mobile number updated successfully.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Phone update failed");
    } finally {
      setLoading(false);
    }
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      await apiFetch<SubmitResponse>("/api/me/password", {
        method: "PUT",
        body: JSON.stringify({ new_password: newPassword })
      });
      setNewPassword("");
      setConfirmPassword("");
      setMessage("Password changed successfully.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Password update failed");
    } finally {
      setLoading(false);
    }
  }

  const avatarLetter = (profile?.full_name || profile?.username || "U").slice(0, 1).toUpperCase();
  const joinedValue = profile?.created_at ? new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "Not available";

  return (
    <AppShell
      title="My Profile"
      subtitle="Manage your account settings and preferences."
      nav={studentNav}
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
              <Settings className="h-5 w-5 text-indigo-500" />
              <span>My Profile</span>
            </h3>
            <p className="mt-1 text-sm text-slate-500">Manage your account settings and preferences.</p>
          </div>
          <div className="rounded-full bg-indigo-50 border border-indigo-100 px-3.5 py-1 text-xs font-bold text-indigo-600 flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            <span>Academic Center</span>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm text-center">
            <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-500 to-indigo-600 text-4xl font-black text-white shadow-xl shadow-indigo-600/30 ring-4 ring-indigo-50">
              {avatarLetter}
            </div>
            <h4 className="text-xl font-extrabold text-slate-800 tracking-tight">{profile?.full_name ?? "Student Portal"}</h4>
            <p className="mt-1 text-xs font-semibold text-slate-400">@{profile?.username ?? "username"}</p>
            <span className="mt-4 inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-100 px-3.5 py-1 text-xs font-bold text-indigo-600">
              <GraduationCap className="h-3.5 w-3.5" />
              <span>{profile?.course_year || "Syllabus Unassigned"}</span>
            </span>

            <dl className="mt-8 space-y-3.5 rounded-2xl bg-slate-50/50 border border-slate-100 p-5 text-xs font-semibold text-left">
              <Row label="Primary Email Address" value={profile?.email ?? "Loading..."} verified={profile?.is_email_verified} />
              <Row label="Registered Mobile" value={profile?.phone ?? "Not configured"} verified={profile?.is_phone_verified} />
              <Row label="Assigned College" value={profile?.college ?? "Not configured"} />
              <Row label="Academic Seat Number" value={profile?.seat_no ?? "Not configured"} />
              <Row label="Joined" value={joinedValue} />
            </dl>
          </section>

          <section className="space-y-6">
            <form className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm space-y-4" onSubmit={saveProfile}>
              <h5 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-50 pb-3">
                <User className="h-4.5 w-4.5 text-indigo-500" />
                <span>Personal Details</span>
              </h5>

              <div className="grid gap-4 sm:grid-cols-2">
                <EditField label="Full Name" value={fullName} onChange={setFullName} placeholder="John Doe" />
                <EditField label="Seat Number / Roll No" value={seatNo} onChange={setSeatNo} placeholder="Seat No" />
                <EditField label="College Name" value={college} onChange={setCollege} placeholder="College" />
                <div className="grid gap-3 grid-cols-2">
                  <EditField label="Course" value={course} onChange={setCourse} placeholder="Course" />
                  <EditField label="Semester" value={sem} onChange={setSem} placeholder="Sem" />
                </div>
              </div>

              <button
                disabled={loading}
                className="rounded-2xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800 transition duration-200 disabled:opacity-60"
              >
                Save Changes
              </button>
            </form>

            <form className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm space-y-4" onSubmit={saveEmail}>
              <h5 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-50 pb-3">
                <Mail className="h-4.5 w-4.5 text-indigo-500" />
                <span>Change Email Address</span>
              </h5>

              <EditField label="Current Email" value={profile?.email ?? ""} onChange={() => undefined} readOnly />
              <EditField label="New Email Address" value={newEmail} onChange={setNewEmail} type="email" placeholder="Enter new email address" />

              <button
                disabled={loading}
                className="rounded-2xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800 transition duration-200 disabled:opacity-60"
              >
                Update Email
              </button>
            </form>

            <form className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm space-y-4" onSubmit={savePhone}>
              <h5 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-50 pb-3">
                <Smartphone className="h-4.5 w-4.5 text-indigo-500" />
                <span>Change Mobile Number</span>
              </h5>

              <EditField label="Current Mobile" value={profile?.phone ?? ""} onChange={() => undefined} readOnly />
              <EditField label="New Mobile Number" value={newPhone} onChange={setNewPhone} type="tel" placeholder="Enter 10-digit mobile number" />

              <button
                disabled={loading}
                className="rounded-2xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800 transition duration-200 disabled:opacity-60"
              >
                Update Mobile
              </button>
            </form>

            <form className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm space-y-4" onSubmit={savePassword}>
              <h5 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-50 pb-3">
                <Lock className="h-4.5 w-4.5 text-indigo-500" />
                <span>Change Password</span>
              </h5>

              <div className="grid gap-4 sm:grid-cols-2">
                <EditField label="New Password" value={newPassword} onChange={setNewPassword} type="password" placeholder="Min 8 characters" />
                <EditField label="Confirm New Password" value={confirmPassword} onChange={setConfirmPassword} type="password" placeholder="Confirm password" />
              </div>

              <button
                disabled={loading}
                className="rounded-2xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800 transition duration-200 disabled:opacity-60"
              >
                Change Password
              </button>
            </form>

            {message ? (
              <div
                className={`flex items-start gap-2.5 rounded-2xl border p-4 text-xs font-semibold leading-relaxed ${
                  message.toLowerCase().includes("success")
                    ? "border-emerald-100 bg-emerald-50 text-emerald-700 shadow-sm"
                    : "border-rose-100 bg-rose-50 text-rose-700 shadow-sm"
                }`}
              >
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
        {verified !== undefined &&
          (verified ? (
            <span className="text-emerald-500 flex h-4 w-4 items-center justify-center bg-emerald-50 rounded-full border border-emerald-100">
              <ShieldCheck className="h-2.5 w-2.5" />
            </span>
          ) : (
            <span className="text-amber-500 flex h-4 w-4 items-center justify-center bg-amber-50 rounded-full border border-amber-100">
              <ShieldAlert className="h-2.5 w-2.5" />
            </span>
          ))}
      </dd>
    </div>
  );
}

function EditField({
  label,
  value,
  onChange,
  placeholder = "",
  type = "text",
  readOnly = false
}: Readonly<{
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  type?: string;
  readOnly?: boolean;
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
        readOnly={readOnly}
        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-xs font-semibold text-slate-800 transition focus:bg-white placeholder:text-slate-300 outline-none read-only:bg-slate-50 read-only:cursor-not-allowed"
      />
    </div>
  );
}
