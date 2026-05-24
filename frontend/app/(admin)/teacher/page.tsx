"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { AdminAnalyticsGrid } from "@/components/charts/admin-analytics-grid";
import { AppShell } from "@/components/shell";
import { API_BASE_URL, apiFetch } from "@/lib/api";
import { adminNav, assignmentStatuses } from "@/lib/constants";
import { useLiveRefresh } from "@/hooks/use-live-refresh";
import { 
  FileDown, 
  GraduationCap, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  FileSpreadsheet, 
  BookOpen, 
  Award, 
  UserCheck, 
  Loader2, 
  AlertCircle,
  FileText,
  Bookmark
} from "lucide-react";

type OverviewResponse = {
  status: string;
  data: {
    students: number;
    teachers: number;
    assignments: number;
    pending: number;
  };
};

type AssignmentItem = {
  id: number;
  student_name: string | null;
  college_name: string | null;
  subject: string | null;
  title: string | null;
  status: string | null;
  marks: number;
  file_name: string | null;
  teacher_note: string | null;
  graded_by: string | null;
  graded_at: string | null;
  year: string | null;
  submit_date: string | null;
};

type AssignmentListResponse = {
  status: string;
  items: AssignmentItem[];
  count: number;
};

type StudentItem = {
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
};

type StudentListResponse = {
  status: string;
  items: StudentItem[];
  count: number;
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

type ReviewDraft = {
  status: string;
  marks: string;
  teacher_note: string;
};

export default function TeacherDashboardPage() {
  const [overview, setOverview] = useState<OverviewResponse["data"] | null>(null);
  const [items, setItems] = useState<AssignmentItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsResponse["data"] | null>(null);
  const [drafts, setDrafts] = useState<Record<number, ReviewDraft>>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useLiveRefresh(async () => {
    try {
      const [overviewPayload, assignmentPayload, analyticsPayload, studentPayload] = await Promise.all([
        apiFetch<OverviewResponse>("/api/admin/overview"),
        apiFetch<AssignmentListResponse>("/api/admin/assignments"),
        apiFetch<AnalyticsResponse>("/api/analytics/dashboard"),
        apiFetch<StudentListResponse>("/api/admin/students")
      ]);

      setOverview(overviewPayload.data);
      setItems(assignmentPayload.items);
      setAnalytics(analyticsPayload.data);
      setStudents(studentPayload.items);
      setDrafts(
        Object.fromEntries(
          assignmentPayload.items.map((item) => [
            item.id,
            {
              status: item.status ?? "Pending",
              marks: String(item.marks ?? 0),
              teacher_note: item.teacher_note ?? ""
            }
          ])
        )
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load teacher dashboard");
    }
  });

  async function saveReview(item: AssignmentItem) {
    const draft = drafts[item.id];
    if (!draft) return;
    setSavingId(item.id);
    setMessage(null);
    try {
      const payload = await apiFetch<{ status: string; message: string; assignment: AssignmentItem }>(`/api/assignments/${item.id}/review`, {
        method: "PATCH",
        body: JSON.stringify({
          status: draft.status,
          marks: Number(draft.marks) || 0,
          teacher_note: draft.teacher_note.trim() || null
        })
      });
      setItems((current) => current.map((row) => (row.id === item.id ? payload.assignment : row)));
      setDrafts((current) => ({
        ...current,
        [item.id]: {
          status: payload.assignment.status ?? "Pending",
          marks: String(payload.assignment.marks ?? 0),
          teacher_note: payload.assignment.teacher_note ?? ""
        }
      }));
      setMessage(`Assignment #${item.id} reviewed successfully.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Review failed");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <AppShell 
      title="Teacher Dashboard" 
      subtitle="Complete student assignments reviews, input grades, leave feedback remarks, and download practical submissions." 
      nav={adminNav}
    >
      <div className="space-y-6">
        
        {/* Statistics Panels Grid */}
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard 
            label="Pending Review" 
            value={String(overview?.pending ?? "-")} 
            icon={<Clock className="h-5 w-5 text-amber-500" />}
            colorClass="border-t-4 border-t-amber-500"
          />
          <StatCard 
            label="Graded Checked" 
            value={String(items.filter((item) => item.status === "Checked").length)} 
            icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />}
            colorClass="border-t-4 border-t-emerald-500"
          />
          <StatCard 
            label="Total Assignments" 
            value={String(overview?.assignments ?? "-")} 
            icon={<FileSpreadsheet className="h-5 w-5 text-indigo-500" />}
            colorClass="border-t-4 border-t-indigo-500"
          />
        </div>

        {/* Analytics Charts Component wrapper */}
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 pb-4 mb-4 border-b border-slate-100">
            <GraduationCap className="h-5 w-5 text-indigo-500" />
            <span className="text-sm font-extrabold text-slate-800 tracking-tight">Active Analytics Overview</span>
          </div>
          <AdminAnalyticsGrid 
            assignments={items} 
            predictions={analytics?.predictions ?? []} 
            clusters={analytics?.clusters ?? []} 
        />
      </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-indigo-500" />
                <span>Assigned Students</span>
              </h3>
              <p className="mt-1 text-sm text-slate-500">Students are filtered to the college assigned to your faculty account.</p>
            </div>
            <span className="rounded-full bg-indigo-50 border border-indigo-100 px-3 py-1 text-xs font-bold text-indigo-600">
              {students.length} records
            </span>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-100">
            <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Seat No</th>
                  <th className="px-4 py-3">College</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {students.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-slate-400 font-semibold" colSpan={5}>
                      No students found for this college.
                    </td>
                  </tr>
                ) : (
                  students.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-800">{student.full_name}</div>
                        <div className="text-xs text-slate-400">@{student.username}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{student.seat_no}</td>
                      <td className="px-4 py-3 text-slate-600">{student.college ?? "-"}</td>
                      <td className="px-4 py-3 text-slate-600">{student.email}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-600">
                          {student.is_email_verified ? "Email ✓" : "Email pending"}
                          <span className="text-slate-300">•</span>
                          {student.is_phone_verified ? "Phone ✓" : "Phone pending"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Header Controls for Pending List */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
              <Bookmark className="h-5 w-5 text-indigo-500" />
              <span>Assignment Grading List</span>
            </h3>
            <p className="mt-1 text-sm text-slate-500">Provide scores, change status tags, and document qualitative feedback.</p>
          </div>
          <div className="rounded-full bg-indigo-50 border border-indigo-100 px-3.5 py-1 text-xs font-bold text-indigo-600 flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            <span>Interactive grading panel</span>
          </div>
        </div>

        {/* Grading List Queue */}
        <div className="space-y-6">
          {items.length === 0 ? (
            <div className="rounded-3xl border border-slate-100 bg-white p-8 text-center text-slate-400 font-semibold flex flex-col items-center gap-2">
              <FileText className="h-10 w-10 text-slate-300 stroke-1" />
              <span>No submitted assignments currently queued.</span>
            </div>
          ) : (
            items.map((item) => {
              const draft = drafts[item.id] ?? {
                status: item.status ?? "Pending",
                marks: String(item.marks ?? 0),
                teacher_note: item.teacher_note ?? ""
              };
              return (
                <article key={item.id} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm hover:shadow-md transition duration-200">
                  
                  {/* Item Header row */}
                  <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-50">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Assignment ID #{item.id}</div>
                      <h4 className="mt-1 text-lg font-extrabold text-slate-800 tracking-tight">{item.title ?? "Untitled Submission"}</h4>
                      <p className="mt-1 text-xs font-semibold text-slate-500 flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-indigo-600">Student: {item.student_name ?? "Anonymous"}</span>
                        <span>·</span>
                        <span>Subject: {item.subject ?? "Unassigned"}</span>
                        <span>·</span>
                        <span>College: {item.college_name ?? "Unassigned"}</span>
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${
                        item.status === "Checked" 
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                          : item.status === "Rejected"
                            ? "bg-rose-50 text-rose-700 border border-rose-100"
                            : "bg-amber-50 text-amber-700 border border-amber-100"
                      }`}>
                        {item.status ?? "Pending"}
                      </span>
                      <span className="rounded-full bg-indigo-50 border border-indigo-100 px-3 py-1 text-xs font-bold text-indigo-600 flex items-center gap-1">
                        <Award className="h-3.5 w-3.5" />
                        <span>Marks: {item.marks ?? 0}</span>
                      </span>
                      
                      {item.file_name ? (
                        <a
                          href={`${API_BASE_URL}/api/files/${item.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 rounded-full bg-slate-950 px-3.5 py-1 text-xs font-bold text-white shadow-sm hover:bg-slate-800 transition"
                        >
                          <FileDown className="h-3.5 w-3.5" />
                          <span>Retrieve File</span>
                        </a>
                      ) : null}
                    </div>
                  </div>

                  {/* Dual Column Info & Form Review Area */}
                  <div className="mt-6 grid gap-5 lg:grid-cols-[0.52fr_0.48fr]">
                    
                    {/* Left Column: Grade record details */}
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5 text-xs font-semibold space-y-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <LabelValue label="Graded By" value={item.graded_by ?? "Not graded yet"} icon={<UserCheck className="h-3.5 w-3.5 text-indigo-500" />} />
                        <LabelValue label="Graded At" value={item.graded_at ?? "Not graded yet"} icon={<Clock className="h-3.5 w-3.5 text-indigo-500" />} />
                      </div>
                      <div className="border-t border-slate-100 pt-4">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Professor Remarks</div>
                        <p className="mt-2.5 whitespace-pre-wrap text-slate-600 leading-relaxed font-semibold">
                          {item.teacher_note ?? "No feedback remarks documented yet."}
                        </p>
                      </div>
                    </div>

                    {/* Right Column: Interactive inputs form */}
                    <div className="space-y-4 rounded-2xl border border-slate-100 p-5 bg-white shadow-sm">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Change Status
                          </label>
                          <div className="relative mt-2">
                            <select
                              value={draft.status}
                              onChange={(event) =>
                                setDrafts((current) => ({
                                  ...current,
                                  [item.id]: { ...draft, status: event.target.value }
                                }))
                              }
                              className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-3 px-4 text-xs font-bold text-slate-700 outline-none transition focus:bg-white appearance-none"
                            >
                              {assignmentStatuses.map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </select>
                            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400 text-xs font-bold">
                              ▼
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Grade Score (0-100)
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step="0.5"
                            value={draft.marks}
                            onChange={(event) =>
                              setDrafts((current) => ({
                                ...current,
                                  [item.id]: { ...draft, marks: event.target.value }
                              }))
                            }
                            className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-3 px-4 text-xs font-bold text-slate-800 transition focus:bg-white outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Professor Review Feedback Notes
                        </label>
                        <textarea
                          value={draft.teacher_note}
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [item.id]: { ...draft, teacher_note: event.target.value }
                            }))
                          }
                          rows={3}
                          placeholder="Provide code improvement suggestions or grading explanations..."
                          className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-xs font-semibold text-slate-800 transition focus:bg-white outline-none"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => saveReview(item)}
                        disabled={savingId === item.id}
                        className="w-full flex items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-indigo-600 py-3 text-xs font-bold text-white shadow-sm hover:from-indigo-600 hover:to-indigo-700 active:scale-[0.98] disabled:opacity-60"
                      >
                        {savingId === item.id ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Updating database review...</span>
                          </>
                        ) : (
                          <span>Submit Grade & Remarks</span>
                        )}
                      </button>
                    </div>

                  </div>
                </article>
              );
            })
          )}
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

function LabelValue({ 
  label, 
  value,
  icon
}: Readonly<{ 
  label: string; 
  value: string; 
  icon?: ReactNode;
}>) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-1 text-xs font-bold text-slate-700">{value}</div>
    </div>
  );
}
