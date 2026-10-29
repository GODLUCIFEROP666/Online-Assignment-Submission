"use client";

import React, { useState } from "react";
import { Sparkles, Check, ChevronDown, ChevronUp, AlertCircle, FileText } from "lucide-react";

export interface AutoGradeRecommendation {
  suggested_marks: number;
  max_marks: number;
  percentage: number;
  breakdown: {
    concept_coverage: number;
    structure_depth: number;
    syntax_formatting: number;
    plagiarism_penalty: number;
  };
  suggested_feedback: string;
  notes: string[];
}

interface AutoGradePanelProps {
  onApply: (marks: number, feedback: string) => void;
  assignmentId: string;
  autoGradeData?: AutoGradeRecommendation | null;
  loading?: boolean;
}

export default function AutoGradePanel({
  onApply,
  assignmentId,
  autoGradeData,
  loading = false,
}: AutoGradePanelProps) {
  const [expanded, setExpanded] = useState(true);

  if (loading) {
    return (
      <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-xl p-4 flex items-center gap-3 text-indigo-300">
        <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-xs font-medium">Running 100% Free Local AI Auto-Grader analysis...</span>
      </div>
    );
  }

  if (!autoGradeData) return null;

  return (
    <div className="bg-slate-900/90 border border-indigo-500/30 rounded-xl p-4 shadow-lg space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-indigo-400">
          <Sparkles className="w-4 h-4" />
          <span className="text-sm font-semibold text-slate-100">
            100% Free AI Auto-Grader Assistant
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onApply(autoGradeData.suggested_marks, autoGradeData.suggested_feedback)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow transition"
          >
            <Check className="w-3.5 h-3.5" /> Apply Marks ({autoGradeData.suggested_marks})
          </button>

          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="p-1 text-slate-400 hover:text-slate-200 transition"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="space-y-3 text-xs pt-2 border-t border-slate-800">
          {/* Main suggested marks banner */}
          <div className="flex items-center justify-between bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
            <span className="text-slate-400">Suggested Grade:</span>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-indigo-300">
                {autoGradeData.suggested_marks} / {autoGradeData.max_marks}
              </span>
              <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-300 font-semibold rounded-md border border-indigo-500/20">
                {autoGradeData.percentage}%
              </span>
            </div>
          </div>

          {/* Breakdown stats */}
          <div className="grid grid-cols-2 gap-2 text-slate-300">
            <div className="bg-slate-950/40 p-2 rounded-lg border border-slate-800/80">
              <div className="text-[10px] text-slate-400">Concept Coverage</div>
              <div className="font-semibold text-slate-200 mt-0.5">
                {autoGradeData.breakdown.concept_coverage} pts
              </div>
            </div>

            <div className="bg-slate-950/40 p-2 rounded-lg border border-slate-800/80">
              <div className="text-[10px] text-slate-400">Depth & Length</div>
              <div className="font-semibold text-slate-200 mt-0.5">
                {autoGradeData.breakdown.structure_depth} pts
              </div>
            </div>

            <div className="bg-slate-950/40 p-2 rounded-lg border border-slate-800/80">
              <div className="text-[10px] text-slate-400">Code/Structure Syntax</div>
              <div className="font-semibold text-slate-200 mt-0.5">
                {autoGradeData.breakdown.syntax_formatting} pts
              </div>
            </div>

            <div className="bg-slate-950/40 p-2 rounded-lg border border-slate-800/80">
              <div className="text-[10px] text-slate-400">Plagiarism Deduction</div>
              <div className="font-semibold text-rose-400 mt-0.5">
                -{autoGradeData.breakdown.plagiarism_penalty} pts
              </div>
            </div>
          </div>

          {/* Notes list */}
          {autoGradeData.notes && autoGradeData.notes.length > 0 && (
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                <FileText className="w-3 h-3 text-slate-400" /> Evaluation Factors:
              </span>
              <ul className="list-disc list-inside space-y-0.5 text-slate-300 pl-1">
                {autoGradeData.notes.map((note, nIdx) => (
                  <li key={nIdx}>{note}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Feedback Draft */}
          <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 font-medium block mb-1">
              Generated Feedback Draft:
            </span>
            <p className="text-slate-300 italic">{autoGradeData.suggested_feedback}</p>
          </div>
        </div>
      )}
    </div>
  );
}
