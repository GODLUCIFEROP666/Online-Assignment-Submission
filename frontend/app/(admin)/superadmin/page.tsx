"use client";

import type { ReactNode } from "react";
import { useState, useMemo } from "react";
import { AppShell } from "@/components/shell";
import { apiFetch, downloadApiFile } from "@/lib/api";
import { superadminNav, courseSubjects, semesters as semesterOptionsList } from "@/lib/constants";
import { useLiveRefresh } from "@/hooks/use-live-refresh";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Clock,
  Eye,
  FileDown,
  FileSpreadsheet,
  FileText,
  Filter,
  GraduationCap,
  KeyRound,
  Loader2,
  Mail,
  Pencil,
  Plus,
  Save,
  School,
  Search,
  Trash2,
  UserCheck,
  Users,
  X,
  XCircle,
  ShieldAlert,
  Wand2,
  Sparkles,
  Layers,
  Building2,
  Check,
  ChevronRight
} from "lucide-react";
import PlagiarismModal, { PlagiarismReportData } from "@/components/PlagiarismModal";
import AutoGradePanel, { AutoGradeRecommendation } from "@/components/AutoGradePanel";

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
  semester: string | null;
  subject: string | null;
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

type AssignmentItem = {
  id: number;
  user_id?: number | string | null;
  student_name?: string | null;
  college_name?: string | null;
  year?: string | null;
  course?: string | null;
  semester?: string | null;
  seat_no?: string | null;
  subject?: string | null;
  title?: string | null;
  details?: string | null;
  file_name?: string | null;
  file_original_name?: string | null;
  status?: string | null;
  submit_date?: string | null;
  submit_time?: string | null;
  teacher_note?: string | null;
  marks?: number | null;
  graded_by?: string | null;
  graded_at?: string | null;
};

type TeacherFormState = {
  name: string;
  username: string;
  email: string;
  college: string;
  course: string;
  semester: string;
  subject: string;
  password: string;
};

const courseList = ["BCA", "BBA", "B.Com"] as const;
const semesterList = ["Sem 1", "Sem 2", "Sem 3", "Sem 4", "Sem 5", "Sem 6"] as const;

function isCSub(sub: string | null) {
  return sub ? ["c programming", "c language", "c lang", "c"].includes(sub.trim().toLowerCase()) : false;
}

export default function SuperAdminPage() {
  const [activeTab, setActiveTab] = useState<"FACULTY" | "COLLEGES" | "STUDENTS" | "ASSIGNMENTS">("FACULTY");

  const [overview, setOverview] = useState<OverviewResponse["data"] | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsResponse["data"] | null>(null);
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [colleges, setColleges] = useState<CollegeItem[]>([]);
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [teacherForm, setTeacherForm] = useState<TeacherFormState>({
    name: "",
    username: "",
    email: "",
    college: "",
    course: "BCA",
    semester: "Sem 1",
    subject: "C Programming",
    password: ""
  });
  const [editingTeacherId, setEditingTeacherId] = useState<number | null>(null);
  const [collegeName, setCollegeName] = useState("");
  const [editingCollegeId, setEditingCollegeId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [savingTeacher, setSavingTeacher] = useState(false);
  const [savingCollege, setSavingCollege] = useState(false);

  // Drilldown and Filter States
  const [selectedTeacherForDrilldown, setSelectedTeacherForDrilldown] = useState<TeacherItem | null>(null);
  const [selectedAssignmentDetail, setSelectedAssignmentDetail] = useState<AssignmentItem | null>(null);
  const [filterCourse, setFilterCourse] = useState<string>("ALL");
  const [filterSemester, setFilterSemester] = useState<string>("ALL");
  const [filterSubject, setFilterSubject] = useState<string>("ALL");
  const [filterTeacher, setFilterTeacher] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [modalSearch, setModalSearch] = useState<string>("");
  const [modalStatusFilter, setModalStatusFilter] = useState<string>("ALL");
  const [globalSearch, setGlobalSearch] = useState<string>("");

  // 100% Free Local AI & Plagiarism States
  const [plagiarismModalOpen, setPlagiarismModalOpen] = useState(false);
  const [plagiarismLoading, setPlagiarismLoading] = useState(false);
  const [plagiarismData, setPlagiarismData] = useState<PlagiarismReportData | null>(null);
  const [plagiarismSubject, setPlagiarismSubject] = useState("");

  const [autoGradeRecs, setAutoGradeRecs] = useState<Record<number, AutoGradeRecommendation>>({});
  const [autoGradeLoadingId, setAutoGradeLoadingId] = useState<number | null>(null);

  async function handlePlagiarismScan(subject: string) {
    if (!subject) return;
    setPlagiarismSubject(subject);
    setPlagiarismModalOpen(true);
    setPlagiarismLoading(true);
    try {
      const res = await apiFetch<{ status: string; report: PlagiarismReportData }>(`/api/assignments/plagiarism-scan/${encodeURIComponent(subject)}`);
      setPlagiarismData(res.report);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Plagiarism scan failed");
    } finally {
      setPlagiarismLoading(false);
    }
  }

  async function handleFetchAutoGrade(assignmentId: number) {
    setAutoGradeLoadingId(assignmentId);
    try {
      const res = await apiFetch<{ status: string; recommendation: AutoGradeRecommendation }>(`/api/assignments/${assignmentId}/auto-grade`);
      setAutoGradeRecs((prev) => ({ ...prev, [assignmentId]: res.recommendation }));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "AI Auto-grading failed");
    } finally {
      setAutoGradeLoadingId(null);
    }
  }

  async function loadDashboard() {
    const [overviewPayload, analyticsPayload, teachersPayload, studentsPayload, collegesPayload, assignmentsPayload] = await Promise.all([
      apiFetch<OverviewResponse>("/api/admin/overview"),
      apiFetch<AnalyticsResponse>("/api/analytics/dashboard"),
      apiFetch<TeacherListResponse>("/api/admin/teachers"),
      apiFetch<StudentListResponse>("/api/admin/students"),
      apiFetch<CollegeListResponse>("/api/admin/colleges"),
      apiFetch<{ items: AssignmentItem[] }>("/api/admin/assignments"),
    ]);

    setOverview(overviewPayload.data);
    setAnalytics(analyticsPayload.data);
    setTeachers(teachersPayload.items);
    setStudents(studentsPayload.items);
    setColleges(collegesPayload.items);
    setAssignments(assignmentsPayload.items);
  }

  useLiveRefresh(() => loadDashboard().catch((error) => setMessage(error instanceof Error ? error.message : "Failed to load superadmin dashboard")));

  function beginTeacherEdit(teacher: TeacherItem) {
    setEditingTeacherId(teacher.id);
    setTeacherForm({
      name: teacher.name,
      username: teacher.username,
      email: teacher.email,
      college: teacher.college ?? "",
      course: teacher.course ?? "BCA",
      semester: teacher.semester ?? "Sem 1",
      subject: teacher.subject ?? "",
      password: ""
    });
    setActiveTab("FACULTY");
  }

  function clearTeacherForm() {
    setEditingTeacherId(null);
    setTeacherForm({
      name: "",
      username: "",
      email: "",
      college: "",
      course: "BCA",
      semester: "Sem 1",
      subject: "C Programming",
      password: ""
    });
  }

  function beginCollegeEdit(college: CollegeItem) {
    setEditingCollegeId(college.id);
    setCollegeName(college.name);
    setActiveTab("COLLEGES");
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
            course: teacherForm.course,
            semester: teacherForm.semester,
            subject: teacherForm.subject
          })
        });
        setTeachers((current) => current.map((teacher) => (teacher.id === editingTeacherId ? payload.teacher : teacher)));
        setMessage(`Teacher #${editingTeacherId} updated successfully.`);
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
            course: teacherForm.course,
            semester: teacherForm.semester,
            subject: teacherForm.subject
          })
        });
        setTeachers((current) => [payload.teacher, ...current]);
        setMessage("New teacher account created with assigned scope!");
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
    const nextPassword = window.prompt("Enter the new teacher password:");
    if (!nextPassword) return;
    try {
      const payload = await apiFetch<{ status: string; message: string }>(`/api/admin/teachers/${teacherId}/password`, {
        method: "PATCH",
        body: JSON.stringify({ new_password: nextPassword })
      });
      setMessage(payload.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Password reset failed");
    }
  }

  async function deleteTeacher(teacherId: number) {
    if (!window.confirm("Are you sure you want to delete this teacher account?")) return;
    try {
      const payload = await apiFetch<{ status: string; message: string }>(`/api/admin/teachers/${teacherId}`, {
        method: "DELETE"
      });
      setTeachers((current) => current.filter((teacher) => teacher.id !== teacherId));
      setMessage(payload.message);
      await loadDashboard();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Delete teacher failed");
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
        setMessage("College created successfully.");
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
    if (!window.confirm("Are you sure you want to delete this college?")) return;
    try {
      const payload = await apiFetch<{ status: string; message: string }>(`/api/admin/colleges/${collegeId}`, {
        method: "DELETE"
      });
      setColleges((current) => current.filter((college) => college.id !== collegeId));
      setMessage(payload.message);
      await loadDashboard();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Delete college failed");
    }
  }

  async function exportStudents() {
    const csvContent = [
      ["Full Name", "Username", "Email", "Phone", "College", "Course Year", "Seat No", "Email Verified", "Phone Verified"].join(","),
      ...students.map((s) =>
        [
          `"${s.full_name}"`,
          `"${s.username}"`,
          `"${s.email}"`,
          `"${s.phone ?? ""}"`,
          `"${s.college ?? ""}"`,
          `"${s.course_year ?? ""}"`,
          `"${s.seat_no}"`,
          s.is_email_verified ? "Yes" : "No",
          s.is_phone_verified ? "Yes" : "No"
        ].join(",")
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `student_directory_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportTeachersCSV() {
    const csvContent = [
      ["Name", "Username", "Email", "College", "Course", "Semester", "Subject"].join(","),
      ...teachers.map((t) =>
        [
          `"${t.name}"`,
          `"${t.username}"`,
          `"${t.email}"`,
          `"${t.college ?? ""}"`,
          `"${t.course ?? ""}"`,
          `"${t.semester ?? ""}"`,
          `"${t.subject ?? ""}"`
        ].join(",")
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `teacher_directory_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function getSubmissionsForTeacher(teacher: TeacherItem) {
    if (!teacher.course || !teacher.semester || !teacher.subject) return [];
    return assignments.filter((a) => {
      const courseMatch = (a.course || a.year || "").toUpperCase().includes(teacher.course!.toUpperCase());
      const semDigits = (teacher.semester!.match(/\d+/) || [teacher.semester!])[0];
      const semMatch = (a.semester || a.year || "").toUpperCase().includes(semDigits);

      let subMatch = false;
      if (isCSub(teacher.subject) && isCSub(a.subject ?? null)) {
        subMatch = true;
      } else if (a.subject && teacher.subject) {
        subMatch = a.subject.trim().toLowerCase() === teacher.subject.trim().toLowerCase();
      }

      return courseMatch && semMatch && subMatch;
    });
  }

  const uniqueSubjects = useMemo(() => {
    const subs = new Set<string>();
    teachers.forEach((t) => t.subject && subs.add(t.subject));
    assignments.forEach((a) => a.subject && subs.add(a.subject));
    return Array.from(subs);
  }, [teachers, assignments]);

  const availableSubjectsForForm = useMemo(() => {
    const selectedCourse = teacherForm.course;
    return selectedCourse && courseSubjects[selectedCourse] ? [...courseSubjects[selectedCourse]] : uniqueSubjects;
  }, [teacherForm.course, uniqueSubjects]);

  const filteredTeachers = useMemo(() => {
    return teachers.filter((t) => {
      if (globalSearch.trim()) {
        const q = globalSearch.toLowerCase();
        const matchName = t.name.toLowerCase().includes(q);
        const matchUser = t.username.toLowerCase().includes(q);
        const matchSub = (t.subject || "").toLowerCase().includes(q);
        const matchCollege = (t.college || "").toLowerCase().includes(q);
        if (!matchName && !matchUser && !matchSub && !matchCollege) return false;
      }

      if (filterCourse !== "ALL" && (t.course || "").toUpperCase() !== filterCourse.toUpperCase()) return false;
      if (filterSemester !== "ALL" && t.semester !== filterSemester) return false;
      if (filterSubject !== "ALL") {
        if (isCSub(filterSubject) && isCSub(t.subject)) {
          // match
        } else if ((t.subject || "").toLowerCase() !== filterSubject.toLowerCase()) {
          return false;
        }
      }
      if (filterTeacher !== "ALL" && t.name !== filterTeacher && String(t.id) !== filterTeacher) return false;

      if (filterStatus !== "ALL") {
        const subs = getSubmissionsForTeacher(t);
        if (filterStatus === "Pending" && !subs.some((s) => s.status === "Pending" || !s.status)) return false;
        if (filterStatus === "Checked" && !subs.some((s) => s.status === "Checked")) return false;
        if (filterStatus === "Rejected" && !subs.some((s) => s.status === "Rejected")) return false;
      }

      return true;
    });
  }, [teachers, assignments, filterCourse, filterSemester, filterSubject, filterTeacher, filterStatus, globalSearch]);

  const drilldownSubmissions = useMemo(() => {
    if (!selectedTeacherForDrilldown) return [];
    let list = getSubmissionsForTeacher(selectedTeacherForDrilldown);

    if (modalStatusFilter !== "ALL") {
      list = list.filter((s) => {
        if (modalStatusFilter === "Pending") return s.status === "Pending" || !s.status;
        return s.status === modalStatusFilter;
      });
    }

    if (modalSearch.trim()) {
      const q = modalSearch.toLowerCase();
      list = list.filter((s) => (s.student_name || "").toLowerCase().includes(q) || (s.title || "").toLowerCase().includes(q) || (s.seat_no || "").toLowerCase().includes(q));
    }

    return list;
  }, [selectedTeacherForDrilldown, assignments, modalStatusFilter, modalSearch]);

  const filteredStudents = useMemo(() => {
    if (!globalSearch.trim()) return students;
    const q = globalSearch.toLowerCase();
    return students.filter(
      (s) =>
        s.full_name.toLowerCase().includes(q) ||
        s.username.toLowerCase().includes(q) ||
        s.seat_no.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q)
    );
  }, [students, globalSearch]);

  return (
    <AppShell
      title="Global SuperAdmin Operations"
      subtitle="Unrestricted system control · Manage faculty assignments, academic scopes, colleges, student records, and workload metrics."
      nav={superadminNav}
    >
      <div className="space-y-6">
        
        {/* Top Hero Glass Banner */}
        <div className="relative overflow-hidden rounded-3xl border border-indigo-500/20 bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-950 p-6 text-white shadow-xl">
          <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-lg shadow-indigo-500/30">
                <GraduationCap className="h-7 w-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-[10px] font-extrabold uppercase tracking-widest">
                    Global SuperAdmin Protocol
                  </span>
                  <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
                  Academic Management Control Center
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={exportTeachersCSV}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600/80 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl border border-indigo-400/30 shadow transition"
              >
                <FileDown className="w-4 h-4" /> Export Teachers CSV
              </button>
              <button
                onClick={exportStudents}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 shadow transition"
              >
                <FileDown className="w-4 h-4" /> Export Students CSV
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Metric Cards */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Students"
            value={String(overview?.students ?? 0)}
            subtitle="Registered Across Colleges"
            icon={<Users className="h-6 w-6 text-indigo-500" />}
            gradient="from-indigo-500/10 to-indigo-500/5 border-indigo-500/20"
          />
          <StatCard
            label="Faculty Teachers"
            value={String(overview?.teachers ?? 0)}
            subtitle="Mapped Academic Scope"
            icon={<UserCheck className="h-6 w-6 text-emerald-500" />}
            gradient="from-emerald-500/10 to-emerald-500/5 border-emerald-500/20"
          />
          <StatCard
            label="Total Submissions"
            value={String(overview?.assignments ?? 0)}
            subtitle={`${overview?.pending ?? 0} Pending Review`}
            icon={<FileSpreadsheet className="h-6 w-6 text-violet-500" />}
            gradient="from-violet-500/10 to-violet-500/5 border-violet-500/20"
          />
          <StatCard
            label="Colleges Directory"
            value={String(overview?.colleges ?? 0)}
            subtitle="Active Campuses"
            icon={<School className="h-6 w-6 text-amber-500" />}
            gradient="from-amber-500/10 to-amber-500/5 border-amber-500/20"
          />
        </section>

        {/* Control Navigation Tabs & Search Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-2 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100/80 p-1.5 rounded-xl border border-slate-200/60">
            <button
              type="button"
              onClick={() => setActiveTab("FACULTY")}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition ${
                activeTab === "FACULTY"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-200/60"
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Faculty &amp; Scope ({teachers.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("COLLEGES")}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition ${
                activeTab === "COLLEGES"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-200/60"
              }`}
            >
              <School className="w-4 h-4" />
              <span>Colleges ({colleges.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("STUDENTS")}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition ${
                activeTab === "STUDENTS"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-200/60"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Student Directory ({students.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("ASSIGNMENTS")}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition ${
                activeTab === "ASSIGNMENTS"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-200/60"
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Workload Submissions ({assignments.length})</span>
            </button>
          </div>

          <div className="relative min-w-[240px] flex-1 max-w-sm">
            <Search className="absolute inset-y-0 left-3 my-auto h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Quick search across directory..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 rounded-xl pl-9 pr-3 py-2 outline-none focus:border-indigo-500 transition"
            />
          </div>
        </div>

        {/* Notification / Message Banner */}
        {message ? (
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/80 p-4 text-xs font-semibold text-indigo-900 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4.5 w-4.5 text-indigo-600 shrink-0" />
              <span>{message}</span>
            </div>
            <button onClick={() => setMessage(null)} className="p-1 text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : null}

        {/* ── TAB 1: FACULTY & ACADEMIC SCOPE MANAGEMENT ── */}
        {activeTab === "FACULTY" && (
          <div className="space-y-6">
            {/* Multi-Criterion Filter Toolbar */}
            <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-700">
                  <Filter className="h-4 w-4 text-indigo-500" />
                  <span>Filter Faculty Records &amp; Scope</span>
                </div>
                <span className="text-xs font-bold text-slate-400">
                  Showing {filteredTeachers.length} of {teachers.length} teachers
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-5">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Course</label>
                  <select value={filterCourse} onChange={(e) => setFilterCourse(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs font-bold text-slate-700 outline-none">
                    <option value="ALL">All Courses</option>
                    {courseList.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Semester</label>
                  <select value={filterSemester} onChange={(e) => setFilterSemester(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs font-bold text-slate-700 outline-none">
                    <option value="ALL">All Semesters</option>
                    {semesterList.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Subject</label>
                  <select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs font-bold text-slate-700 outline-none">
                    <option value="ALL">All Subjects</option>
                    {uniqueSubjects.map((sub) => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Teacher</label>
                  <select value={filterTeacher} onChange={(e) => setFilterTeacher(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs font-bold text-slate-700 outline-none">
                    <option value="ALL">All Faculty</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.name}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Workload Status</label>
                  <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs font-bold text-slate-700 outline-none">
                    <option value="ALL">All Statuses</option>
                    <option value="Pending">Has Pending</option>
                    <option value="Checked">Has Checked</option>
                    <option value="Rejected">Has Rejected</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Create / Edit Teacher Account Form Card */}
            <div className="rounded-3xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/60 via-white to-slate-50/60 p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
                <h3 className="text-base font-extrabold text-indigo-950 flex items-center gap-2">
                  {editingTeacherId ? <Pencil className="h-5 w-5 text-indigo-600" /> : <Plus className="h-5 w-5 text-indigo-600" />}
                  <span>{editingTeacherId ? `Edit Teacher Scope Mappings (#${editingTeacherId})` : "Create New Faculty Account & Scope"}</span>
                </h3>
                {editingTeacherId ? (
                  <button type="button" onClick={clearTeacherForm} className="text-xs font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1">
                    <X className="w-3.5 h-3.5" /> Cancel Edit
                  </button>
                ) : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Full Name" value={teacherForm.name} onChange={(value) => setTeacherForm((current) => ({ ...current, name: value }))} icon={<UserCheck className="h-4 w-4" />} />
                <Field label="Username" value={teacherForm.username} onChange={(value) => setTeacherForm((current) => ({ ...current, username: value }))} icon={<UserCheck className="h-4 w-4" />} />
                <Field label="Email" type="email" value={teacherForm.email} onChange={(value) => setTeacherForm((current) => ({ ...current, email: value }))} icon={<Mail className="h-4 w-4" />} />
                <Field label="College" value={teacherForm.college} onChange={(value) => setTeacherForm((current) => ({ ...current, college: value }))} />

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Course</label>
                  <select value={teacherForm.course} onChange={(e) => setTeacherForm((current) => ({ ...current, course: e.target.value }))} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white py-3 px-4 text-sm font-medium text-slate-800 outline-none transition focus:border-indigo-500">
                    {courseList.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Semester</label>
                  <select value={teacherForm.semester} onChange={(e) => setTeacherForm((current) => ({ ...current, semester: e.target.value }))} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white py-3 px-4 text-sm font-medium text-slate-800 outline-none transition focus:border-indigo-500">
                    {semesterList.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Subject</label>
                  <input type="text" list="subject-suggestions" value={teacherForm.subject} onChange={(e) => setTeacherForm((current) => ({ ...current, subject: e.target.value }))} placeholder="e.g. C Programming, DBMS" className="mt-2 w-full rounded-2xl border border-slate-200 bg-white py-3 px-4 text-sm font-medium text-slate-800 outline-none transition focus:border-indigo-500" />
                  <datalist id="subject-suggestions">
                    {availableSubjectsForForm.map((sub) => (
                      <option key={sub} value={sub} />
                    ))}
                  </datalist>
                </div>

                <Field label={editingTeacherId ? "Password (reset via action)" : "Password"} type="password" value={teacherForm.password} onChange={(value) => setTeacherForm((current) => ({ ...current, password: value }))} disabled={Boolean(editingTeacherId)} icon={<KeyRound className="h-4 w-4" />} />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button type="button" onClick={saveTeacher} disabled={savingTeacher} className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-xs font-extrabold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 disabled:opacity-60 transition">
                  {savingTeacher ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  <span>{editingTeacherId ? "Update Teacher Mapping" : "Save Teacher & Assign Scope"}</span>
                </button>
              </div>
            </div>

            {/* Grouped Faculty Directory List */}
            {courseList.map((courseName) => {
              const courseTeachers = filteredTeachers.filter((t) => (t.course || "").toUpperCase() === courseName.toUpperCase());
              if (filterCourse !== "ALL" && filterCourse.toUpperCase() !== courseName.toUpperCase()) return null;

              return (
                <div key={courseName} className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h4 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-indigo-600 inline-block"></span>
                      <span>{courseName} Faculty</span>
                      <span className="text-xs font-bold text-slate-400">— {courseTeachers.length} Teachers</span>
                    </h4>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-slate-100">
                    <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
                      <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Teacher</th>
                          <th className="px-4 py-3">Semester</th>
                          <th className="px-4 py-3">Assigned Subject</th>
                          <th className="px-4 py-3">Workload Breakdown</th>
                          <th className="px-4 py-3">College</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {courseTeachers.length === 0 ? (
                          <tr>
                            <td className="px-4 py-6 text-center text-slate-400 text-xs font-semibold" colSpan={6}>
                              No teachers match the current filter criteria for {courseName}.
                            </td>
                          </tr>
                        ) : (
                          courseTeachers.map((teacher) => {
                            const isUnmapped = !teacher.course || !teacher.semester || !teacher.subject;
                            const teacherSubmissions = getSubmissionsForTeacher(teacher);
                            const totalSubmitted = teacherSubmissions.length;
                            const pendingCount = teacherSubmissions.filter((a) => a.status === "Pending" || !a.status).length;
                            const checkedCount = teacherSubmissions.filter((a) => a.status === "Checked").length;
                            const rejectedCount = teacherSubmissions.filter((a) => a.status === "Rejected").length;

                            return (
                              <tr key={teacher.id} className="hover:bg-slate-50/80 transition">
                                <td className="px-4 py-3 font-bold text-slate-800">
                                  <div className="flex items-center gap-2">
                                    <span>{teacher.name}</span>
                                    {isUnmapped && (
                                      <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-extrabold">
                                        Unmapped
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-slate-400 font-normal">@{teacher.username} • {teacher.email}</div>
                                </td>

                                <td className="px-4 py-3 font-semibold text-slate-700">
                                  {teacher.semester ? (
                                    <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs border border-indigo-100">
                                      {teacher.semester}
                                    </span>
                                  ) : (
                                    <span className="text-rose-500 font-bold text-xs">Unassigned</span>
                                  )}
                                </td>

                                <td className="px-4 py-3 font-semibold text-slate-700">
                                  {teacher.subject ? (
                                    <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-100">
                                      {teacher.subject}
                                    </span>
                                  ) : (
                                    <span className="text-rose-500 font-bold text-xs">Unassigned</span>
                                  )}
                                </td>

                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-1.5 text-xs font-bold">
                                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                                      Total: {totalSubmitted}
                                    </span>
                                    <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800">
                                      Pending: {pendingCount}
                                    </span>
                                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800">
                                      Checked: {checkedCount}
                                    </span>
                                  </div>
                                </td>

                                <td className="px-4 py-3 text-slate-600">{teacher.college ?? "-"}</td>

                                <td className="px-4 py-3 text-right">
                                  <div className="flex justify-end gap-1.5">
                                    {!isUnmapped && (
                                      <button
                                        type="button"
                                        onClick={() => setSelectedTeacherForDrilldown(teacher)}
                                        className="px-2.5 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 font-bold text-xs border border-indigo-200 hover:bg-indigo-100 transition flex items-center gap-1"
                                      >
                                        <Eye className="w-3.5 h-3.5" /> Submissions
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => beginTeacherEdit(teacher)}
                                      className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => resetTeacherPassword(teacher.id).catch(() => undefined)}
                                      className="px-2.5 py-1.5 rounded-xl bg-amber-50 text-amber-700 font-bold text-xs border border-amber-200 hover:bg-amber-100 transition"
                                    >
                                      Reset
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => deleteTeacher(teacher.id).catch(() => undefined)}
                                      className="px-2.5 py-1.5 rounded-xl bg-rose-50 text-rose-700 font-bold text-xs border border-rose-200 hover:bg-rose-100 transition"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── TAB 2: COLLEGES DIRECTORY ── */}
        {activeTab === "COLLEGES" && (
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                    <School className="h-5 w-5 text-indigo-500" />
                    <span>Colleges Directory</span>
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">Add, edit, or delete campuses registered in the portal.</p>
                </div>
                <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 font-bold text-xs border border-indigo-100">
                  {colleges.length} Registered Colleges
                </span>
              </div>

              <div className="grid gap-4 grid-cols-1 lg:grid-cols-[1fr_auto]">
                <Field label="College Name" value={collegeName} onChange={setCollegeName} icon={<School className="h-4 w-4" />} />
                <div className="flex flex-wrap items-end gap-3">
                  <button
                    type="button"
                    onClick={saveCollege}
                    disabled={savingCollege}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 disabled:opacity-60 transition"
                  >
                    {savingCollege ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    <span>{editingCollegeId ? "Update College" : "Create College"}</span>
                  </button>
                  {editingCollegeId ? (
                    <button
                      type="button"
                      onClick={clearCollegeForm}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50"
                    >
                      <X className="h-4 w-4" />
                      <span>Cancel Edit</span>
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-100">
                <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3">College Name</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {colleges.length === 0 ? (
                      <tr>
                        <td className="px-4 py-8 text-center text-slate-400 font-semibold" colSpan={2}>
                          No colleges registered.
                        </td>
                      </tr>
                    ) : (
                      colleges.map((college) => (
                        <tr key={college.id} className="hover:bg-slate-50/50 transition">
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-800">{college.name}</div>
                            <div className="text-xs text-slate-400">Campus ID #{college.id}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => beginCollegeEdit(college)}
                                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold text-xs hover:bg-slate-50 transition"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteCollege(college.id).catch(() => undefined)}
                                className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 font-bold text-xs border border-rose-200 hover:bg-rose-100 transition"
                              >
                                Delete
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
          </div>
        )}

        {/* ── TAB 3: STUDENT DIRECTORY ── */}
        {activeTab === "STUDENTS" && (
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                    <Users className="h-5 w-5 text-indigo-500" />
                    <span>Student Directory &amp; Verification</span>
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">Complete student roster with email &amp; phone verification badges.</p>
                </div>
                <button
                  type="button"
                  onClick={() => exportStudents().catch((error) => setMessage(error instanceof Error ? error.message : "CSV export failed"))}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow transition"
                >
                  <FileDown className="h-4 w-4" /> Export Student CSV
                </button>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-100">
                <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Student Name</th>
                      <th className="px-4 py-3">Seat Number</th>
                      <th className="px-4 py-3">College</th>
                      <th className="px-4 py-3">Course / Year</th>
                      <th className="px-4 py-3">Contact Email</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td className="px-4 py-8 text-center text-slate-400 font-semibold" colSpan={6}>
                          No students found matching current search query.
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map((student) => (
                        <tr key={student.username} className="hover:bg-slate-50/50 transition">
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-800">{student.full_name}</div>
                            <div className="text-xs text-slate-400">@{student.username}</div>
                          </td>
                          <td className="px-4 py-3 text-slate-700 font-mono font-bold">{student.seat_no}</td>
                          <td className="px-4 py-3 text-slate-600">{student.college ?? "-"}</td>
                          <td className="px-4 py-3 text-slate-600">{student.course_year ?? "-"}</td>
                          <td className="px-4 py-3 text-slate-600 font-mono text-xs">{student.email}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
                              {student.is_email_verified ? "Email ✓" : "Email pending"} • {student.is_phone_verified ? "Phone ✓" : "Phone pending"}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 4: GLOBAL ASSIGNMENTS & WORKLOAD ── */}
        {activeTab === "ASSIGNMENTS" && (
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                    <Layers className="h-5 w-5 text-indigo-500" />
                    <span>Global Submissions Overview</span>
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">System-wide log of student practicals and assignment submissions.</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-5 text-center">
                  <div className="text-3xl font-black text-indigo-600">{overview?.assignments ?? 0}</div>
                  <div className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-500">Total Submissions</div>
                </div>
                <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-5 text-center">
                  <div className="text-3xl font-black text-amber-600">{overview?.pending ?? 0}</div>
                  <div className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-500">Pending Review</div>
                </div>
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5 text-center">
                  <div className="text-3xl font-black text-emerald-600">{overview?.checked ?? 0}</div>
                  <div className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-500">Checked &amp; Graded</div>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-100">
                <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Student</th>
                      <th className="px-4 py-3">Assignment Title</th>
                      <th className="px-4 py-3">Subject</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Marks</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-medium">
                    {assignments.length === 0 ? (
                      <tr>
                        <td className="px-4 py-8 text-center text-slate-400 text-xs font-semibold" colSpan={6}>
                          No assignment submissions logged.
                        </td>
                      </tr>
                    ) : (
                      assignments.map((sub) => (
                        <tr key={sub.id} className="hover:bg-slate-50/60 transition">
                          <td className="px-4 py-3 font-bold text-slate-800">
                            <div>{sub.student_name || "Student"}</div>
                            <div className="text-[10px] text-slate-400 font-mono">Seat: {sub.seat_no || "N/A"}</div>
                          </td>

                          <td className="px-4 py-3 text-slate-700">
                            <div className="font-bold text-indigo-950">{sub.title || "Untitled"}</div>
                          </td>

                          <td className="px-4 py-3 text-slate-600">{sub.subject || "N/A"}</td>

                          <td className="px-4 py-3 font-bold">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] ${
                                sub.status === "Checked"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : sub.status === "Rejected"
                                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                                  : "bg-amber-50 text-amber-700 border border-amber-200"
                              }`}
                            >
                              {sub.status || "Pending"}
                            </span>
                          </td>

                          <td className="px-4 py-3 font-bold text-slate-800">
                            {sub.marks ?? 0} / 100
                          </td>

                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setSelectedAssignmentDetail(sub)}
                                className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold text-xs hover:border-indigo-200 hover:text-indigo-600 transition"
                              >
                                Details
                              </button>
                              <button
                                type="button"
                                onClick={() => downloadApiFile(`/api/files/${sub.id}`, sub.file_original_name || sub.file_name || "assignment.pdf")}
                                className="px-2.5 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 font-bold text-xs border border-indigo-200 hover:bg-indigo-100 transition"
                              >
                                File
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
          </div>
        )}

      </div>

      {/* ── MODAL: Teacher Submissions Drill-Down Modal ── */}
      {selectedTeacherForDrilldown ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-5xl rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-extrabold text-slate-800 tracking-tight">
                    {selectedTeacherForDrilldown.name}&apos;s Submitted Assignments
                  </h3>
                  <span className="rounded-full bg-indigo-50 text-indigo-700 px-3 py-0.5 text-xs font-bold border border-indigo-100">
                    {selectedTeacherForDrilldown.course} • {selectedTeacherForDrilldown.semester} • {selectedTeacherForDrilldown.subject}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500 font-medium">
                  @{selectedTeacherForDrilldown.username} • {selectedTeacherForDrilldown.email} • {selectedTeacherForDrilldown.college ?? "All Colleges"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {selectedTeacherForDrilldown.subject && (
                  <button
                    type="button"
                    onClick={() => handlePlagiarismScan(selectedTeacherForDrilldown.subject!)}
                    className="rounded-full bg-amber-50 border border-amber-200 hover:bg-amber-100 px-3.5 py-1 text-xs font-bold text-amber-700 flex items-center gap-1.5 transition shadow-sm"
                  >
                    <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
                    <span>Scan Subject Plagiarism</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setSelectedTeacherForDrilldown(null);
                    setModalSearch("");
                    setModalStatusFilter("ALL");
                  }}
                  className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Submissions Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-100">
              <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Student Name</th>
                    <th className="px-4 py-3">Assignment Title</th>
                    <th className="px-4 py-3">Submission Date</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Marks</th>
                    <th className="px-4 py-3">Remarks / Feedback</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-medium">
                  {drilldownSubmissions.length === 0 ? (
                    <tr>
                      <td className="px-4 py-8 text-center text-slate-400 text-xs font-semibold" colSpan={7}>
                        No submitted assignments found for this teacher matching the current search criteria.
                      </td>
                    </tr>
                  ) : (
                    drilldownSubmissions.map((sub) => (
                      <tr key={sub.id} className="hover:bg-slate-50/60 transition">
                        <td className="px-4 py-3 font-bold text-slate-800 whitespace-nowrap">
                          <div>{sub.student_name || "Anonymous Student"}</div>
                          <div className="text-[10px] text-slate-400 font-mono">Seat: {sub.seat_no || "N/A"}</div>
                        </td>

                        <td className="px-4 py-3 text-slate-700">
                          <div className="font-bold text-indigo-950 max-w-[220px] truncate">{sub.title || "Untitled Assignment"}</div>
                          <div className="text-[10px] text-slate-400">{sub.subject || "N/A"}</div>
                        </td>

                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                          <div>{sub.submit_date ? String(sub.submit_date).slice(0, 10) : "N/A"}</div>
                          <div className="text-[10px] text-slate-400">{sub.submit_time || ""}</div>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap font-bold">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] ${
                              sub.status === "Checked"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : sub.status === "Rejected"
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}
                          >
                            {sub.status || "Pending"}
                          </span>
                        </td>

                        <td className="px-4 py-3 font-bold text-slate-800 whitespace-nowrap">
                          {sub.marks ?? 0} / 100
                        </td>

                        <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate">
                          {sub.teacher_note || <span className="text-slate-300 italic">No remarks</span>}
                        </td>

                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedAssignmentDetail(sub)}
                              className="px-2 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 font-bold text-[11px] hover:border-indigo-200 hover:text-indigo-600"
                            >
                              Details
                            </button>
                            <button
                              type="button"
                              onClick={() => downloadApiFile(`/api/files/${sub.id}`, sub.file_original_name || sub.file_name || "assignment.pdf")}
                              className="px-2 py-1 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 font-bold text-[11px] hover:bg-indigo-100"
                            >
                              File
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
        </div>
      ) : null}

      {/* ── MODAL: Assignment Detail Modal ── */}
      {selectedAssignmentDetail ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-extrabold text-slate-800">
                  Submission Detail #{selectedAssignmentDetail.id}
                </h3>
                <p className="text-xs text-slate-400">
                  Student: {selectedAssignmentDetail.student_name} (Seat No: {selectedAssignmentDetail.seat_no})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAssignmentDetail(null)}
                className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="font-bold text-slate-400">Assignment Title:</span>
                <span className="font-extrabold text-slate-900">{selectedAssignmentDetail.title}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="font-bold text-slate-400">Subject:</span>
                <span className="font-extrabold text-slate-800">{selectedAssignmentDetail.subject}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="font-bold text-slate-400">Marks Awarded:</span>
                <span className="font-extrabold text-emerald-600">{selectedAssignmentDetail.marks ?? 0} / 100</span>
              </div>
              <div>
                <span className="font-bold text-slate-400 block mb-1">Details / Content:</span>
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-slate-700 whitespace-pre-wrap font-mono">
                  {selectedAssignmentDetail.details || "No details text provided."}
                </div>
              </div>
            </div>

            {/* AI Auto-Grader Assistant Recommendation */}
            <div className="pt-2">
              <div className="flex items-center justify-between bg-indigo-50/60 border border-indigo-100 p-3 rounded-xl mb-3">
                <div className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>100% Free AI Auto-Grader Analysis</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleFetchAutoGrade(selectedAssignmentDetail.id)}
                  disabled={autoGradeLoadingId === selectedAssignmentDetail.id}
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow transition disabled:opacity-60 flex items-center gap-1"
                >
                  {autoGradeLoadingId === selectedAssignmentDetail.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Wand2 className="w-3.5 h-3.5" />
                  )}
                  <span>Analyze Submission</span>
                </button>
              </div>

              <AutoGradePanel
                assignmentId={String(selectedAssignmentDetail.id)}
                autoGradeData={autoGradeRecs[selectedAssignmentDetail.id]}
                loading={autoGradeLoadingId === selectedAssignmentDetail.id}
                onApply={() => {}}
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => downloadApiFile(`/api/files/${selectedAssignmentDetail.id}`, selectedAssignmentDetail.file_original_name || selectedAssignmentDetail.file_name || "assignment.pdf")}
                className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-2.5 text-xs font-extrabold text-white hover:bg-indigo-700 transition"
              >
                <FileDown className="h-4 w-4" />
                <span>Download Attachment</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* 100% Free Plagiarism Modal */}
      <PlagiarismModal
        isOpen={plagiarismModalOpen}
        onClose={() => setPlagiarismModalOpen(false)}
        subjectName={plagiarismSubject}
        reportData={plagiarismData}
        loading={plagiarismLoading}
      />

    </AppShell>
  );
}

function StatCard({
  label,
  value,
  subtitle,
  icon,
  gradient
}: Readonly<{
  label: string;
  value: string;
  subtitle: string;
  icon: ReactNode;
  gradient: string;
}>) {
  return (
    <div className={`rounded-3xl border bg-gradient-to-br ${gradient} p-5 shadow-sm space-y-3`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
        <div className="p-2.5 rounded-2xl bg-white shadow-xs border border-slate-100">{icon}</div>
      </div>
      <div>
        <div className="text-3xl font-black text-slate-900 tracking-tight">{value}</div>
        <div className="text-xs font-semibold text-slate-500 mt-1">{subtitle}</div>
      </div>
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
        {icon ? <div className="absolute inset-y-0 left-4 my-auto h-4 w-4 text-slate-400">{icon}</div> : null}
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className={`w-full rounded-2xl border border-slate-200 bg-white py-3 ${
            icon ? "pl-11" : "px-4"
          } pr-4 text-sm font-medium text-slate-800 outline-none transition focus:border-indigo-500 disabled:opacity-60`}
        />
      </div>
    </div>
  );
}
