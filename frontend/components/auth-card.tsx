import type { ReactNode } from "react";
import { Sparkles, GraduationCap, ShieldCheck, Users, Milestone, Award } from "lucide-react";

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
    <div className="mx-auto flex min-h-screen w-full items-center justify-center px-4 py-8 sm:px-6 lg:px-8 selection:bg-indigo-500/20 selection:text-indigo-600">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[2.5rem] border border-slate-100/80 bg-white shadow-2xl shadow-indigo-900/10 lg:grid-cols-[1.1fr_0.9fr]">

        {/* Left Side: Premium Indigo Hero Panel */}
        <section className="relative overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white flex flex-col justify-between
          px-6 py-8
          sm:px-10 sm:py-10
          lg:px-12 lg:py-16">
          
          {/* Ambient Lighting & Glow Orbs */}
          <div className="absolute top-0 right-0 h-96 w-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 h-80 w-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative space-y-6 lg:space-y-8">
            {/* University Portal Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.24em] text-indigo-200 backdrop-blur-md shadow-inner">
              <Sparkles className="h-3.5 w-3.5 animate-pulse text-indigo-400" />
              <span>Assignment Submission Portal</span>
            </div>

            {/* Title & Subtitle */}
            <div className="space-y-3 lg:space-y-4">
              <h1 className="text-2xl font-black sm:text-3xl lg:text-4xl xl:text-5xl tracking-tight leading-[1.1] bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
                {heading}
              </h1>
              <p className="max-w-md text-sm leading-relaxed text-slate-300 hidden sm:block font-medium">
                {description}
              </p>
            </div>

            {/* Feature Highlights Grid */}
            <div className="hidden lg:grid gap-4 sm:grid-cols-2 pt-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md hover:border-indigo-400/30 transition-all duration-300 hover:translate-y-[-2px]">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300 mb-3 shadow-inner">
                  <GraduationCap className="h-4.5 w-4.5" />
                </div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-200">Students Portal</div>
                <div className="mt-1 text-xs text-slate-400 leading-relaxed font-medium">Submit practical assignments, track evaluation status, and view marks in real-time.</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md hover:border-emerald-400/30 transition-all duration-300 hover:translate-y-[-2px]">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300 mb-3 shadow-inner">
                  <ShieldCheck className="h-4.5 w-4.5" />
                </div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-200">Faculty &amp; Admin</div>
                <div className="mt-1 text-xs text-slate-400 leading-relaxed font-medium">Review submissions, grade with feedback remarks, and view analytical insights.</div>
              </div>
            </div>
          </div>

          {/* Footer Bar */}
          <div className="relative hidden lg:flex mt-10 pt-5 border-t border-white/10 items-center justify-between text-xs text-slate-400 font-medium">
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4 text-indigo-400" />
              <span>Multi-Role Secure Gateway</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>FastAPI + Next.js Stack</span>
            </div>
          </div>
        </section>

        {/* Right Side: Form Container */}
        <section className="px-6 py-8 sm:px-8 sm:py-12 lg:px-12 lg:py-16 flex flex-col justify-center bg-slate-50/40">
          <div className="mb-6 lg:mb-8 rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
            <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-indigo-600 flex items-center gap-1.5">
              <Milestone className="h-3.5 w-3.5" />
              <span>Security Access Hub</span>
            </div>
            <h2 className="mt-2 text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Credentials Gateway</h2>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed font-medium">Authenticate with your username and password to start your session.</p>
          </div>

          <div className="min-w-0">
            {children}
          </div>
        </section>

      </div>
    </div>
  );
}

