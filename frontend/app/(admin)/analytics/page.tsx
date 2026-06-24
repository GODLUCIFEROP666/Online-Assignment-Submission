"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { AdminAnalyticsGrid } from "@/components/charts/admin-analytics-grid";
import { AppShell } from "@/components/shell";
import { apiFetch } from "@/lib/api";
import { adminNav } from "@/lib/constants";
import { useLiveRefresh } from "@/hooks/use-live-refresh";
import { 
  FileSpreadsheet, 
  Users, 
  UserCheck, 
  Clock, 
  Sparkles, 
  BarChart3,
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

type AssignmentListResponse = {
  status: string;
  items: AssignmentItem[];
  count: number;
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsResponse["data"] | null>(null);
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useLiveRefresh(async () => {
    try {
      const [analyticsPayload, assignmentPayload] = await Promise.all([
        apiFetch<AnalyticsResponse>("/api/analytics/dashboard"),
        apiFetch<AssignmentListResponse>("/api/admin/assignments")
      ]);

      setData(analyticsPayload.data);
      setAssignments(assignmentPayload.items);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load analytics");
    }
  });

  return (
    <AppShell 
      title="Analytics Hub" 
      subtitle="Examine university-wide predictive models, student pass probability distributions, clusters, and historical trends powered by live datasets." 
      nav={adminNav}
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
          <div className="rounded-full bg-indigo-50 border border-indigo-100 px-3.5 py-1 text-xs font-bold text-indigo-600 flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            <span>Live analytics pipeline</span>
          </div>
        </div>

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
