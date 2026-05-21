"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState, useRef } from "react";
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
  GraduationCap,
  X,
  Plus
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
  const [isError, setIsError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const subjectOptions = useMemo(() => courseSubjects[course] ?? [], [course]);

  useEffect(() => {
    if (subject && !subjectOptions.includes(subject)) {
      setSubject("");
    }
  }, [subject, subjectOptions]);

  function validateUpload(file: File | null): string | null {
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

  // Handle Drag Over Events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Handle Dropped Files
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      const validationError = validateUpload(droppedFile);
      if (validationError) {
        setIsError(true);
        setMessage(validationError);
        setUpload(null);
      } else {
        setIsError(false);
        setMessage(null);
        setUpload(droppedFile);
      }
    }
  };

  // Handle Input Changes
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const validationError = validateUpload(selectedFile);
      if (validationError) {
        setIsError(true);
        setMessage(validationError);
        setUpload(null);
      } else {
        setIsError(false);
        setMessage(null);
        setUpload(selectedFile);
      }
    }
  };

  async function submitAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setSubmitting(true);
    setMessage(null);
    setIsError(false);

    const uploadError = validateUpload(upload);
    if (uploadError) {
      setMessage(uploadError);
      setIsError(true);
      setSubmitting(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append("subject", subject);
      formData.append("title", title.trim());
      formData.append("details", details.trim());
      if (upload) {
        formData.append("upload", upload);
      }

      const payload = await apiFetch<AssignmentResponse>("/api/assignments/", {
        method: "POST",
        body: formData
      });

      setIsError(false);
      setMessage(`Assignment #${payload.assignment.id} submitted successfully with status: ${payload.assignment.status}.`);
      setTitle("");
      setDetails("");
      setUpload(null);
      setSubject("");
      if (formElement) formElement.reset();
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "Assignment submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell
      title="Submit Assignment"
      subtitle="Complete your academic workflow with structured file validations, drag-and-drop uploads, and instant supervisor routing."
      nav={studentNav}
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
              <Layers className="h-5 w-5 text-indigo-500" />
              <span>Create New Submission</span>
            </h3>
            <p className="mt-1 text-sm text-slate-500">Provide assignment assets, configure parameters, and dispatch to graders.</p>
          </div>
          <div className="rounded-full bg-indigo-50 border border-indigo-100/50 px-3.5 py-1 text-xs font-bold text-indigo-600 flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Files up to 25 MB supported</span>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          {/* Submission Form Card */}
          <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <form className="space-y-5" onSubmit={submitAssignment}>
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Course Selection */}
                <div>
                  <label htmlFor="course-select" className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Course Scope
                  </label>
                  <div className="relative mt-2">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400">
                      <GraduationCap className="h-4.5 w-4.5" />
                    </div>
                    <select
                      id="course-select"
                      value={course}
                      onChange={(e) => setCourse(e.target.value as "BCA" | "BBA" | "B.Com")}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-3 pl-11 pr-10 text-sm font-semibold text-slate-700 outline-none transition focus:bg-white focus:ring-2 focus:ring-indigo-100 appearance-none"
                    >
                      {courses.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400 text-xs font-semibold">
                      ▼
                    </div>
                  </div>
                </div>

                {/* Subject Selection */}
                <div>
                  <label htmlFor="subject-select" className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Select Subject
                  </label>
                  <div className="relative mt-2">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400">
                      <BookOpen className="h-4.5 w-4.5" />
                    </div>
                    <select
                      id="subject-select"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      required
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-3 pl-11 pr-10 text-sm font-semibold text-slate-700 outline-none transition focus:bg-white focus:ring-2 focus:ring-indigo-100 appearance-none"
                    >
                      <option value="">Select subject...</option>
                      {subjectOptions.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400 text-xs font-semibold">
                      ▼
                    </div>
                  </div>
                </div>

                {/* Assignment Title */}
                <div className="sm:col-span-2">
                  <label htmlFor="assignment-title" className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Assignment Title
                  </label>
                  <div className="relative mt-2">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400">
                      <FileText className="h-4.5 w-4.5" />
                    </div>
                    <input
                      id="assignment-title"
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Practical 1: Web UI Wireframe Layouts"
                      required
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-3.5 pl-11 pr-4 text-sm font-medium text-slate-800 transition outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                </div>

                {/* PREMIUM Drag and Drop Area */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Upload Document / Assets
                  </label>
                  <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`group relative flex flex-col items-center justify-center rounded-3xl border-2 border-dashed p-6 transition-all cursor-pointer ${
                      dragActive 
                        ? "border-indigo-500 bg-indigo-50/30" 
                        : "border-slate-200 bg-slate-50/20 hover:border-indigo-400 hover:bg-slate-50/40"
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      id="assignment-file"
                      accept={ALLOWED_UPLOAD_EXTENSIONS.join(",")}
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    
                    {!upload ? (
                      <div className="text-center space-y-2.5">
                        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500 transition-transform group-hover:scale-105 duration-200">
                          <FileUp className="h-5 w-5" />
                        </div>
                        <div className="text-sm">
                          <span className="font-bold text-indigo-600 hover:text-indigo-700">Click to upload</span>
                          <span className="text-slate-500"> or drag and drop your file</span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium">
                          Zip, PDF, JPG, PNG or DOCX up to 25 MB
                        </p>
                      </div>
                    ) : (
                      <div className="w-full flex items-center justify-between gap-4 bg-slate-900 text-white rounded-2xl p-4 shadow-sm">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-bold truncate pr-2">{upload.name}</div>
                            <div className="text-[11px] text-slate-400">
                              {(upload.size / 1024 / 1024).toFixed(2)} MB
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setUpload(null);
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-white/15 text-slate-300 hover:text-white transition"
                          aria-label="Remove uploaded file"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Submission Notes */}
              <div>
                <label htmlFor="submission-details" className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Submission Details / Notes
                </label>
                <textarea
                  id="submission-details"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={4}
                  placeholder="Describe your solution criteria, indicate any dependencies, or flag technical conditions..."
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-medium text-slate-800 outline-none transition focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-indigo-600 py-3.5 text-sm font-bold text-white shadow-md shadow-indigo-500/10 transition-all duration-200 hover:from-indigo-600 hover:to-indigo-700 hover:shadow-lg disabled:opacity-60 disabled:pointer-events-none active:scale-[0.98]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4.5 w-4.5 animate-spin" />
                    <span>Uploading submission payload...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4.5 w-4.5" />
                    <span>Submit Practical to Grader</span>
                  </>
                )}
              </button>
            </form>

            {/* Error & Info Feedback alerts */}
            {message && (
              <div
                role="alert"
                className={`mt-5 flex items-start gap-2.5 rounded-2xl border p-4 text-xs font-semibold leading-relaxed ${
                  isError
                    ? "border-rose-100 bg-rose-50 text-rose-700"
                    : "border-emerald-100 bg-emerald-50 text-emerald-700"
                }`}
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{message}</span>
              </div>
            )}
          </section>

          {/* Right Info Panels */}
          <aside className="space-y-4">
            {/* Guidelines Box */}
            <div className="rounded-3xl border border-slate-100 bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-950 p-6 text-white shadow-md relative overflow-hidden">
              <div className="absolute top-0 right-0 h-40 w-40 bg-indigo-500/10 rounded-full blur-3xl" />
              <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                <HelpCircle className="h-4.5 w-4.5 text-indigo-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Submission Code of Ethics</span>
              </div>
              <ul className="mt-4 space-y-3.5 text-xs text-slate-300 leading-relaxed font-medium">
                <li className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                  <span>Always check your files for complex characters to maintain file compatibility.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                  <span>Mismatching the course syllabus metadata can disqualify evaluations.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                  <span>Avoid refreshing the window while uploads are busy processing.</span>
                </li>
              </ul>
            </div>

            {/* Interactive Preview Panel */}
            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <FileSpreadsheet className="h-4.5 w-4.5 text-indigo-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Live Workspace Status</span>
              </div>
              <dl className="mt-4 space-y-3.5 text-xs font-semibold text-slate-600">
                <div className="flex items-center justify-between">
                  <dt className="text-slate-400 font-medium">Active Scope:</dt>
                  <dd className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-indigo-600 font-bold">{course}</dd>
                </div>
                <div className="flex items-center justify-between border-t border-slate-50 pt-2.5">
                  <dt className="text-slate-400 font-medium">Subject Channel:</dt>
                  <dd className="text-slate-700 truncate max-w-[160px]">{subject || "Select a subject value"}</dd>
                </div>
                <div className="flex items-center justify-between border-t border-slate-50 pt-2.5">
                  <dt className="text-slate-400 font-medium">Pending File:</dt>
                  <dd className="text-slate-700 truncate max-w-[160px]">{upload?.name || "No assets selected"}</dd>
                </div>
              </dl>
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}