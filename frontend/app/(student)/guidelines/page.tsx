"use client";

import { AppShell } from "@/components/shell";
import { studentNav } from "@/lib/constants";
import { 
  FileText, 
  Sparkles, 
  ShieldAlert, 
  FileArchive, 
  HelpCircle, 
  AlertCircle 
} from "lucide-react";

type RuleItem = {
  id: number;
  title: string;
  desc: string;
  icon: React.ReactNode;
  colorClass: string;
};

const guidelinesList: RuleItem[] = [
  {
    id: 1,
    title: "Permitted Archive Extensions",
    desc: "Practicals are strictly verified on select extensions. Accepts: PDF, DOC, DOCX, JPG, PNG, and ZIP files.",
    icon: <FileArchive className="h-5 w-5" />,
    colorClass: "border-l-indigo-500 text-indigo-600 bg-indigo-50/10"
  },
  {
    id: 2,
    title: "Payload Boundary Enforcements",
    desc: "Files undergo instant client-side size audits. Please keep upload sizes within 25 MB to pass safety routing checks.",
    icon: <ShieldAlert className="h-5 w-5" />,
    colorClass: "border-l-amber-500 text-amber-600 bg-amber-50/10"
  },
  {
    id: 3,
    title: "Duplicate & Expiration Safety",
    desc: "Late submissions and duplicate entries remain strictly governed by backend university policies.",
    icon: <AlertCircle className="h-5 w-5" />,
    colorClass: "border-l-rose-500 text-rose-600 bg-rose-50/10"
  },
  {
    id: 4,
    title: "Grades Storage Architecture",
    desc: "Your graded marks and qualitative reviews compile directly inside the relational secure MySQL cluster.",
    icon: <Sparkles className="h-5 w-5" />,
    colorClass: "border-l-emerald-500 text-emerald-600 bg-emerald-50/10"
  }
];

export default function GuidelinesPage() {
  return (
    <AppShell 
      title="Student Guidelines" 
      subtitle="Read about permitted practical archives, payload limits, grading rules, and structural academic policies." 
      nav={studentNav}
    >
      <div className="space-y-6">
        
        {/* Dynamic Header Badge Section */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-500" />
              <span>Syllabus Submission Rules</span>
            </h3>
            <p className="mt-1 text-sm text-slate-500">Ensure your uploaded items conform to active structural standards.</p>
          </div>
          <div className="rounded-full bg-indigo-50 border border-indigo-100 px-3 py-1 text-xs font-bold text-indigo-600 flex items-center gap-1">
            <HelpCircle className="h-3.5 w-3.5 text-indigo-400" />
            <span>Academic Guidelines</span>
          </div>
        </div>

        {/* Structured Grid Layout for Guidelines */}
        <div className="grid gap-5 md:grid-cols-2">
          {guidelinesList.map((item) => (
            <div 
              key={item.id} 
              className={`rounded-3xl border border-slate-100 border-l-4 p-6 shadow-sm hover:shadow-md transition duration-200 ${item.colorClass}`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-sm border border-slate-50">
                  {item.icon}
                </div>
                <h4 className="text-sm font-extrabold text-slate-800 tracking-tight">
                  {item.title}
                </h4>
              </div>
              <p className="mt-4 text-xs font-semibold text-slate-500 leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Footer Support Info */}
        <div className="rounded-3xl border border-indigo-50 bg-indigo-50/20 p-5 mt-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
            <div>
              <h5 className="text-xs font-bold text-indigo-950 uppercase tracking-wider">Need Technical Assistance?</h5>
              <p className="mt-1 text-xs font-medium text-slate-500 leading-relaxed">
                If your upload is failing due to local network speed restrictions, try compressing your document assets into a ZIP file before sending it to the grading portal.
              </p>
            </div>
          </div>
        </div>

      </div>
    </AppShell>
  );
}
