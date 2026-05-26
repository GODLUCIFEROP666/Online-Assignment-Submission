"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { AdminAnalyticsGrid } from "@/components/charts/admin-analytics-grid";
import { AppShell } from "@/components/shell";
import { apiFetch, downloadApiFile } from "@/lib/api";
import { adminNav } from "@/lib/constants";
import { useLiveRefresh } from "@/hooks/use-live-refresh";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileDown,
  FileSpreadsheet,
  GraduationCap,
  KeyRound,
  Loader2,
  Mail,
  Pencil,
  Plus,
  Save,
  School,
  Trash2,
  UserCheck,
  Users,
  X
} from "lucide-react";

type OverviewResponse = {
  status: string;
  data: {
    students: number;
    teachers: number;
    assignments: number;
    pending: number;
    checked: number;
    rejected: number;
    colleges: number;
  };
};

type AnalyticsResponse = {
  status: string;
  data: {
    assignments?: number;
    students?: number;
    teachers?: number;
    pending?: number;
    colleges?: number;
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

type CollegeItem = {
  id: number;
  name: string;
  created_at?: string | null;
  updated_at?: string | null;
};

type CollegeListResponse = {
  status: string;
  items: CollegeItem[];
  count: number;
};

type TeacherFormState = {
  name: string;
  username: string;
  email: string;
  college: string;
  course: string;
  password: string;
};

// ──────────────────────────────────────────────────────────────────────────────
// SuperAdmin Dashboard
// Scope: global management — students, teachers, colleges, analytics, reports.
// SuperAdmin does NOT grade assignments, review submissions, or enter marks.
// That is exclusively the Teacher/Admin role.
// ──────────────────────────────────────────────────────────────────────────────
export default function SuperAdminPage() {
  const [overview, setOverview] = useState<OverviewResponse["data"] | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsResponse["data"] | null>(null);
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [colleges, setColleges] = useState<CollegeItem[]>([]);
  const [teacherForm, setTeacherForm] = useState<TeacherFormState>({
    name: "",
    username: "",
    email: "",
    college: "",
    course: "",
    password: ""
  });
  const [editingTeacherId, setEditingTeacherId] = useState<number | null>(null);
  const [collegeName, setCollegeName] = useState("");
  const [editingCollegeId, setEditingCollegeId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [savingTeacher, setSavingTeacher] = useState(false);
  const [savingCollege, setSavingCollege] = useState(false);

  async function loadDashboard() {
    const [overviewPayload, analyticsPayload, teachersPayload, studentsPayload, collegesPayload] = await Promise.all([
      apiFetch<OverviewResponse>("/api/admin/overview"),
      apiFetch<AnalyticsResponse>("/api/analytics/dashboard"),
      apiFetch<TeacherListResponse>("/api/admin/teachers"),
      apiFetch<StudentListResponse>("/api/admin/students"),
      apiFetch<CollegeListResponse>("/api/admin/colleges"),
    ]);

    setOverview(overviewPayload.data);
    setAnalytics(analyticsPayload.data);
    setTeachers(teachersPayload.items);
    setStudents(studentsPayload.items);
    setColleges(collegesPayload.items);
  }

  useLiveRefresh(() => loadDashboard().catch((error) => setMessage(error instanceof Error ? error.message : "Failed to load superadmin dashboard")));

  function beginTeacherEdit(teacher: TeacherItem) {
    setEditingTeacherId(teacher.id);
    setTeacherForm({
      name: teacher.name,
      username: teacher.username,
      email: teacher.email,
      college: teacher.college ?? "",
      course: teacher.course ?? "",
      password: ""
    });
  }

  function clearTeacherForm() {
    setEditingTeacherId(null);
    setTeacherForm({
      name: "",
      username: "",
      email: "",
      college: "",
      course: "",
      password: ""
    });
  }

  function beginCollegeEdit(college: CollegeItem) {
    setEditingCollegeId(college.id);
    setCollegeName(college.name);
  }

  function clearCollegeForm() {
    setEditingCollegeId(null);
    setCollegeName("");
  }

  async function saveTeacher() {
    setSavingTeacher(true);
    setMessage(null);
    try {
      if (editingTeacherId) {
        const payload = await apiFetch<{ status: string; message: string; teacher: TeacherItem }>(`/api/admin/teachers/${editingTeacherId}`, {
          method: "PUT",
          body: JSON.stringify({
            name: teacherForm.name,
            username: teacherForm.username,
            email: teacherForm.email,
            college: teacherForm.college,
            course: teacherForm.course
          })
        });
        setTeachers((current) => current.map((teacher) => (teacher.id === editingTeacherId ? payload.teacher : teacher)));
        setMessage(`Teacher #${editingTeacherId} updated.`);
      } else {
        if (!teacherForm.password) {
          throw new Error("Password is required for new teacher accounts");
        }
        const payload = await apiFetch<{ status: string; message: string; teacher: TeacherItem }>("/api/admin/teachers", {
          method: "POST",
          body: JSON.stringify({
            name: teacherForm.name,
            username: teacherForm.username,
            email: teacherForm.email,
            password: teacherForm.password,
            college: teacherForm.college,
            course: teacherForm.course
          })
        });
        setTeachers((current) => [payload.teacher, ...current]);
        setMessage("Teacher account created.");
      }
      clearTeacherForm();
      await loadDashboard();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Teacher save failed");
    } finally {
      setSavingTeacher(false);
    }
  }

  async function resetTeacherPassword(teacherId: number) {
    const nextPassword = window.prompt("Enter the new teacher password");
    if (!nextPassword) return;
    setMessage(null);
    try {
      await apiFetch(`/api/admin/teachers/${teacherId}/password`, {
        method: "PATCH",
        body: JSON.stringify({ new_password: nextPassword })
      });
      setMessage(`Teacher #${teacherId} password updated.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Password reset failed");
    }
  }

  async function deleteTeacher(teacherId: number) {
    if (!window.confirm("Delete this teacher account?")) return;
    setMessage(null);
    try {
      await apiFetch(`/api/admin/teachers/${teacherId}`, { method: "DELETE" });
      setTeachers((current) => current.filter((teacher) => teacher.id !== teacherId));
      setMessage(`Teacher #${teacherId} deleted.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Teacher delete failed");
    }
  }

  async function saveCollege() {
    setSavingCollege(true);
    setMessage(null);
    try {
      if (editingCollegeId) {
        const payload = await apiFetch<{ status: string; message: string; college: CollegeItem }>(`/api/admin/colleges/${editingCollegeId}`, {
          method: "PUT",
          body: JSON.stringify({ name: collegeName })
        });
        setColleges((current) => current.map((college) => (college.id === editingCollegeId ? payload.college : college)));
        setMessage(`College #${editingCollegeId} updated.`);
      } else {
        const payload = await apiFetch<{ status: string; message: string; college: CollegeItem }>("/api/admin/colleges", {
          method: "POST",
          body: JSON.stringify({ name: collegeName })
        });
        setColleges((current) => [payload.college, ...current]);
        setMessage("College created.");
      }
      clearCollegeForm();
      await loadDashboard();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "College save failed");
    } finally {
      setSavingCollege(false);
    }
  }

  async function deleteCollege(collegeId: number) {
    if (!window.confirm("Delete this college?")) return;
    setMessage(null);
    try {
      await apiFetch(`/api/admin/colleges/${collegeId}`, { method: "DELETE" });
      setColleges((current) => current.filter((college) => college.id !== collegeId));
      setMessage(`College #${collegeId} deleted.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "College delete failed");
    }
  }

  async function exportStudents() {
    await downloadApiFile("/api/admin/export/students.csv", "students.csv");
  }

  return (
    <AppShell
      title="SuperAdmin Dashboard"
      subtitle="University-wide administration — manage colleges, teachers, students, analytics and reports."
      nav={adminNav}
    >
      <div className="space-y-6">

        {/* ── Global Statistics ── */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <StatCard label="Total Students" value={String(overview?.students ?? "-")} icon={<Users className="h-5 w-5 text-indigo-500" />} />
          <StatCard label="Active Teachers" value={String(overview?.teachers ?? "-")} icon={<UserCheck className="h-5 w-5 text-emerald-500" />} />
          <StatCard label="Total Assignments" value={String(overview?.assignments ?? "-")} icon={<FileSpreadsheet className="h-5 w-5 text-violet-500" />} />
          <StatCard label="Pending" value={String(overview?.pending ?? "-")} icon={<Clock className="h-5 w-5 text-amber-500" />} />
          <StatCard label="Checked" value={String(overview?.checked ?? "-")} icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />} />
          <StatCard label="Rejected" value={String(overview?.rejected ?? "-")} icon={<AlertCircle className="h-5 w-5 text-rose-500" />} />
        </div>

        {/* ── Analytics Overview ── */}
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 pb-4 mb-4 border-b border-slate-100">
            <GraduationCap className="h-5 w-5 text-indigo-500" />
            <span className="text-sm font-extrabold text-slate-800 tracking-tight">Active Analytics Overview</span>
          </div>
          <AdminAnalyticsGrid assignments={[]} predictions={analytics?.predictions ?? []} clusters={analytics?.clusters ?? []} />
        </div>

        {/* ── Teacher Management ── */}
        <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-500" />
                <span>Teacher Management</span>
              </h3>
              <p className="mt-1 text-sm text-slate-500">Create, edit, reset passwords, and delete faculty accounts.</p>
            </div>
            <button
              type="button"
              onClick={clearTeacherForm}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600"
            >
              <Plus className="h-4 w-4" />
              <span>New Teacher</span>
            </button>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="Name" value={teacherForm.name} onChange={(value) => setTeacherForm((current) => ({ ...current, name: value }))} />
            <Field label="Username" value={teacherForm.username} onChange={(value) => setTeacherForm((current) => ({ ...current, username: value }))} />
            <Field label="Email" type="email" value={teacherForm.email} onChange={(value) => setTeacherForm((current) => ({ ...current, email: value }))} icon={<Mail className="h-4 w-4" />} />
            <Field label="College" value={teacherForm.college} onChange={(value) => setTeacherForm((current) => ({ ...current, college: value }))} />
            <Field label="Course" value={teacherForm.course} onChange={(value) => setTeacherForm((current) => ({ ...current, course: value }))} />
            <Field
              label={editingTeacherId ? "Password (reset via row action)" : "Password"}
              type="password"
              value={teacherForm.password}
              onChange={(value) => setTeacherForm((current) => ({ ...current, password: value }))}
              disabled={Boolean(editingTeacherId)}
              icon={<KeyRound className="h-4 w-4" />}
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={saveTeacher}
              disabled={savingTeacher}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-xs font-bold text-white shadow-sm hover:bg-slate-800 disabled:opacity-60"
            >
              {savingTeacher ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span>{editingTeacherId ? "Update Teacher" : "Create Teacher"}</span>
            </button>
            {editingTeacherId ? (
              <button
                type="button"
                onClick={clearTeacherForm}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
                <span>Cancel Edit</span>
              </button>
            ) : null}
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-100">
            <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Teacher</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">College</th>
                  <th className="px-4 py-3">Course</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {teachers.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-slate-400 font-semibold" colSpan={5}>
                      No teachers found.
                    </td>
                  </tr>
                ) : (
                  teachers.map((teacher) => (
                    <tr key={teacher.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-800">{teacher.name}</div>
                        <div className="text-xs text-slate-400">@{teacher.username}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{teacher.email}</td>
                      <td className="px-4 py-3 text-slate-600">{teacher.college ?? "-"}</td>
                      <td className="px-4 py-3 text-slate-600">{teacher.course ?? "-"}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => beginTeacherEdit(teacher)}
                            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:border-indigo-200 hover:text-indigo-600"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => resetTeacherPassword(teacher.id).catch(() => undefined)}
                            className="inline-flex items-center gap-1 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 hover:bg-amber-100"
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                            <span>Reset</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteTeacher(teacher.id).catch(() => undefined)}
                            className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100"
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
        </section>

        {/* ── College Management ── */}
        <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                <School className="h-5 w-5 text-indigo-500" />
                <span>College Management</span>
              </h3>
              <p className="mt-1 text-sm text-slate-500">Create, edit, and delete college records used by student and teacher routing.</p>
            </div>
            <span className="rounded-full bg-indigo-50 border border-indigo-100 px-3 py-1 text-xs font-bold text-indigo-600">
              {colleges.length} colleges
            </span>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
            <Field label="College Name" value={collegeName} onChange={setCollegeName} icon={<School className="h-4 w-4" />} />
            <div className="flex items-end gap-3">
              <button
                type="button"
                onClick={saveCollege}
                disabled={savingCollege}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-xs font-bold text-white shadow-sm hover:bg-slate-800 disabled:opacity-60"
              >
                {savingCollege ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                <span>{editingCollegeId ? "Update College" : "Create College"}</span>
              </button>
              {editingCollegeId ? (
                <button
                  type="button"
                  onClick={clearCollegeForm}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  <X className="h-4 w-4" />
                  <span>Cancel Edit</span>
                </button>
              ) : null}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-100">
            <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">College</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {colleges.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-slate-400 font-semibold" colSpan={2}>
                      No colleges found.
                    </td>
                  </tr>
                ) : (
                  colleges.map((college) => (
                    <tr key={college.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-800">{college.name}</div>
                        <div className="text-xs text-slate-400">ID #{college.id}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => beginCollegeEdit(college)}
                            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:border-indigo-200 hover:text-indigo-600"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteCollege(college.id).catch(() => undefined)}
                            className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100"
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
        </section>

        {/* ── Student Directory ── */}
        <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-500" />
                <span>Student Directory</span>
              </h3>
              <p className="mt-1 text-sm text-slate-500">View all student records across all colleges and export as CSV.</p>
            </div>
            <button
              type="button"
              onClick={() => exportStudents().catch((error) => setMessage(error instanceof Error ? error.message : "CSV export failed"))}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600"
            >
              <FileDown className="h-4 w-4" />
              <span>Export CSV</span>
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-100">
            <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Seat No</th>
                  <th className="px-4 py-3">College</th>
                  <th className="px-4 py-3">Course</th>
                  <th className="px-4 py-3">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {students.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-slate-400 font-semibold" colSpan={5}>
                      No students found.
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
                      <td className="px-4 py-3 text-slate-600">{student.course_year ?? "-"}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {student.is_email_verified ? "Email ✓" : "Email pending"} / {student.is_phone_verified ? "Phone ✓" : "Phone pending"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Assignment Statistics (read-only) ── */}
        <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 pb-4 mb-4 border-b border-slate-100">
            <FileSpreadsheet className="h-5 w-5 text-indigo-500" />
            <span className="text-sm font-extrabold text-slate-800 tracking-tight">Assignment Statistics</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 text-center">
              <div className="text-3xl font-black text-indigo-600">{overview?.assignments ?? "-"}</div>
              <div className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-400">Total Submissions</div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 text-center">
              <div className="text-3xl font-black text-amber-500">{overview?.pending ?? "-"}</div>
              <div className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-400">Pending Review</div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 text-center">
              <div className="text-3xl font-black text-emerald-600">{overview?.checked ?? "-"}</div>
              <div className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-400">Checked &amp; Graded</div>
            </div>
          </div>
          <p className="mt-4 text-xs text-slate-400 font-semibold">
            Assignment grading and review is handled exclusively by Teacher/Admin accounts.
          </p>
        </section>

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

function StatCard({
  label,
  value,
  icon
}: Readonly<{
  label: string;
  value: string;
  icon: ReactNode;
}>) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm flex items-center justify-between">
      <div>
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</div>
        <div className="mt-2 text-3xl font-black text-slate-800 tracking-tight">{value}</div>
      </div>
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 border border-slate-100 shadow-sm">{icon}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  icon,
  disabled = false
}: Readonly<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  icon?: ReactNode;
  disabled?: boolean;
}>) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">{label}</label>
      <div className="relative mt-2">
        {icon ? <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400">{icon}</div> : null}
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className={`w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-3 ${icon ? "pl-11" : "px-4"} pr-4 text-sm font-medium text-slate-800 transition focus:bg-white placeholder:text-slate-300 disabled:opacity-60`}
        />
      </div>
    </div>
  );
}
