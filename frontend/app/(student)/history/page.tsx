"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/shell";
import { apiFetch, downloadApiFile } from "@/lib/api";
import { courseSubjects, studentNav } from "@/lib/constants";
import {
  AlertCircle,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock,
  Filter,
  FileDown,
  FileSpreadsheet,
  History,
  Trash2,
  XCircle
} from "lucide-react";

const ALL_SUBJECTS = Array.from(new Set(Object.values(courseSubjects).flat()));

type AssignmentItem = {
  id: number;
  subject: string | null;
  title: string | null;
  status: string | null;
  marks: number;
  file_name: string | null;
  teacher_note: string | null;
  graded_by: string | null;
  submit_date: string | null;
  submit_time: string | null;
};

type AssignmentListResponse = {
  status: string;
  items: AssignmentItem[];
  count: number;
};

type MeResponse = {
  status: string;
  role: string;
  data: {
    course_year: string | null;
  };
};

function extractBaseCourse(courseYear: string | null) {
  const course = (courseYear ?? "").split(" - ")[0]?.trim() ?? "";
  return ["BCA", "BBA", "B.Com"].includes(course) ? course : "";
}

function formatSubmissionDate(submitDate: string | null, submitTime: string | null) {
  if (!submitDate) return "—";
  const time = submitTime || "00:00:00";
  const combined = new Date(`${submitDate}T${time}`);
  if (Number.isNaN(combined.getTime())) return submitDate;
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(combined);
}

function formatSubmissionTime(submitDate: string | null, submitTime: string | null) {
  if (!submitDate) return "—";
  const time = submitTime || "00:00:00";
  const combined = new Date(`${submitDate}T${time}`);
  if (Number.isNaN(combined.getTime())) return time;
  return new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit" }).format(combined);
}

export default function StudentHistoryPage() {
  const [items, setItems] = useState<AssignmentItem[]>([]);
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [course, setCourse] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const subjectOptions = useMemo(() => {
    return course && courseSubjects[course] ? [...courseSubjects[course]] : [...ALL_SUBJECTS];
  }, [course]);

  useEffect(() => {
    apiFetch<MeResponse>("/api/me")
      .then((payload) => setCourse(extractBaseCourse(payload.data.course_year)))
      .catch(() => setCourse(""));
  }, []);

  useEffect(() => {
    if (subject && !subjectOptions.includes(subject)) {
      setSubject("");
    }
  }, [subject, subjectOptions]);

  async function loadAssignments(filters?: {
    search?: string;
    subject?: string;
    statusFilter?: string;
    fromDate?: string;
    toDate?: string;
  }) {
    setLoading(true);
    setMessage(null);
    try {
      const activeSearch = filters?.search ?? search;
      const activeSubject = filters?.subject ?? subject;
      const activeStatus = filters?.statusFilter ?? statusFilter;
      const activeFromDate = filters?.fromDate ?? fromDate;
      const activeToDate = filters?.toDate ?? toDate;

      const params = new URLSearchParams();
      if (activeSearch) params.set("search", activeSearch);
      if (activeSubject) params.set("subject", activeSubject);
      if (activeStatus) params.set("status_filter", activeStatus);
      if (activeFromDate) params.set("from_date", activeFromDate);
      if (activeToDate) params.set("to_date", activeToDate);

      const query = params.toString() ? `?${params.toString()}` : "";
      const payload = await apiFetch<AssignmentListResponse>(`/api/assignments/${query}`);
      setItems(payload.items);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load assignments");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAssignments().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function deleteAssignment(assignmentId: number) {
    const confirmed = window.confirm("Delete this record?");
    if (!confirmed) return;

    try {
      await apiFetch(`/api/assignments/${assignmentId}`, { method: "DELETE" });
      setItems((current) => current.filter((item) => item.id !== assignmentId));
      setMessage("Assignment deleted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Delete failed");
    }
  }

  async function downloadAssignment(item: AssignmentItem) {
    await downloadApiFile(`/api/files/${item.id}`, item.file_name || `assignment-${item.id}`);
  }

  return (
    <AppShell
      title="Submission History"
      subtitle="Review your grading logs, read teacher feedback, and download your submitted assets."
      nav={studentNav}
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
              <History className="h-5 w-5 text-indigo-500" />
              <span>Submission History</span>
            </h3>
            <p className="mt-1 text-sm text-slate-500">Track status updates, download files, and review marks.</p>
          </div>
          <div className="rounded-full bg-emerald-50 border border-emerald-100 px-3 py-1 text-xs font-bold text-emerald-600 flex items-center gap-1.5 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Live Audit Feed</span>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <form
            className="grid gap-3 sm:gap-4
              grid-cols-1
              sm:grid-cols-2
              lg:grid-cols-[1.5fr_1fr_1fr]
              xl:grid-cols-[1.5fr_1fr_1fr_1fr_1fr_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              loadAssignments().catch(() => undefined);
            }}
          >
            <div className="sm:col-span-2 lg:col-span-1 xl:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Keyword Search
              </label>
              <div className="relative mt-2">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400">
                  <Filter className="h-4.5 w-4.5" />
                </div>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search title or subject..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-3.5 pl-11 pr-4 text-sm font-semibold text-slate-700 outline-none transition focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Subject
              </label>
              <div className="relative mt-2">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400">
                  <BookOpen className="h-4.5 w-4.5" />
                </div>
                <select
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-3.5 pl-11 pr-4 text-sm font-semibold text-slate-700 outline-none transition focus:bg-white appearance-none"
                >
                  <option value="">All Subjects</option>
                  {subjectOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400 text-xs font-bold">
                  ▼
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Status
              </label>
              <div className="relative mt-2">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400">
                  <Clock className="h-4.5 w-4.5" />
                </div>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-3.5 pl-11 pr-4 text-sm font-semibold text-slate-700 outline-none transition focus:bg-white appearance-none"
                >
                  <option value="">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Checked">Checked</option>
                  <option value="Rejected">Rejected</option>
                </select>
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400 text-xs font-bold">
                  ▼
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                From Date
              </label>
              <div className="relative mt-2">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400">
                  <CalendarDays className="h-4.5 w-4.5" />
                </div>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(event) => setFromDate(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-3.5 pl-11 pr-4 text-sm font-semibold text-slate-700 outline-none transition focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                To Date
              </label>
              <div className="relative mt-2">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400">
                  <CalendarDays className="h-4.5 w-4.5" />
                </div>
                <input
                  type="date"
                  value={toDate}
                  onChange={(event) => setToDate(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-3.5 pl-11 pr-4 text-sm font-semibold text-slate-700 outline-none transition focus:bg-white"
                />
              </div>
            </div>

            {/* Filter + Reset buttons — full-width on mobile, auto on desktop */}
            <div className="flex gap-2 sm:col-span-2 lg:col-span-1 xl:col-span-1 xl:self-end">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-2xl bg-slate-900 py-3.5 px-4 text-sm font-bold text-white shadow-sm hover:bg-slate-800 transition disabled:opacity-60"
              >
                Filter
              </button>
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setSubject("");
                  setStatusFilter("");
                  setFromDate("");
                  setToDate("");
                  loadAssignments({
                    search: "",
                    subject: "",
                    statusFilter: "",
                    fromDate: "",
                    toDate: ""
                  }).catch(() => undefined);
                }}
                className="rounded-2xl border border-slate-200 bg-white py-3.5 px-4 text-sm font-bold text-slate-600 shadow-sm hover:bg-slate-50 transition"
              >
                Reset
              </button>
            </div>
          </form>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Subject</th>
                  <th className="px-6 py-4">Title</th>
                  <th className="px-6 py-4">Submission Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Marks</th>
                  <th className="px-6 py-4">Teacher Note</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-medium">
                {items.length === 0 ? (
                  <tr>
                    <td className="px-6 py-12 text-center text-slate-400 font-semibold" colSpan={7}>
                      <div className="flex flex-col items-center gap-2">
                        <FileSpreadsheet className="h-10 w-10 text-slate-300 stroke-1" />
                        <span>No submissions found for the selected criteria.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition duration-150">
                      <td className="px-6 py-4">
                        <div className="font-extrabold text-slate-800">{item.subject ?? "-"}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 max-w-[280px] truncate">
                        {item.title ?? "-"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-800">{formatSubmissionDate(item.submit_date, item.submit_time)}</div>
                        <div className="text-[11px] text-slate-400">{formatSubmissionTime(item.submit_date, item.submit_time)}</div>
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(item.status)}</td>
                      <td className="px-6 py-4">
                        <span className="font-extrabold text-slate-800">{item.marks ?? 0}</span>
                        <span className="text-slate-400 text-xs">/100</span>
                      </td>
                      <td className="px-6 py-4">
                        {item.teacher_note ? (
                          <span className="inline-block max-w-[240px] truncate text-slate-500 italic" title={item.teacher_note}>
                            {item.teacher_note}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-xs">No feedback yet</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {item.file_name ? (
                            <button
                              type="button"
                              onClick={() => downloadAssignment(item).catch((error) => setMessage(error instanceof Error ? error.message : "Download failed"))}
                              className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:border-indigo-200 hover:text-indigo-600"
                            >
                              <FileDown className="h-3.5 w-3.5" />
                              <span>Download</span>
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => deleteAssignment(item.id)}
                            className="flex items-center gap-1 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 shadow-sm transition hover:bg-rose-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {message ? (
          <div
            className={`rounded-2xl border p-4 text-xs font-semibold leading-relaxed flex items-start gap-2.5 ${
              message.toLowerCase().includes("success") || message.toLowerCase().includes("deleted")
                ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                : "border-rose-100 bg-rose-50 text-rose-700"
            }`}
          >
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{message}</span>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}

function getStatusBadge(status: string | null) {
  const normStatus = status?.trim() || "Pending";
  if (normStatus === "Checked") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-100/50 px-2.5 py-1 text-xs font-bold text-emerald-700">
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
        <span>Checked</span>
      </span>
    );
  }
  if (normStatus === "Rejected") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-100/50 px-2.5 py-1 text-xs font-bold text-rose-700">
        <XCircle className="h-3.5 w-3.5 text-rose-500" />
        <span>Rejected</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-100/50 px-2.5 py-1 text-xs font-bold text-amber-700">
      <Clock className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
      <span>Pending</span>
    </span>
  );
}
