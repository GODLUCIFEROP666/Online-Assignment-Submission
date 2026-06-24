"use client";

import type { ReactNode } from "react";

type AssignmentRow = {
  id: number;
  student_name: string | null;
  college_name: string | null;
  year: string | null;
  subject: string | null;
  status: string | null;
  marks: number;
  submit_date: string | null;
};

type PredictionRow = {
  username: string | null;
  pass_probability: number;
  total_submissions?: number;
  avg_marks?: number;
};

type ClusterRow = {
  username: string | null;
  cluster: number;
  total_submissions?: number;
  avg_marks?: number;
};

type ChartSegment = {
  label: string;
  value: number;
  color: string;
};

type ChartPoint = {
  label: string;
  value: number;
};

const COLORS = ["#2563eb", "#10b981", "#f59e0b", "#f43f5e", "#8b5cf6", "#0ea5e9"];
const STATUS_COLORS: Record<string, string> = {
  Pending: "#f59e0b",
  Checked: "#10b981",
  Rejected: "#f43f5e",
  Unknown: "#64748b"
};

export function AdminAnalyticsGrid({
  assignments,
  predictions,
  clusters
}: Readonly<{
  assignments: AssignmentRow[];
  predictions: PredictionRow[];
  clusters: ClusterRow[];
}>) {
  const statusSegments = toSegments(countBy(assignments, (row) => row.status?.trim() || "Unknown"));
  const passSegments = toSegments({
    Pass: assignments.filter((row) => Number(row.marks) >= 50).length,
    "Needs attention": assignments.filter((row) => Number(row.marks) < 50).length
  });
  const subjectBars = topPoints(countBy(assignments, (row) => row.subject?.trim() || "Unspecified"), 6);
  const submissionTrend = trendPoints(assignments);
  const predictionBars = topPoints(
    [...predictions]
      .sort((left, right) => Number(right.pass_probability) - Number(left.pass_probability))
      .slice(0, 6)
      .reduce<Record<string, number>>((accumulator, item) => {
        accumulator[item.username || "Unknown"] = Number(item.pass_probability) || 0;
        return accumulator;
      }, {}),
    6
  );
  const clusterBars = topPoints(
    clusters.reduce<Record<string, number>>((accumulator, item) => {
      const key = `Cluster ${Number(item.cluster)}`;
      accumulator[key] = (accumulator[key] || 0) + 1;
      return accumulator;
    }, {}),
    6
  );
  const collegeBars = topPoints(countBy(assignments, (row) => row.college_name?.trim() || "Unassigned"), 6);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <ChartCard title="Assignment status" subtitle="Distribution of submissions by review state.">
          <DonutChart segments={statusSegments} centerLabel="Status" emptyLabel="No assignments" />
        </ChartCard>
        <ChartCard title="Submission trend" subtitle="Daily submission volume across the available dataset.">
          <LineChart points={submissionTrend} emptyLabel="No submission dates" />
        </ChartCard>
        <ChartCard title="Subjects" subtitle="Most submitted subjects in the current scope.">
          <BarChart points={subjectBars} color="#2563eb" emptyLabel="No subject data" />
        </ChartCard>
        <ChartCard title="Pass vs fail" subtitle="Marks split using a 50-point pass threshold.">
          <DonutChart
            segments={passSegments}
            centerLabel="Results"
            emptyLabel="No mark data"
          />
        </ChartCard>
        <ChartCard title="Prediction confidence" subtitle="Highest pass probabilities from the ML model.">
          <BarChart points={predictionBars} color="#8b5cf6" valueSuffix="%" emptyLabel="No prediction data" />
        </ChartCard>
        <ChartCard title="Cluster breakdown" subtitle="Student grouping from the analytics model.">
          <BarChart points={clusterBars} color="#0ea5e9" emptyLabel="No cluster data" />
        </ChartCard>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <ChartCard title="College spread" subtitle="Assignments grouped by college.">
          <BarChart points={collegeBars} color="#10b981" emptyLabel="No college data" />
        </ChartCard>
        <div className="rounded-3xl border border-border bg-gradient-to-br from-slate-50 to-white p-6 shadow-soft">
          <h2 className="text-xl font-semibold text-text">Chart summary</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            These charts are driven by live assignment data and the Python analytics payload, so they update when the backend data changes.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <MiniStat label="Assignments" value={String(assignments.length)} />
            <MiniStat label="Predictions" value={String(predictions.length)} />
            <MiniStat label="Clusters" value={String(clusters.length)} />
            <MiniStat label="Colleges" value={String(new Set(assignments.map((row) => row.college_name || "Unassigned")).size)} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children
}: Readonly<{
  title: string;
  subtitle: string;
  children: ReactNode;
}>) {
  return (
    <section className="rounded-3xl border border-border bg-white p-6 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-text">{title}</h3>
          <p className="mt-1 text-sm text-muted">{subtitle}</p>
        </div>
        <span className="rounded-full bg-brand-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-dark">
          Active
        </span>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function MiniStat({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-2xl border border-border bg-white p-4">
      <div className="text-xs uppercase tracking-[0.2em] text-muted">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-text">{value}</div>
    </div>
  );
}

function DonutChart({
  segments,
  centerLabel,
  emptyLabel
}: Readonly<{
  segments: ChartSegment[];
  centerLabel: string;
  emptyLabel: string;
}>) {
  const total = segments.reduce((sum, item) => sum + item.value, 0);
  const radius = 72;
  const stroke = 22;
  const circumference = 2 * Math.PI * radius;
  let cursor = 0;

  if (total <= 0) {
    return <EmptyState label={emptyLabel} />;
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[220px_1fr] lg:items-center">
      <svg viewBox="0 0 220 220" className="mx-auto h-[220px] w-[220px]">
        <circle cx="110" cy="110" r={radius} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
        {segments.map((segment) => {
          const dashLength = (segment.value / total) * circumference;
          const dashOffset = circumference - cursor;
          cursor += dashLength;
          return (
            <circle
              key={segment.label}
              cx="110"
              cy="110"
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${dashLength} ${circumference - dashLength}`}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 110 110)"
            />
          );
        })}
        <text x="110" y="106" textAnchor="middle" className="fill-text text-[18px] font-semibold">
          {centerLabel}
        </text>
        <text x="110" y="132" textAnchor="middle" className="fill-muted text-[14px]">
          {total}
        </text>
      </svg>
      <div className="space-y-3">
        {segments.map((segment) => {
          const percent = total ? Math.round((segment.value / total) * 100) : 0;
          return (
            <div key={segment.label} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-slate-50 px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: segment.color }} />
                <span className="text-sm font-medium text-text">{segment.label}</span>
              </div>
              <div className="text-right text-sm text-muted">
                <span className="font-semibold text-text">{segment.value}</span> {percent}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BarChart({
  points,
  color,
  valueSuffix,
  emptyLabel
}: Readonly<{
  points: ChartPoint[];
  color: string;
  valueSuffix?: string;
  emptyLabel: string;
}>) {
  if (points.length === 0) {
    return <EmptyState label={emptyLabel} />;
  }

  const width = 320;
  const height = 220;
  const topPad = 28;
  const bottomPad = 42;
  const chartHeight = height - topPad - bottomPad;
  const maxValue = Math.max(...points.map((point) => point.value), 1);
  const barWidth = Math.min(44, Math.max(24, 240 / Math.max(points.length, 1)));
  const gap = (240 - barWidth * points.length) / Math.max(points.length - 1, 1);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-[220px] w-full">
      {[0.25, 0.5, 0.75, 1].map((tick) => {
        const y = topPad + chartHeight - chartHeight * tick;
        return <line key={tick} x1="24" x2="300" y1={y} y2={y} stroke="#e2e8f0" strokeDasharray="4 6" />;
      })}
      {points.map((point, index) => {
        const barHeight = Math.max((point.value / maxValue) * chartHeight, 8);
        const x = 32 + index * (barWidth + gap);
        const y = topPad + chartHeight - barHeight;
        return (
          <g key={point.label}>
            <rect x={x} y={y} width={barWidth} height={barHeight} rx="12" fill={color} opacity="0.9" />
            <text x={x + barWidth / 2} y={y - 8} textAnchor="middle" className="fill-text text-[11px] font-semibold">
              {Math.round(point.value)}
              {valueSuffix ?? ""}
            </text>
            <text x={x + barWidth / 2} y={194} textAnchor="middle" className="fill-muted text-[11px]">
              {shortLabel(point.label)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function LineChart({
  points,
  emptyLabel
}: Readonly<{
  points: ChartPoint[];
  emptyLabel: string;
}>) {
  if (points.length === 0) {
    return <EmptyState label={emptyLabel} />;
  }

  const width = 320;
  const height = 220;
  const leftPad = 24;
  const rightPad = 16;
  const topPad = 24;
  const bottomPad = 44;
  const chartWidth = width - leftPad - rightPad;
  const chartHeight = height - topPad - bottomPad;
  const maxValue = Math.max(...points.map((point) => point.value), 1);
  const step = points.length === 1 ? chartWidth : chartWidth / (points.length - 1);
  const coordinates = points.map((point, index) => {
    const x = leftPad + index * step;
    const y = topPad + chartHeight - (point.value / maxValue) * chartHeight;
    return { x, y, point };
  });
  const linePath = coordinates.map((coordinate, index) => `${index === 0 ? "M" : "L"} ${coordinate.x} ${coordinate.y}`).join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-[220px] w-full">
      {[0.25, 0.5, 0.75, 1].map((tick) => {
        const y = topPad + chartHeight - chartHeight * tick;
        return <line key={tick} x1={leftPad} x2={width - rightPad} y1={y} y2={y} stroke="#e2e8f0" strokeDasharray="4 6" />;
      })}
      <path d={linePath} fill="none" stroke="#2563eb" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      {coordinates.map((coordinate) => (
        <g key={coordinate.point.label}>
          <circle cx={coordinate.x} cy={coordinate.y} r="6" fill="#2563eb" />
          <circle cx={coordinate.x} cy={coordinate.y} r="11" fill="#2563eb" opacity="0.12" />
          <text x={coordinate.x} y={194} textAnchor="middle" className="fill-muted text-[11px]">
            {shortLabel(coordinate.point.label)}
          </text>
        </g>
      ))}
    </svg>
  );
}

function EmptyState({ label }: Readonly<{ label: string }>) {
  return (
    <div className="flex h-[220px] items-center justify-center rounded-2xl border border-dashed border-border bg-slate-50 text-sm text-muted">
      {label}
    </div>
  );
}

function countBy(items: AssignmentRow[], getKey: (row: AssignmentRow) => string) {
  return items.reduce<Record<string, number>>((accumulator, item) => {
    const key = getKey(item);
    accumulator[key] = (accumulator[key] ?? 0) + 1;
    return accumulator;
  }, {});
}

function toSegments(counts: Record<string, number>): ChartSegment[] {
  return Object.entries(counts).map(([label, value], index) => ({
    label,
    value,
    color: STATUS_COLORS[label] ?? COLORS[index % COLORS.length]
  }));
}

function topPoints(counts: Record<string, number>, limit: number): ChartPoint[] {
  return Object.entries(counts)
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit)
    .map(([label, value]) => ({ label, value }));
}

function trendPoints(assignments: AssignmentRow[]): ChartPoint[] {
  const counts = assignments.reduce<Record<string, number>>((accumulator, item) => {
    const label = item.submit_date?.slice(0, 10) || "Unknown";
    accumulator[label] = (accumulator[label] ?? 0) + 1;
    return accumulator;
  }, {});

  return Object.entries(counts)
    .sort((left, right) => left[0].localeCompare(right[0]))
    .slice(-8)
    .map(([label, value]) => ({ label, value }));
}

function shortLabel(value: string) {
  if (value.length <= 10) {
    return value;
  }
  return `${value.slice(0, 10)}…`;
}
