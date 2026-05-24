"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { AdminAnalyticsGrid } from "@/components/charts/admin-analytics-grid";
import { AppShell } from "@/components/shell";
import { API_BASE_URL, apiFetch } from "@/lib/api";
import { adminNav, assignmentStatuses } from "@/lib/constants";
import {
  AlertCircle,
  BookOpen,
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
    colleges: number;
  };
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
  file_name: string | null;
  teacher_note: string | null;
  graded_by: string | null;
  graded_at: string | null;
  submit_date: string | null;
};

type AssignmentListResponse = {
  status: string;
  items: AssignmentItem[];
  count: number;
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

type ReviewDraft = {
  status: string;
  marks: string;
  teacher_note: string;
};

type TeacherFormState = {
  name: string;
  username: string;
  email: string;
  college: string;
  course: string;
  password: string;
};

export default function SuperAdminPage() {
  const [overview, setOverview] = useState<OverviewResponse["data"] | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsResponse["data"] | null>(null);
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [colleges, setColleges] = useState<CollegeItem[]>([]);
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [drafts, setDrafts] = useState<Record<number, ReviewDraft>>({});
  const [savingAssignmentId, setSavingAssignmentId] = useState<number | null>(null);
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
    const [overviewPayload, analyticsPayload, teachersPayload, studentsPayload, collegesPayload, assignmentsPayload] = await Promise.all([
      apiFetch<OverviewResponse>("/api/admin/overview"),
      apiFetch<AnalyticsResponse>("/api/analytics/dashboard"),
      apiFetch<TeacherListResponse>("/api/admin/teachers"),
      apiFetch<StudentListResponse>("/api/admin/students"),
      apiFetch<CollegeListResponse>("/api/admin/colleges"),
      apiFetch<AssignmentListResponse>("/api/admin/assignments")
    ]);

    setOverview(overviewPayload.data);
    setAnalytics(analyticsPayload.data);
    setTeachers(teachersPayload.items);
    setStudents(studentsPayload.items);
    setColleges(collegesPayload.items);
    setAssignments(assignmentsPayload.items);
    setDrafts(
      Object.fromEntries(
        assignmentsPayload.items.map((item) => [
          item.id,
          {
            status: item.status ?? "Pending",
            marks: String(item.marks ?? 0),
            teacher_note: item.teacher_note ?? ""
          }
        ])
      )
    );
  }

  useEffect(() => {
    loadDashboard().catch((error) => setMessage(error instanceof Error ? error.message : "Failed to load superadmin dashboard"));
  }, []);

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

  async function saveReview(item: AssignmentItem) {
    const draft = drafts[item.id];
    if (!draft) return;
    setSavingAssignmentId(item.id);
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
      setAssignments((current) => current.map((row) => (row.id === item.id ? payload.assignment : row)));
      setDrafts((current) => ({
        ...current,
        [item.id]: {
          status: payload.assignment.status ?? "Pending",
          marks: String(payload.assignment.marks ?? 0),
          teacher_note: payload.assignment.teacher_note ?? ""
        }
      }));
      setMessage(`Assignment #${item.id} reviewed.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Review failed");
    } finally {
      setSavingAssignmentId(null);
    }
  }

  return (
    <AppShell
      title="SuperAdmin Dashboard"
      subtitle="University-wide administration with college CRUD, teacher management, assignment review, student export, and live analytics."
      nav={adminNav}
    >
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Total Students" value={String(overview?.students ?? "-")} icon={<Users className="h-5 w-5 text-indigo-500" />} />
          <StatCard label="Active Teachers" value={String(overview?.teachers ?? "-")} icon={<UserCheck className="h-5 w-5 text-emerald-500" />} />
          <StatCard label="Total Practicals" value={String(overview?.assignments ?? "-")} icon={<FileSpreadsheet className="h-5 w-5 text-violet-500" />} />
          <StatCard label="Pending Audits" value={String(overview?.pending ?? "-")} icon={<Clock className="h-5 w-5 text-amber-500" />} />
          <StatCard label="Colleges" value={String(overview?.colleges ?? colleges.length ?? "-")} icon={<School className="h-5 w-5 text-sky-500" />} />
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 pb-4 mb-4 border-b border-slate-100">
            <GraduationCap className="h-5 w-5 text-indigo-500" />
            <span className="text-sm font-extrabold text-slate-800 tracking-tight">Active Analytics Overview</span>
          </div>
          <AdminAnalyticsGrid assignments={assignments} predictions={analytics?.predictions ?? []} clusters={analytics?.clusters ?? []} />
        </div>

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

        <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-500" />
                <span>Student Directory</span>
              </h3>
              <p className="mt-1 text-sm text-slate-500">View student records and export the current directory as CSV.</p>
            </div>
            <a
              href={`${API_BASE_URL}/api/admin/export/students.csv`}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600"
            >
              <FileDown className="h-4 w-4" />
              <span>Export CSV</span>
            </a>
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
                        {student.is_email_verified ? "Email verified" : "Email pending"} / {student.is_phone_verified ? "Phone verified" : "Phone pending"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-indigo-500" />
                <span>Assignment Review Queue</span>
              </h3>
              <p className="mt-1 text-sm text-slate-500">Review every submitted assignment, update status, and persist grades to MongoDB.</p>
            </div>
            <span className="rounded-full bg-indigo-50 border border-indigo-100 px-3 py-1 text-xs font-bold text-indigo-600">
              {assignments.length} submissions
            </span>
          </div>

          <div className="space-y-4">
            {assignments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-400 font-semibold">
                No submitted assignments available.
              </div>
            ) : (
              assignments.map((item) => {
                const draft = drafts[item.id] ?? {
                  status: item.status ?? "Pending",
                  marks: String(item.marks ?? 0),
                  teacher_note: item.teacher_note ?? ""
                };
                return (
                  <article key={item.id} className="rounded-3xl border border-slate-100 bg-slate-50/40 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Assignment ID #{item.id}</div>
                        <h4 className="mt-1 text-lg font-extrabold text-slate-800 tracking-tight">{item.title ?? "Untitled submission"}</h4>
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          Student: {item.student_name ?? "Anonymous"} | College: {item.college_name ?? "Unassigned"} | Subject: {item.subject ?? "Unassigned"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-white border border-slate-200 px-3 py-1 text-xs font-bold text-slate-600">
                          {item.status ?? "Pending"}
                        </span>
                        {item.file_name ? (
                          <a
                            href={`${API_BASE_URL}/api/files/${item.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-full bg-slate-950 px-3 py-1 text-xs font-bold text-white"
                          >
                            <FileDown className="h-3.5 w-3.5" />
                            <span>Open file</span>
                          </a>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 lg:grid-cols-[0.6fr_0.4fr]">
                      <div className="rounded-2xl border border-slate-100 bg-white p-4 text-xs font-semibold text-slate-600">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <ReviewMeta label="Graded By" value={item.graded_by ?? "Not graded yet"} />
                          <ReviewMeta label="Graded At" value={item.graded_at ?? "Not graded yet"} />
                        </div>
                        <div className="mt-4 border-t border-slate-100 pt-4">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Teacher Notes</div>
                          <p className="mt-2 whitespace-pre-wrap text-slate-600">{item.teacher_note ?? "No notes yet."}</p>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-100 bg-white p-4 space-y-4">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</label>
                          <select
                            value={draft.status}
                            onChange={(event) =>
                              setDrafts((current) => ({
                                ...current,
                                [item.id]: { ...draft, status: event.target.value }
                              }))
                            }
                            className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-xs font-bold text-slate-700 outline-none"
                          >
                            {assignmentStatuses.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Marks</label>
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
                            className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-xs font-bold text-slate-800 outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Notes</label>
                          <textarea
                            rows={3}
                            value={draft.teacher_note}
                            onChange={(event) =>
                              setDrafts((current) => ({
                                ...current,
                                [item.id]: { ...draft, teacher_note: event.target.value }
                              }))
                            }
                            className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-xs font-semibold text-slate-800 outline-none"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => saveReview(item)}
                          disabled={savingAssignmentId === item.id}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-60"
                        >
                          {savingAssignmentId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          <span>Persist Review</span>
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>

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

function ReviewMeta({
  label,
  value
}: Readonly<{
  label: string;
  value: string;
}>) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
      <div className="mt-1 text-xs font-bold text-slate-700">{value}</div>
    </div>
  );
}
