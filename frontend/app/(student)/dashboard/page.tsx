"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/shell";
import { apiFetch } from "@/lib/api";
import { courseSubjects, courses, studentNav } from "@/lib/constants";
import { 
  BookOpen, 
  Sparkles, 
  FileUp, 
  FileText, 
  CheckCircle2, 
  HelpCircle, 
  Loader2, 
  AlertCircle,
  FileSpreadsheet,
  Layers,
  GraduationCap
} from "lucide-react";

const MAX_UPLOAD_SIZE_BYTES = 25 * 1024 * 1024;
const ALLOWED_UPLOAD_EXTENSIONS = [".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png", ".zip"];

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

export default function StudentDashboardPage() {
  const [course, setCourse] = useState<"BCA" | "BBA" | "B.Com">("BCA");
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [upload, setUpload] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const subjectOptions = useMemo(() => courseSubjects[course] ?? [], [course]);

  useEffect(() => {
    if (subject && !subjectOptions.includes(subject)) {
      setSubject("");
    }
  }, [subject, subjectOptions]);

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

      const payload = await apiFetch<AssignmentResponse>("/api/assignments", {
        method: "POST",
        body: formData
      });
      setMessage(`Assignment #${payload.assignment.id} submitted successfully with status: ${payload.assignment.status}.`);
      setTitle("");
      setDetails("");
      setUpload(null);
      setSubject("");
      if (formElement) {
        formElement.reset();
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Assignment submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell
      title="Submit Assignment"
      subtitle="Complete your course workflow with live upload validations, real-time feedback, and teacher grading routing."
      nav={studentNav}
    >
      <div className="space-y-6">
        {/* Dynamic Entry Panel Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
              <Layers className="h-5 w-5 text-indigo-500" />
              <span>Create New Submission</span>
            </h3>
            <p className="mt-1 text-sm text-slate-500">Provide assignment details, upload documents, and route to your designated subject.</p>
          </div>
          <div className="rounded-full bg-indigo-50 border border-indigo-100/50 px-3.5 py-1 text-xs font-bold text-indigo-600 flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            <span>Files up to 25 MB supported</span>
          </div>
        </div>

        {/* Content Section Columns */}
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          
          {/* Submission Form Card */}
          <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <form className="space-y-5" onSubmit={submitAssignment}>
              <div className="grid gap-4 md:grid-cols-2">
                
                {/* Course Selection */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Course Scope
                  </label>
                  <div className="relative mt-2">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400">
                      <GraduationCap className="h-4.5 w-4.5" />
                    </div>
                    <select
                      value={course}
                      onChange={(event) => setCourse(event.target.value as "BCA" | "BBA" | "B.Com")}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-3 pl-11 pr-4 text-sm font-semibold text-slate-700 outline-none transition focus:bg-white appearance-none"
                    >
                      {courses.map((item) => (
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

                {/* Subject Selection */}
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

                {/* Assignment Title */}
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
                      placeholder="e.g. Practical 1: Responsive Grid Designs"
                      required
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-3 pl-11 pr-4 text-sm font-medium text-slate-800 transition focus:bg-white placeholder:text-slate-300"
                    />
                  </div>
                </div>

                {/* Document File Uploader */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Upload Document / Code Archive
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
                      {upload ? `${(upload.size / 1024 / 1024).toFixed(2)} MB` : "Choose File"}
                    </div>
                  </div>
                </div>

              </div>

              {/* Assignment Details Area */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Submission Details / Notes
                </label>
                <textarea
                  value={details}
                  onChange={(event) => setDetails(event.target.value)}
                  rows={4}
                  placeholder="Describe your submission, list any libraries used, or document bugs faced..."
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-medium text-slate-800 transition focus:bg-white placeholder:text-slate-300"
                />
              </div>

              {/* Action Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-indigo-600 py-3.5 text-sm font-bold text-white shadow-md shadow-indigo-500/10 transition-all duration-200 hover:from-indigo-600 hover:to-indigo-700 hover:shadow-lg hover:shadow-indigo-600/20 active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4.5 w-4.5 animate-spin" />
                    <span>Uploading Practical Assets...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4.5 w-4.5" />
                    <span>Submit Practical to Teacher</span>
                  </>
                )}
              </button>
            </form>

            {/* Submitting Response Banners */}
            {message ? (
              <div className={`mt-5 flex items-start gap-2.5 rounded-2xl border p-4 text-xs font-semibold leading-relaxed ${
                message.toLowerCase().includes("successfully") 
                  ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                  : "border-rose-100 bg-rose-50 text-rose-700"
              }`}>
                <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                <span>{message}</span>
              </div>
            ) : null}
          </section>

          {/* Right Aside Column Info Panel */}
          <aside className="space-y-4">
            
            {/* Rules Dashboard Box */}
            <div className="rounded-3xl border border-slate-100 bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-950 p-6 text-white shadow-md shadow-slate-200/50 relative overflow-hidden">
              <div className="absolute top-0 right-0 h-40 w-40 bg-indigo-500/15 rounded-full blur-3xl -z-10" />
              <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                <HelpCircle className="h-4.5 w-4.5 text-indigo-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Rules & Standard Policies</span>
              </div>
              <ul className="mt-4 space-y-3.5 text-xs text-slate-300 leading-relaxed font-medium">
                <li className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0"></span>
                  <span>Avoid complex symbols in uploads to ensure teachers can retrieve your work smoothly.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0"></span>
                  <span>Ensure your selected subject matches the course syllabus to ensure grades compile accurately.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0"></span>
                  <span>Upload size limits are enforced on the browser; files exceeding 25 MB will fail to select.</span>
                </li>
              </ul>
            </div>

            {/* Current Selection Dashboard Box */}
            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <FileSpreadsheet className="h-4.5 w-4.5 text-indigo-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Live Stage Preview</span>
              </div>
              <dl className="mt-4 space-y-3 text-xs font-semibold text-slate-600">
                <div className="flex items-center justify-between">
                  <dt className="text-slate-400 font-medium">Active Course:</dt>
                  <dd className="rounded-full bg-indigo-50 px-2 py-0.5 text-indigo-600">{course}</dd>
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
