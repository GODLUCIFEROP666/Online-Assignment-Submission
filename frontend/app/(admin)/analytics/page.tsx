"use client";

import { useEffect, useState } from "react";
import { AdminAnalyticsGrid } from "@/components/charts/admin-analytics-grid";
import { AppShell } from "@/components/shell";
import { apiFetch } from "@/lib/api";
import { adminNav } from "@/lib/constants";
import { 
  FileSpreadsheet, 
  Users, 
  UserCheck, 
  Clock, 
  Sparkles, 
  BarChart3,
  AlertCircle,
  Loader2
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiFetch<AnalyticsResponse>("/api/analytics/dashboard"), 
      apiFetch<AssignmentListResponse>("/api/admin/assignments")
    ])
      .then(([analyticsPayload, assignmentPayload]) => {
        setData(analyticsPayload.data);
        setAssignments(assignmentPayload.items);
        setMessage(null);
      })
      .catch((error) => {
        setMessage(error instanceof Error ? error.message : "Failed to load academic predictive metrics");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <AppShell 
      title="Analytics Dashboard" 
      subtitle="Examine system-wide analytics, ML predictive pass probabilities, and k-means student performance clusters." 
      nav={adminNav}
    >
      <div className="space-y-6">
        {/* Statistics Panels Grid with Skeletal Load States */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard 
            label="Total Practicals" 
            value={loading ? undefined : String(data?.assignments ?? 0)} 
            icon={<FileSpreadsheet className="h-5 w-5 text-indigo-500" />}
            colorClass="border-t-4 border-t-indigo-500"
            loading={loading}
          />
          <StatCard 
            label="Total Enrolls" 
            value={loading ? undefined : String(data?.students ?? 0)} 
            icon={<Users className="h-5 w-5 text-emerald-500" />}
            colorClass="border-t-4 border-t-emerald-500"
            loading={loading}
          />
          <StatCard 
            label="Active Instructors" 
            value={loading ? undefined : String(data?.teachers ?? 0)} 
            icon={<UserCheck className="h-5 w-5 text-violet-500" />}
            colorClass="border-t-4 border-t-violet-500"
            loading={loading}
          />
          <StatCard 
            label="Pending Audits" 
            value={loading ? undefined : String(data?.pending ?? 0)} 
            icon={<Clock className="h-5 w-5 text-amber-500" />}
            colorClass="border-t-4 border-t-amber-500"
            loading={loading}
          />
        </div>

        {/* Dynamic ML Component Analytics Section */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-indigo-500" />
              <span>Statistical Inference Matrix</span>
            </h3>
            <p className="text-sm text-slate-500">Live algorithmic predictions based on historical submission traits.</p>
          </div>
          <div className="rounded-full bg-indigo-50 px-3.5 py-1 text-xs font-bold text-indigo-600 flex items-center gap-1.5 border border-indigo-100/50">
            <Sparkles className="h-3.5 w-3.5 text-indigo-500 animate-pulse" />
            <span>K-Means Model Pipeline Active</span>
          </div>
        </div>

        {/* Chart Viewport card */}
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[350px] bg-white rounded-3xl border border-slate-100 p-8 text-center">
            <Loader2 className="h-10 w-10 text-indigo-500 animate-spin mb-3" />
            <div className="text-sm font-bold text-slate-800">Compiling dataset collections...</div>
            <p className="text-xs text-slate-400 mt-1">Aggregating predictions and cluster calculations.</p>
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <AdminAnalyticsGrid
              assignments={assignments}
              predictions={data?.predictions ?? []}
              clusters={data?.clusters ?? []}
            />
          </div>
        )}

        {/* Dynamic Action Response Message card */}
        {message && (
          <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-xs font-semibold text-rose-700 flex items-center gap-2">
            <AlertCircle className="h-4.5 w-4.5 text-rose-500 shrink-0" />
            <span>{message}</span>
          </div>
        )}
      </div>
    </AppShell>
  );
}

interface StatProps {
  label: string;
  value?: string;
  icon: React.ReactNode;
  colorClass: string;
  loading: boolean;
}

function StatCard({ label, value, icon, colorClass, loading }: Readonly<StatProps>) {
  return (
    <div className={`rounded-3xl border border-slate-100 bg-white p-5 shadow-sm flex items-center justify-between transition-all ${colorClass}`}>
      <div className="space-y-1.5">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</div>
        {loading ? (
          <div className="h-8 w-16 bg-slate-100 rounded-lg animate-pulse" />
        ) : (
          <div className="text-3xl font-black text-slate-800 tracking-tight">{value ?? "0"}</div>
        )}
      </div>
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 border border-slate-100 shadow-sm shrink-0">
        {icon}
      </div>
    </div>
  );
}