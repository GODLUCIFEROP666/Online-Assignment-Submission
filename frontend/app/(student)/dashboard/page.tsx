"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/shell";
import { apiFetch } from "@/lib/api";
import { courseSubjects, studentNav } from "@/lib/constants";
import {
  BookOpen,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  FileUp,
  GraduationCap,
  HelpCircle,
  Layers,
  Loader2,
  Sparkles,
  AlertCircle
} from "lucide-react";

const MAX_UPLOAD_SIZE_BYTES = 25 * 1024 * 1024;
const ALLOWED_UPLOAD_EXTENSIONS = [".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png", ".zip"];
const ALL_SUBJECTS = Array.from(new Set(Object.values(courseSubjects).flat()));

type AssignmentResponse = {
  status: string;
  message: string;
  assignment: {
    id: number;
    subject: string | null;
    title: string | null;
    status: string | null;
  };
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

export default function StudentDashboardPage() {
  const [course, setCourse] = useState("");
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [upload, setUpload] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  const subjectOptions = useMemo(() => {
    return course && courseSubjects[course] ? [...courseSubjects[course]] : [...ALL_SUBJECTS];
  }, [course]);

  useEffect(() => {
    if (subject && !subjectOptions.includes(subject)) {
      setSubject("");
    }
  }, [subject, subjectOptions]);

  useEffect(() => {
    apiFetch<MeResponse>("/api/me")
      .then((payload) => setCourse(extractBaseCourse(payload.data.course_year)))
      .catch(() => setCourse(""))
      .finally(() => setProfileLoading(false));
  }, []);

  function validateUpload(file: File | null) {
    if (!file) return null;
    const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!ALLOWED_UPLOAD_EXTENSIONS.includes(extension)) {
      return `Unsupported file type. Allowed: ${ALLOWED_UPLOAD_EXTENSIONS.join(", ")}`;
    }
    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      return "File must be 25 MB or smaller.";
    }
    return null;
  }

  async function submitAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setSubmitting(true);
    setMessage(null);

    const uploadError = validateUpload(upload);
    if (uploadError) {
      setMessage(uploadError);
      setSubmitting(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append("subject", subject);
      formData.append("title", title);
      formData.append("details", details);
      if (upload) {
        formData.append("upload", upload);
      }

      const payload = await apiFetch<AssignmentResponse>("/api/assignments/", {
        method: "POST",
        body: formData
      });

      setMessage(`Assignment #${payload.assignment.id} submitted successfully with status: ${payload.assignment.status}.`);
      setTitle("");
      setDetails("");
      setUpload(null);
      setSubject("");
      formElement.reset();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Assignment submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell
      title="Submit Assignment"
      subtitle="Upload your practicals and assignments here."
      nav={studentNav}
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
              <Layers className="h-5 w-5 text-indigo-500" />
              <span>New Submission</span>
            </h3>
            <p className="mt-1 text-sm text-slate-500">Upload your practicals and assignments here.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-indigo-50 border border-indigo-100/50 px-3.5 py-1 text-xs font-bold text-indigo-600 flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              <span>Files up to 25 MB</span>
            </div>
            <div className="rounded-full bg-slate-50 border border-slate-200 px-3.5 py-1 text-xs font-bold text-slate-600 flex items-center gap-1">
              <GraduationCap className="h-3.5 w-3.5 text-slate-400" />
              <span>{profileLoading ? "Loading course..." : course || "All Courses"}</span>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <form className="space-y-5" onSubmit={submitAssignment}>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Select Subject
                  </label>
                  <div className="relative mt-2">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400">
                      <BookOpen className="h-4.5 w-4.5" />
                    </div>
                    <select
                      value={subject}
                      onChange={(event) => setSubject(event.target.value)}
                      required
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-3 pl-11 pr-4 text-sm font-semibold text-slate-700 outline-none transition focus:bg-white appearance-none"
                    >
                      <option value="">Select subject...</option>
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

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Assignment Title
                  </label>
                  <div className="relative mt-2">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400">
                      <FileText className="h-4.5 w-4.5" />
                    </div>
                    <input
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      placeholder="e.g. Practical 1: Loops"
                      required
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-3 pl-11 pr-4 text-sm font-medium text-slate-800 transition focus:bg-white placeholder:text-slate-300"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Attach File
                  </label>
                  <div className="relative mt-2">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400">
                      <FileUp className="h-4.5 w-4.5" />
                    </div>
                    <input
                      type="file"
                      accept={ALLOWED_UPLOAD_EXTENSIONS.join(",")}
                      onChange={(event) => setUpload(event.target.files?.[0] ?? null)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-3.5 pl-11 pr-4 text-sm font-medium text-slate-500 transition focus:bg-white file:hidden"
                    />
                    <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400 text-xs font-bold">
                      {upload ? `${(upload.size / 1024 / 1024).toFixed(2)} MB` : "Click to upload"}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Description / Remarks
                </label>
                <textarea
                  value={details}
                  onChange={(event) => setDetails(event.target.value)}
                  rows={4}
                  placeholder="Any specific notes for the teacher..."
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-medium text-slate-800 transition focus:bg-white placeholder:text-slate-300"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-indigo-600 py-3.5 text-sm font-bold text-white shadow-md shadow-indigo-500/10 transition-all duration-200 hover:from-indigo-600 hover:to-indigo-700 hover:shadow-lg hover:shadow-indigo-600/20 active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4.5 w-4.5 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4.5 w-4.5" />
                    <span>Submit Assignment</span>
                  </>
                )}
              </button>
            </form>

            {message ? (
              <div
                className={`mt-5 flex items-start gap-2.5 rounded-2xl border p-4 text-xs font-semibold leading-relaxed ${
                  message.toLowerCase().includes("successfully")
                    ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                    : "border-rose-100 bg-rose-50 text-rose-700"
                }`}
              >
                <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                <span>{message}</span>
              </div>
            ) : null}
          </section>

          <aside className="space-y-4">
            <div className="rounded-3xl border border-slate-100 bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-950 p-6 text-white shadow-md shadow-slate-200/50 relative overflow-hidden">
              <div className="absolute top-0 right-0 h-40 w-40 bg-indigo-500/15 rounded-full blur-3xl -z-10" />
              <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                <HelpCircle className="h-4.5 w-4.5 text-indigo-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Rules & Policies</span>
              </div>
              <ul className="mt-4 space-y-3.5 text-xs text-slate-300 leading-relaxed font-medium">
                <li className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0"></span>
                  <span>Use a clear title for each submission so teachers can identify it quickly.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0"></span>
                  <span>Choose a subject from your course syllabus before uploading the file.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0"></span>
                  <span>Files larger than 25 MB are blocked by the portal.</span>
                </li>
              </ul>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <FileSpreadsheet className="h-4.5 w-4.5 text-indigo-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Current Selection</span>
              </div>
              <dl className="mt-4 space-y-3 text-xs font-semibold text-slate-600">
                <div className="flex items-center justify-between">
                  <dt className="text-slate-400 font-medium">Active Course:</dt>
                  <dd className="rounded-full bg-indigo-50 px-2 py-0.5 text-indigo-600">{course || "All Courses"}</dd>
                </div>
                <div className="flex items-center justify-between border-t border-slate-50 pt-2.5">
                  <dt className="text-slate-400 font-medium">Active Subject:</dt>
                  <dd className="text-slate-700 truncate max-w-[160px]">{subject || "Select subject"}</dd>
                </div>
                <div className="flex items-center justify-between border-t border-slate-50 pt-2.5">
                  <dt className="text-slate-400 font-medium">Pending Attachment:</dt>
                  <dd className="text-slate-700 truncate max-w-[160px]">{upload?.name || "No file chosen"}</dd>
                </div>
              </dl>
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
