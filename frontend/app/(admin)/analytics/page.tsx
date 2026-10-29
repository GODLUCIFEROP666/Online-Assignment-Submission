"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { AdminAnalyticsGrid } from "@/components/charts/admin-analytics-grid";
import { AppShell } from "@/components/shell";
import { apiFetch } from "@/lib/api";
import { teacherNav, superadminNav } from "@/lib/constants";
import { getSessionRole } from "@/lib/auth";
import { useLiveRefresh } from "@/hooks/use-live-refresh";
import { 
  FileSpreadsheet, 
  Users, 
  UserCheck, 
  Clock, 
  Sparkles, 
  BarChart3,
  AlertCircle,
  AlertTriangle,
  Download,
  ShieldAlert
} from "lucide-react";

type AtRiskItem = {
  student_id: number | string;
  username: string;
  full_name: string;
  total_assignments: number;
  avg_marks: number;
  risk_level: "high" | "medium" | "low";
  reasons: string[];
};


type AssignmentItem = {
  id: number;
  student_name: string | null;
  college_name: string | null;
  year: string | null;
  subject: string | null;
  title: string | null;
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

type AssignmentListResponse = {
  status: string;
  items: AssignmentItem[];
  count: number;
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsResponse["data"] | null>(null);
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [atRiskData, setAtRiskData] = useState<AtRiskItem[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  // Derive nav from session role so teacher and superadmin each get their own links
  const sessionRole = typeof window !== "undefined" ? getSessionRole() : null;
  const activeNav = sessionRole === "superadmin" ? superadminNav : teacherNav;

  useLiveRefresh(async () => {
    try {
      const [analyticsPayload, assignmentPayload, atRiskPayload] = await Promise.all([
        apiFetch<AnalyticsResponse>("/api/analytics/dashboard"),
        // Use the role-scoped assignments endpoint so teachers see only their scope
        apiFetch<AssignmentListResponse>("/api/assignments/"),
        apiFetch<{ status: string; data: AtRiskItem[] }>("/api/analytics/at-risk").catch(() => ({ status: "error", data: [] }))
      ]);

      setData(analyticsPayload.data);
      setAssignments(assignmentPayload.items);
      setAtRiskData(atRiskPayload.data || []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load analytics");
    }
  });

  function exportGradebookCSV() {
    if (!assignments || assignments.length === 0) return;
    const headers = ["ID", "Student", "Subject", "Title", "Status", "Marks", "Submitted Date"];
    const rows = assignments.map((a) => [
      a.id,
      `"${(a.student_name || "").replace(/"/g, '""')}"`,
      `"${(a.subject || "").replace(/"/g, '""')}"`,
      `"${(a.title || "").replace(/"/g, '""')}"`,
      a.status || "Pending",
      a.marks || 0,
      a.submit_date || ""
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `gradebook_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }


  return (
    <AppShell 
      title="Analytics Hub" 
      subtitle="Examine predictive models, student pass probability distributions, clusters, and historical trends powered by live datasets." 
      nav={activeNav}
    >
      <div className="space-y-6">
        
        {/* Statistics Panels Grid */}
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          <StatCard 
            label="Total Practicals" 
            value={String(data?.assignments ?? "-")} 
            icon={<FileSpreadsheet className="h-5 w-5 text-indigo-500" />}
            colorClass="border-t-4 border-t-indigo-500"
          />
          <StatCard 
            label="Total Students" 
            value={String(data?.students ?? "-")} 
            icon={<Users className="h-5 w-5 text-emerald-500" />}
            colorClass="border-t-4 border-t-emerald-500"
          />
          <StatCard 
            label="Active Teachers" 
            value={String(data?.teachers ?? "-")} 
            icon={<UserCheck className="h-5 w-5 text-violet-500" />}
            colorClass="border-t-4 border-t-violet-500"
          />
          <StatCard 
            label="Pending Audits" 
            value={String(data?.pending ?? "-")} 
            icon={<Clock className="h-5 w-5 text-amber-500" />}
            colorClass="border-t-4 border-t-amber-500"
          />
        </div>

        {/* Dynamic Charts Grid Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-indigo-500" />
              <span>Statistical Inference Matrix</span>
            </h3>
            <p className="mt-1 text-sm text-slate-500">Live graphical data feed mapped by active student records.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportGradebookCSV}
              className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1 text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export Gradebook CSV</span>
            </button>
            
            <div className="rounded-full bg-indigo-50 border border-indigo-100 px-3.5 py-1 text-xs font-bold text-indigo-600 flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              <span>Live analytics pipeline</span>
            </div>
          </div>
        </div>

        {/* At-Risk Students Warning Panel */}
        {atRiskData && atRiskData.length > 0 && (
          <div className="rounded-3xl border border-rose-100 bg-gradient-to-r from-rose-50/60 via-white to-amber-50/30 p-6 shadow-sm">
            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-rose-100/80">
              <AlertTriangle className="h-5 w-5 text-rose-500" />
              <div>
                <h4 className="text-base font-extrabold text-slate-800 tracking-tight">At-Risk Student Intervention Alerts</h4>
                <p className="text-xs text-slate-500">Students flagged by local ML metrics due to low average score or missing work.</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {atRiskData.map((student, idx) => (
                <div key={idx} className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm hover:shadow transition space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-800 text-sm">{student.full_name}</div>
                      <div className="text-xs text-slate-400">@{student.username}</div>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      student.risk_level === "high"
                        ? "bg-rose-500/10 text-rose-700 border border-rose-500/20"
                        : "bg-amber-500/10 text-amber-700 border border-amber-500/20"
                    }`}>
                      {student.risk_level.toUpperCase()} RISK
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                    <span className="text-slate-400">Average Mark:</span>
                    <span className="font-bold text-slate-700">{student.avg_marks}%</span>
                  </div>

                  {student.reasons && student.reasons.length > 0 && (
                    <div className="space-y-1 pt-1">
                      {student.reasons.map((reason, rIdx) => (
                        <div key={rIdx} className="text-[11px] text-rose-600 font-medium flex items-center gap-1">
                          <span>•</span> <span>{reason}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Charts Layout Wrapper */}
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <AdminAnalyticsGrid
            assignments={assignments}
            predictions={data?.predictions ?? []}
            clusters={data?.clusters ?? []}
          />
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
  icon: ReactNode;
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
