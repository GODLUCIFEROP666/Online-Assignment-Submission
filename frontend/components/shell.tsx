"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useState, useEffect } from "react";
import { 
  UploadCloud, 
  History, 
  BookOpen, 
  User, 
  GraduationCap, 
  ShieldCheck, 
  BarChart3, 
  LogOut,
  Menu,
  X,
  Sparkles,
  LayoutDashboard,
  UserCheck
} from "lucide-react";
import { clearAuth, getSessionRole } from "@/lib/auth";

type NavItem = {
  href: string;
  label: string;
};

export function AppShell({
  title,
  subtitle,
  nav,
  children
}: Readonly<{
  title: string;
  subtitle: string;
  nav: readonly NavItem[];
  children: ReactNode;
}>) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    setRole(getSessionRole());
  }, []);

  function handleLogout() {
    clearAuth();
    router.push("/login");
  }

  function getIcon(href: string) {
    const path = href.toLowerCase();
    if (path.includes("dashboard")) return <UploadCloud className="h-4.5 w-4.5" />;
    if (path.includes("history")) return <History className="h-4.5 w-4.5" />;
    if (path.includes("guidelines")) return <BookOpen className="h-4.5 w-4.5" />;
    if (path.includes("profile")) return <User className="h-4.5 w-4.5" />;
    if (path.includes("teacher")) return <GraduationCap className="h-4.5 w-4.5" />;
    if (path.includes("superadmin")) return <ShieldCheck className="h-4.5 w-4.5" />;
    if (path.includes("analytics")) return <BarChart3 className="h-4.5 w-4.5" />;
    return <LayoutDashboard className="h-4.5 w-4.5" />;
  }

  const formattedRole = role
    ? role.charAt(0).toUpperCase() + role.slice(1)
    : "Member";

  const isTeacherOrAdmin = role === "teacher" || role === "superadmin";

  return (
    <div className="min-h-screen bg-slate-50/50 pb-12 font-sans selection:bg-indigo-500/10 selection:text-indigo-600">
      {/* Background Decorative Ambient Blobs */}
      <div className="absolute top-0 left-1/4 -z-10 h-96 w-96 rounded-full bg-indigo-500/5 blur-3xl" />
      <div className="absolute top-1/3 right-1/4 -z-10 h-[400px] w-[400px] rounded-full bg-rose-500/3 blur-3xl" />

      {/* Responsive Header Shell */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-100 bg-white/80 backdrop-blur-md shadow-sm">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 font-bold tracking-wider text-white shadow-md shadow-indigo-600/20 group-hover:scale-105 transition duration-200">
                F2
              </div>
              <div className="min-w-0">
                <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-indigo-500 leading-none">University Portal</div>
                <h1 className="text-sm font-black text-slate-800 tracking-tight sm:text-base mt-2">FINAL2 Dashboard</h1>
              </div>
            </Link>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <div className="flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-600 shadow-sm border border-indigo-100/50">
              <Sparkles className="h-3 w-3 animate-pulse" />
              <span>{formattedRole} Mode</span>
            </div>
            <div className="h-4 w-px bg-slate-200" />
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
            >
              <LogOut className="h-3 w-3" />
              <span>Sign out</span>
            </button>
          </div>

          {/* Mobile hamburger button */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 transition focus:outline-none"
              aria-label="Toggle navigation drawer"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Slide-out Nav */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm md:hidden" onClick={() => setMobileMenuOpen(false)}>
          <div
            className="fixed top-15 right-0 bottom-0 z-50 w-64 bg-white p-6 shadow-xl border-l border-slate-100 flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-6">
              <div className="pb-4 border-b border-slate-100">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Authorized Identity</div>
                <div className="mt-1 text-sm font-extrabold text-slate-700">{formattedRole} Account</div>
              </div>
              <nav className="space-y-1.5">
                {nav.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition ${
                        isActive
                          ? "bg-indigo-50 text-indigo-600 border-l-4 border-indigo-600 shadow-sm"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      {getIcon(item.href)}
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
            <div className="border-t border-slate-100 pt-4">
              <button
                onClick={handleLogout}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-100 bg-rose-50/50 py-3 text-sm font-bold text-rose-600 hover:bg-rose-100 transition"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Responsive Grid Layout Shell */}
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="grid gap-6 md:grid-cols-[240px_1fr] lg:grid-cols-[260px_1fr] xl:grid-cols-[280px_1fr]">
          
          {/* Permanent Desktop sidebar */}
          <aside className="hidden flex-col rounded-3xl border border-slate-100 bg-white p-5 shadow-sm md:flex h-fit sticky top-22">
            <div className="mb-6 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <UserCheck className="h-4.5 w-4.5" />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Academic Scope</div>
                  <div className="text-sm font-extrabold text-slate-800 leading-tight">{formattedRole} space</div>
                </div>
              </div>
            </div>

            <nav className="space-y-1">
              {nav.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition group ${
                      isActive
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10 translate-x-1"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <span className={`transition-transform group-hover:scale-105 duration-150 ${isActive ? "text-white" : "text-slate-400 group-hover:text-indigo-500"}`}>
                      {getIcon(item.href)}
                    </span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="mt-8 border-t border-slate-100 pt-5 space-y-4">
              <div className="flex items-center gap-3 px-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-500 to-indigo-600 text-sm font-bold text-white shadow-inner">
                  {role ? role.substring(0, 2).toUpperCase() : "US"}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-extrabold text-slate-800 truncate">{formattedRole}</div>
                  <div className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Session Secure
                  </div>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-100 bg-slate-50/50 py-3 text-sm font-bold text-slate-600 transition hover:border-rose-100 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
              >
                <LogOut className="h-4 w-4 text-slate-400 hover:text-rose-600" />
                <span>Sign out</span>
              </button>
            </div>
          </aside>

          {/* Flexible Main content panel */}
          <main className="min-w-0 space-y-6">
            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 h-40 w-40 bg-indigo-500/3 rounded-full blur-3xl pointer-events-none" />
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{title}</h2>
                  <p className="mt-1 text-sm text-slate-500 leading-relaxed max-w-2xl">{subtitle}</p>
                </div>
                {isTeacherOrAdmin && (
                  <div className="self-start sm:self-center">
                    <span className="rounded-full bg-indigo-50 border border-indigo-100 px-3 py-1 text-xs font-bold text-indigo-600 flex items-center gap-1 shadow-sm">
                      <Sparkles className="h-3.5 w-3.5" />
                      University Control
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="w-full min-w-0">{children}</div>
          </main>

        </div>
      </div>
    </div>
  );
}