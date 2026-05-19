"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/shell";
import { API_BASE_URL, apiFetch } from "@/lib/api";
import { assignmentStatuses, studentNav } from "@/lib/constants";
import { 
  FileDown, 
  Filter, 
  History, 
  Clock, 
  AlertCircle, 
  Award, 
  BookOpen, 
  CheckCircle2, 
  XCircle,
  FileSpreadsheet
} from "lucide-react";

type AssignmentItem = {
  id: number;
  subject: string | null;
  title: string | null;
  status: string | null;
  marks: number;
  file_name: string | null;
  teacher_note: string | null;
  graded_by: string | null;
};

type AssignmentListResponse = {
  status: string;
  items: AssignmentItem[];
  count: number;
};

export default function StudentHistoryPage() {
  const [items, setItems] = useState<AssignmentItem[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadAssignments(filterStatus = statusFilter) {
    setLoading(true);
    setMessage(null);
    try {
      const query = filterStatus ? `?status_filter=${encodeURIComponent(filterStatus)}` : "";
      const payload = await apiFetch<AssignmentListResponse>(`/api/assignments${query}`);
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

  return (
    <AppShell
      title="Submission History"
      subtitle="Review your grading logs, read detailed feedback notes from professors, and download your submitted assets."
      nav={studentNav}
    >
      <div className="space-y-6">
        
        {/* Header Controls Area */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
              <History className="h-5 w-5 text-indigo-500" />
              <span>Your Submission History</span>
            </h3>
            <p className="mt-1 text-sm text-slate-500">Track status updates, download practical file backups, and review grade summaries.</p>
          </div>
          <div className="rounded-full bg-emerald-50 border border-emerald-100 px-3 py-1 text-xs font-bold text-emerald-600 flex items-center gap-1.5 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Live Audit Feed</span>
          </div>
        </div>

        {/* Filters Panel Wrapper */}
        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <form 
            className="grid gap-4 lg:grid-cols-[1.5fr_1fr_auto_auto]" 
            onSubmit={(event) => { 
              event.preventDefault(); 
              loadAssignments().catch(() => undefined); 
            }}
          >
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Filter by Status
              </label>
              <div className="relative mt-2">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400">
                  <Filter className="h-4.5 w-4.5" />
                </div>
                <select 
                  value={statusFilter} 
                  onChange={(event) => setStatusFilter(event.target.value)} 
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-3.5 pl-11 pr-4 text-sm font-semibold text-slate-700 outline-none transition focus:bg-white appearance-none"
                >
                  <option value="">Show All Statuses</option>
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
            
            <div className="hidden lg:block" />
            <div className="hidden lg:block" />
            
            <button 
              type="submit" 
              className="self-end w-full lg:w-auto flex items-center justify-center gap-1.5 rounded-2xl bg-slate-900 py-3.5 px-6 text-sm font-bold text-white shadow-sm hover:bg-slate-800 transition duration-200"
            >
              <Filter className="h-4 w-4" />
              <span>Apply Filter</span>
            </button>
          </form>
        </div>

        {/* Submissions List Container */}
        <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
          
          {/* Desktop Table View */}
          <div className="hidden lg:block">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Subject Info</th>
                  <th className="px-6 py-4">Practical Title</th>
                  <th className="px-6 py-4">Submission Status</th>
                  <th className="px-6 py-4">Marks Earned</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-medium">
                {items.length === 0 ? (
                  <tr>
                    <td className="px-6 py-12 text-center text-slate-400 font-semibold" colSpan={5}>
                      <div className="flex flex-col items-center gap-2">
                        <FileSpreadsheet className="h-10 w-10 text-slate-300 stroke-1" />
                        <span>No submissions found under this scope.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition duration-150">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                            <BookOpen className="h-4.5 w-4.5" />
                          </div>
                          <div>
                            <div className="text-slate-800 font-extrabold">{item.subject ?? "-"}</div>
                            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Course Syllabus</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 max-w-[280px] truncate">
                        {item.title ?? "-"}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(item.status)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <Award className="h-4.5 w-4.5 text-indigo-500" />
                          <span className="font-extrabold text-slate-800">{item.marks ?? 0}</span>
                          <span className="text-slate-400 text-xs">/100</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {item.file_name ? (
                            <a
                              href={`${API_BASE_URL}/api/files/${item.id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:border-indigo-200 hover:text-indigo-600"
                            >
                              <FileDown className="h-3.5 w-3.5" />
                              <span>Download</span>
                            </a>
                          ) : (
                            <span className="text-xs text-slate-400 font-semibold px-3 py-2 bg-slate-50 rounded-xl border border-slate-100">No Asset</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards List View */}
          <div className="grid gap-4 p-4 lg:hidden">
            {items.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400 font-semibold flex flex-col items-center gap-2">
                <FileSpreadsheet className="h-8 w-8 text-slate-300 stroke-1" />
                <span>No submissions found under this scope.</span>
              </div>
            ) : null}
            {items.map((item) => (
              <article key={item.id} className="rounded-2xl border border-slate-100 p-5 space-y-4 hover:border-slate-200 transition">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-extrabold text-slate-800 text-base">{item.title ?? "-"}</div>
                    <div className="mt-1 text-xs font-bold text-indigo-600 flex items-center gap-1">
                      <BookOpen className="h-3.5 w-3.5" />
                      <span>{item.subject ?? "-"}</span>
                    </div>
                  </div>
                  <div>
                    {getStatusBadge(item.status)}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-b border-slate-50 py-3 text-xs">
                  <div className="flex items-center gap-1">
                    <Award className="h-4 w-4 text-indigo-500" />
                    <span>Grade Score:</span>
                  </div>
                  <div className="font-extrabold text-slate-800">{item.marks ?? 0} / 100</div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  {item.file_name ? (
                    <a
                      href={`${API_BASE_URL}/api/files/${item.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white w-full"
                    >
                      <FileDown className="h-4 w-4" />
                      <span>Download File Backup</span>
                    </a>
                  ) : (
                    <span className="text-center rounded-xl border border-slate-100 bg-slate-50 py-2 w-full text-xs text-slate-400 font-bold">No file uploaded</span>
                  )}
                </div>
              </article>
            ))}
          </div>

        </div>

        {/* Feedback Message Panel */}
        {message ? (
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-xs font-semibold text-slate-500 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-slate-400 shrink-0" />
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
