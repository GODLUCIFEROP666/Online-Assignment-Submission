import type { ReactNode } from "react";
import { Sparkles, GraduationCap, ShieldCheck, Users, Milestone } from "lucide-react";

export function AuthCard({
  heading,
  description,
  children
}: Readonly<{
  heading: string;
  description: string;
  children: ReactNode;
}>) {
  return (
    <div className="mx-auto flex min-h-screen w-full items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-2xl shadow-slate-200/50 lg:grid-cols-[1.1fr_0.9fr]">

        {/* Left Side: Modern Premium Presentation Panel
            — On mobile: compact top banner (no feature grid).
            — On lg+: full-height sidebar with feature grid.
        */}
        <section className="relative overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white flex flex-col justify-between
          px-6 py-6
          sm:px-8 sm:py-8
          lg:px-12 lg:py-16">
          {/* Ambient blobs — hidden on smallest screens to keep paint cost low */}
          <div className="absolute top-0 right-0 h-80 w-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 h-64 w-64 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative space-y-4 lg:space-y-8">
            {/* Portal badge */}
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold uppercase tracking-[0.24em] text-indigo-200">
              <Sparkles className="h-3 w-3 animate-pulse text-indigo-400" />
              <span>Assignment Submission Portal</span>
            </div>

            {/* Heading — responsive font size */}
            <div className="space-y-2 lg:space-y-4">
              <h1 className="text-2xl font-extrabold sm:text-3xl lg:text-5xl tracking-tight leading-none bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
                {heading}
              </h1>
              <p className="max-w-lg text-sm leading-relaxed text-slate-400 hidden sm:block">
                {description}
              </p>
            </div>

            {/* Feature Grid — only visible on lg+ to keep mobile left panel compact */}
            <div className="hidden lg:grid gap-4 sm:grid-cols-2 pt-2">
              <div className="rounded-2xl border border-white/5 bg-white/5 p-5 backdrop-blur-md hover:border-white/10 transition-colors">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 mb-3">
                  <GraduationCap className="h-4 w-4" />
                </div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-300">Students</div>
                <div className="mt-1 text-xs text-slate-400 leading-relaxed">Submit assignments, check history, and manage your verification status.</div>
              </div>
              <div className="rounded-2xl border border-white/5 bg-white/5 p-5 backdrop-blur-md hover:border-white/10 transition-colors">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 mb-3">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-300">Administration</div>
                <div className="mt-1 text-xs text-slate-400 leading-relaxed">Grade homeworks, review student records, and check AI clusters.</div>
              </div>
            </div>
          </div>

          {/* Footer — hidden on mobile to keep left panel short */}
          <div className="relative hidden lg:flex mt-12 pt-6 border-t border-white/5 items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              <span>Multi-role Secure Gateway</span>
            </div>
            <span>v2.1.0</span>
          </div>
        </section>

        {/* Right Side: Sleek Input Form Panel */}
        <section className="px-6 py-8 sm:px-8 sm:py-12 lg:px-12 lg:py-16 flex flex-col justify-center bg-slate-50/20">
          <div className="mb-6 lg:mb-8 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-indigo-500 flex items-center gap-1">
              <Milestone className="h-3 w-3" />
              <span>Security Hub</span>
            </div>
            <h2 className="mt-2 text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight">Credentials Gateway</h2>
            <p className="mt-1 text-xs text-slate-400 leading-relaxed">Provide your authorized username and passkey to establish a JWT session.</p>
          </div>

          <div className="min-w-0">
            {children}
          </div>
        </section>

      </div>
    </div>
  );
}
