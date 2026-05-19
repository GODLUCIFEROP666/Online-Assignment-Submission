"use client";

import { useEffect, useState } from "react";
import { AdminAnalyticsGrid } from "@/components/charts/admin-analytics-grid";
import { AppShell } from "@/components/shell";
import { apiFetch } from "@/lib/api";
import { adminNav } from "@/lib/constants";
import { 
  Users, 
  UserCheck, 
  FileSpreadsheet, 
  Clock, 
  Sparkles, 
  Mail,
  GraduationCap,
  BookOpen,
  ShieldAlert,
  AlertCircle
} from "lucide-react";

type AssignmentItem = {
  id: number;
  student_name: string | null;
  college_name: string | null;
  year: string | null;
  subject: string | null;
  status: string | null;
  marks: number;
  submit_date: string | null;
};

type AnalyticsResponse = {
  status: string;
  data: {
    assignments?: number;
    students?: number;
    teachers?: number;
    pending?: number;
    predictions?: Array<{ username: string | null; pass_probability: number; total_submissions?: number; avg_marks?: number }>;
    clusters?: Array<{ username: string | null; cluster: number; total_submissions?: number; avg_marks?: number }>;
  };
};

type TeacherItem = {
  id: number;
  name: string;
  username: string;
  email: string;
  role: string;
  college: string | null;
  course: string | null;
};

type TeacherListResponse = {
  status: string;
  items: TeacherItem[];
  count: number;
};

type AssignmentListResponse = {
  status: string;
  items: AssignmentItem[];
  count: number;
};

export default function SuperAdminPage() {
  const [dashboard, setDashboard] = useState<AnalyticsResponse["data"] | null>(null);
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiFetch<AnalyticsResponse>("/api/analytics/dashboard"),
      apiFetch<TeacherListResponse>("/api/admin/teachers"),
      apiFetch<AssignmentListResponse>("/api/admin/assignments")
    ])
      .then(([dashboardPayload, teacherPayload, assignmentPayload]) => {
        setDashboard(dashboardPayload.data);
        setTeachers(teacherPayload.items);
        setAssignments(assignmentPayload.items);
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "Failed to load superadmin dashboard"));
  }, []);

  return (
    <AppShell 
      title="SuperAdmin Dashboard" 
      subtitle="University-wide structural administration panel with direct oversight of active teachers, practical records, and AI clustering models." 
      nav={adminNav}
    >
      <div className="space-y-6">
        
        {/* Stat Cards Row */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard 
            label="Total Students" 
            value={String(dashboard?.students ?? "-")} 
            icon={<Users className="h-5 w-5 text-indigo-500" />}
            colorClass="border-t-4 border-t-indigo-500"
          />
          <StatCard 
            label="Active Teachers" 
            value={String(dashboard?.teachers ?? "-")} 
            icon={<UserCheck className="h-5 w-5 text-emerald-500" />}
            colorClass="border-t-4 border-t-emerald-500"
          />
          <StatCard 
            label="Total Practicals" 
            value={String(dashboard?.assignments ?? "-")} 
            icon={<FileSpreadsheet className="h-5 w-5 text-violet-500" />}
            colorClass="border-t-4 border-t-violet-500"
          />
          <StatCard 
            label="Pending Audits" 
            value={String(dashboard?.pending ?? "-")} 
            icon={<Clock className="h-5 w-5 text-amber-500" />}
            colorClass="border-t-4 border-t-amber-500"
          />
        </div>

        {/* Analytics Charts section wrapper */}
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 pb-4 mb-4 border-b border-slate-100">
            <GraduationCap className="h-5 w-5 text-indigo-500" />
            <span className="text-sm font-extrabold text-slate-800 tracking-tight">Active Analytics Overview</span>
          </div>
          <AdminAnalyticsGrid
            assignments={assignments}
            predictions={dashboard?.predictions ?? []}
            clusters={dashboard?.clusters ?? []}
          />
        </div>

        {/* Database Table Section Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-500" />
              <span>Registered Professors Directory</span>
            </h3>
            <p className="mt-1 text-sm text-slate-500">Overview of all active faculty members across departments.</p>
          </div>
          <div className="rounded-full bg-indigo-50 border border-indigo-100 px-3.5 py-1 text-xs font-bold text-indigo-600 flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            <span>Faculty database registry</span>
          </div>
        </div>

        {/* Teachers List Table Grid */}
        <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Faculty Member</th>
                  <th className="px-6 py-4">Security Username</th>
                  <th className="px-6 py-4">Email Address</th>
                  <th className="px-6 py-4">Assigned College</th>
                  <th className="px-6 py-4">Scope Course</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-medium">
                {teachers.length === 0 ? (
                  <tr>
                    <td className="px-6 py-12 text-center text-slate-400 font-semibold" colSpan={5}>
                      <div className="flex flex-col items-center gap-2">
                        <Users className="h-10 w-10 text-slate-300 stroke-1" />
                        <span>No registered teachers discovered in active records.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  teachers.map((teacher) => (
                    <tr key={teacher.id} className="hover:bg-slate-50/50 transition duration-150">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-500 to-indigo-600 text-xs font-black text-white shadow-md">
                            {teacher.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-slate-800 font-extrabold">{teacher.name}</div>
                            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Faculty Role</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 border border-slate-200/50">
                          @{teacher.username}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Mail className="h-4 w-4 text-slate-400" />
                          <span>{teacher.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {teacher.college ? (
                          <span className="rounded-full bg-indigo-50 border border-indigo-100/50 px-2.5 py-1 text-xs text-indigo-700">
                            {teacher.college}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs font-semibold px-2.5 py-1 bg-slate-50 rounded-full border border-slate-100/50">Unassigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {teacher.course ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-100/50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                            <BookOpen className="h-3 w-3 text-emerald-500" />
                            <span>{teacher.course}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs font-semibold px-2.5 py-1 bg-slate-50 rounded-full border border-slate-100/50">Unassigned</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Dynamic Action Response Message */}
        {message ? (
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-xs font-semibold text-slate-500 flex items-center gap-2">
            <AlertCircle className="h-4.5 w-4.5 text-slate-400 shrink-0" />
            <span>{message}</span>
          </div>
        ) : null}

      </div>
    </AppShell>
  );
}

function StatCard({ 
  label, 
  value, 
  icon,
  colorClass 
}: Readonly<{ 
  label: string; 
  value: string; 
  icon: React.ReactNode;
  colorClass: string;
}>) {
  return (
    <div className={`rounded-3xl border border-slate-100 bg-white p-5 shadow-sm flex items-center justify-between ${colorClass}`}>
      <div>
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</div>
        <div className="mt-2 text-3xl font-black text-slate-800 tracking-tight">{value}</div>
      </div>
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 border border-slate-100 shadow-sm">
        {icon}
      </div>
    </div>
  );
}
