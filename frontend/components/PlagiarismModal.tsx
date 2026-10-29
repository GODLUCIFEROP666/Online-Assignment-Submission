"use client";

import React, { useState } from "react";
import { AlertTriangle, CheckCircle2, Copy, ShieldAlert, X } from "lucide-react";

export interface ComparisonItem {
  student1_id: string;
  student1_name: string;
  student1_username: string;
  student2_id: string;
  student2_name: string;
  student2_username: string;
  similarity_percentage: number;
  risk_level: "high" | "medium" | "low";
  matching_phrases: string[];
  text1_sample: string;
  text2_sample: string;
}

export interface PlagiarismReportData {
  total_submissions_scanned: number;
  max_similarity_found: number;
  flagged_count: number;
  pairwise_comparisons: ComparisonItem[];
}

interface PlagiarismModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjectName: string;
  reportData: PlagiarismReportData | null;
  loading: boolean;
}

export default function PlagiarismModal({
  isOpen,
  onClose,
  subjectName,
  reportData,
  loading,
}: PlagiarismModalProps) {
  const [selectedComparison, setSelectedComparison] = useState<ComparisonItem | null>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-slate-100">
                100% Local Plagiarism & Similarity Inspector
              </h3>
              <p className="text-xs text-slate-400">
                Subject: <span className="text-amber-400 font-medium">{subjectName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-slate-400 font-medium">
                Scanning peer submissions with TF-IDF Vectorization...
              </p>
            </div>
          ) : !reportData || reportData.pairwise_comparisons.length === 0 ? (
            <div className="text-center py-12 bg-slate-950/40 rounded-xl border border-slate-800/80 p-8">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <h4 className="text-base font-medium text-slate-200">No Significant Similarity Detected</h4>
              <p className="text-xs text-slate-400 mt-1">
                All scanned submissions appear original with peer similarity within normal bounds (&lt; 15%).
              </p>
            </div>
          ) : (
            <>
              {/* Metric Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
                  <div className="text-xs text-slate-400 font-medium">Total Submissions Scanned</div>
                  <div className="text-2xl font-bold text-slate-100 mt-1">
                    {reportData.total_submissions_scanned}
                  </div>
                </div>

                <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
                  <div className="text-xs text-slate-400 font-medium">Max Peer Similarity</div>
                  <div
                    className={`text-2xl font-bold mt-1 ${
                      reportData.max_similarity_found >= 40
                        ? "text-rose-400"
                        : reportData.max_similarity_found >= 20
                        ? "text-amber-400"
                        : "text-emerald-400"
                    }`}
                  >
                    {reportData.max_similarity_found}%
                  </div>
                </div>

                <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
                  <div className="text-xs text-slate-400 font-medium">Flagged Submissions</div>
                  <div className="text-2xl font-bold text-amber-400 mt-1">
                    {reportData.flagged_count}
                  </div>
                </div>
              </div>

              {/* Pairwise Comparisons Table */}
              <div>
                <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                  <Copy className="w-4 h-4 text-amber-400" /> Peer-to-Peer Comparisons
                </h4>
                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
                  <div className="divide-y divide-slate-800/80">
                    {reportData.pairwise_comparisons.map((item, idx) => (
                      <div
                        key={idx}
                        className={`p-4 hover:bg-slate-800/40 transition cursor-pointer ${
                          selectedComparison === item ? "bg-slate-800/60 border-l-4 border-amber-500" : ""
                        }`}
                        onClick={() => setSelectedComparison(selectedComparison === item ? null : item)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="text-sm">
                              <span className="font-semibold text-slate-200">{item.student1_name}</span>
                              <span className="text-slate-500 px-2">vs</span>
                              <span className="font-semibold text-slate-200">{item.student2_name}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                item.risk_level === "high"
                                  ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                  : item.risk_level === "medium"
                                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                  : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              }`}
                            >
                              {item.similarity_percentage}% Match ({item.risk_level.toUpperCase()})
                            </span>
                          </div>
                        </div>

                        {/* Collapsible detail inspector */}
                        {selectedComparison === item && (
                          <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-4">
                            {item.matching_phrases && item.matching_phrases.length > 0 && (
                              <div>
                                <div className="text-xs font-medium text-amber-400 mb-1.5 flex items-center gap-1.5">
                                  <AlertTriangle className="w-3.5 h-3.5" /> Overlapping Phrases Detected:
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {item.matching_phrases.map((phrase, pIdx) => (
                                    <span
                                      key={pIdx}
                                      className="px-2 py-0.5 bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs rounded-md font-mono"
                                    >
                                      "{phrase}"
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                              <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
                                <div className="font-medium text-slate-300 mb-1">
                                  {item.student1_name}'s Submission:
                                </div>
                                <p className="text-slate-400 font-mono line-clamp-4">
                                  {item.text1_sample || "No text preview"}
                                </p>
                              </div>

                              <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
                                <div className="font-medium text-slate-300 mb-1">
                                  {item.student2_name}'s Submission:
                                </div>
                                <p className="text-slate-400 font-mono line-clamp-4">
                                  {item.text2_sample || "No text preview"}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm rounded-xl font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
