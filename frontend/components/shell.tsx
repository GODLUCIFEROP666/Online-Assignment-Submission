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
  UserCheck,
  Bell
} from "lucide-react";
import { clearAuth, getSessionRole } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/api";
import { NotificationBell } from "@/components/notification-bell";

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
  const [windowWidth, setWindowWidth] = useState<number>(1024);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setRole(getSessionRole());
    setIsMounted(true);
    setWindowWidth(window.innerWidth);

    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const showSidebar = isMounted ? windowWidth >= 1024 : true;

  async function handleLogout() {
    const currentRole = getSessionRole() ?? role;
    const logoutPath = currentRole === "teacher" || currentRole === "superadmin" ? "/api/admin/auth/logout" : "/api/auth/logout";
    try {
      const accessToken = window.localStorage.getItem("final2_access_token");
      await fetch(`${API_BASE_URL}${logoutPath}`, {
        method: "POST",
        credentials: "include",
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined
      });
    } catch {
      // Best-effort backend logout. Local auth is cleared regardless.
    }
    clearAuth();
    router.push("/login");
  }

  function getIcon(href: string) {
    const path = href.toLowerCase();
    if (path.includes("dashboard")) return <UploadCloud className="h-4 w-4" />;
    if (path.includes("history")) return <History className="h-4 w-4" />;
    if (path.includes("guidelines")) return <BookOpen className="h-4 w-4" />;
    if (path.includes("profile")) return <User className="h-4 w-4" />;
    if (path.includes("teacher")) return <GraduationCap className="h-4 w-4" />;
    if (path.includes("superadmin")) return <ShieldCheck className="h-4 w-4" />;
    if (path.includes("analytics")) return <BarChart3 className="h-4 w-4" />;
    return <LayoutDashboard className="h-4 w-4" />;
  }

  const formattedRole = role
    ? role.charAt(0).toUpperCase() + role.slice(1)
    : "Member";

  const isTeacherOrAdmin = role === "teacher" || role === "superadmin";
  const visibleNav = nav.filter((item) => {
    if (item.href.includes("superadmin")) {
      return role === "superadmin";
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50/50 pb-12 font-sans selection:bg-indigo-500/10 selection:text-indigo-600">
      {/* Background Decorative Ambient Blobs */}
      <div className="fixed top-0 left-1/4 -z-10 h-96 w-96 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" />
      <div className="fixed top-1/3 right-1/4 -z-10 h-[400px] w-[400px] rounded-full bg-rose-500/3 blur-3xl pointer-events-none" />

      {/* Top Header Shell — z-50 so it always sits above drawers */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-100 bg-white/80 backdrop-blur-md shadow-sm">
        <div className="mx-auto flex w-full max-w-none items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
          
          {/* Logo + Brand */}
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/" className="flex items-center gap-2 group shrink-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 font-bold tracking-wider text-white shadow-md shadow-indigo-600/20 group-hover:scale-105 transition-transform duration-200 shrink-0">
                F2
              </div>
              <div className="min-w-0 hidden xs:block">
                <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-indigo-500">University Portal</div>
                <h1 className="text-sm font-extrabold text-slate-800 tracking-tight sm:text-base">FINAL2 Dashboard</h1>
              </div>
            </Link>
          </div>

          {/* Header controls — responsive but unified to ensure hamburger/menu is always visible */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600 border border-indigo-100/50">
              <Sparkles className="h-3 w-3 animate-pulse" />
              <span>{formattedRole} Mode</span>
            </div>
            <div className="hidden sm:block h-4 w-px bg-slate-200" />
            
            <NotificationBell />
            <div className="h-4 w-px bg-slate-200" />
            
            <div className="hidden md:flex items-center gap-3">
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
              >
                <LogOut className="h-3 w-3" />
                <span>Sign out</span>
              </button>
              <div className="h-4 w-px bg-slate-200" />
            </div>

            {/* Menu toggle button — ALWAYS visible on all screen sizes to guarantee navigation accessibility */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 transition-colors focus:outline-none flex items-center justify-center"
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Backdrop + Drawer — z-40 (below z-50 header) */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        >
          {/* Drawer panel — slides in from right */}
          <div
            className="absolute top-0 right-0 bottom-0 w-72 max-w-[85vw] bg-white shadow-2xl border-l border-slate-100 flex flex-col overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-white">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Navigation</div>
                <div className="mt-0.5 text-sm font-extrabold text-slate-800">{formattedRole} Menu</div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer nav */}
            <div className="flex-1 px-4 py-4">
              {/* Role badge */}
              <div className="mb-4 flex items-center gap-2 px-1">
                <div className="flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600 border border-indigo-100/50">
                  <Sparkles className="h-3 w-3 animate-pulse" />
                  <span>{formattedRole} Mode</span>
                </div>
              </div>

              <nav className="space-y-1">
                {visibleNav.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href as never}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                        isActive
                           ? "bg-indigo-50 text-indigo-600 border-l-4 border-indigo-600 shadow-sm"
                           : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <span className={isActive ? "text-indigo-600" : "text-slate-400"}>
                        {getIcon(item.href)}
                      </span>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Drawer footer with logout */}
            <div className="sticky bottom-0 border-t border-slate-100 px-4 py-4 bg-white">
              <button
                onClick={handleLogout}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-100 bg-rose-50/50 px-4 py-3 text-sm font-bold text-rose-600 hover:bg-rose-100 transition duration-200"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="mx-auto w-full max-w-none px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8 xl:px-12 2xl:px-16">
        <div className={`grid gap-6 ${showSidebar ? "lg:grid-cols-[260px_1fr] xl:grid-cols-[280px_1fr]" : "grid-cols-1"}`}>
          
          {/* Sidebar Left Navigation */}
          <aside className={`${showSidebar ? "flex" : "hidden"} flex-col rounded-3xl border border-slate-100 bg-white p-5 shadow-premium glass-panel h-fit sticky top-[73px]`}>
            <div className="mb-6 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <UserCheck className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Authorized Access</div>
                  <div className="text-sm font-extrabold text-slate-800 leading-tight">{formattedRole} Portal</div>
                </div>
              </div>
            </div>

            <nav className="space-y-1">
              {visibleNav.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href as never}
                    className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-semibold transition-all duration-200 group ${
                      isActive
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 translate-x-1.5"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <span className={`transition-transform duration-200 group-hover:scale-110 ${isActive ? "text-white" : "text-slate-400 group-hover:text-indigo-500"}`}>
                      {getIcon(item.href)}
                    </span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="mt-8 border-t border-slate-100 pt-5 space-y-4">
              <div className="flex items-center gap-3 px-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-500 to-indigo-600 text-sm font-bold text-white shadow-md shrink-0">
                  {role ? role.substring(0, 2).toUpperCase() : "US"}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-extrabold text-slate-800 truncate">{formattedRole}</div>
                  <div className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                    <span className="truncate">Session Secure</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-100 bg-slate-50/50 px-4 py-3 text-sm font-bold text-slate-600 transition duration-200 hover:border-rose-100 hover:bg-rose-50/70 hover:text-rose-600"
              >
                <LogOut className="h-4 w-4 text-slate-400" />
                <span>Sign out</span>
              </button>
            </div>
          </aside>

          {/* Main Content Area Right — min-w-0 prevents flex overflow */}
          <main className="min-w-0 space-y-5 sm:space-y-6">
            
            {/* Header Content Panel */}
            <div className="rounded-3xl border border-slate-100/80 bg-white p-4 sm:p-6 shadow-premium glass-panel relative overflow-hidden">
              <div className="absolute top-0 right-0 h-40 w-40 bg-indigo-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-2xl font-extrabold text-slate-900 tracking-tight truncate">{title}</h2>
                  <p className="mt-1 text-sm text-slate-500 leading-relaxed max-w-2xl">{subtitle}</p>
                </div>
                {isTeacherOrAdmin && (
                  <div className="shrink-0 flex items-center gap-2 self-start sm:self-center">
                    <span className="rounded-full bg-indigo-50 border border-indigo-100 px-3 py-1.5 text-xs font-bold text-indigo-600 flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5" />
                      University Control
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Sub-page Wrapper — min-w-0 critical for nested flex/grid children */}
            <div className="w-full min-w-0">
              {children}
            </div>
          </main>

        </div>
      </div>
    </div>
  );
}
