export const APP_NAME = "FINAL2 Portal";

export const studentNav = [
  { href: "/dashboard", label: "Submit Assignment" },
  { href: "/history", label: "My History" },
  { href: "/guidelines", label: "Guidelines" },
  { href: "/profile", label: "My Profile" }
] as const;

/** Nav links for the Teacher role (academic scope management & grading) */
export const teacherNav = [
  { href: "/teacher", label: "My Assignments" },
  { href: "/analytics", label: "Analytics" }
] as const;

/** Nav links for the SuperAdmin role (global system access) */
export const superadminNav = [
  { href: "/superadmin", label: "Global Overview" },
  { href: "/analytics", label: "Analytics" }
] as const;

/** @deprecated Use teacherNav or superadminNav instead. Kept for backward compatibility. */
export const adminNav = [
  { href: "/teacher", label: "Teacher Panel" },
  { href: "/superadmin", label: "SuperAdmin Panel" },
  { href: "/analytics", label: "Analytics" }
] as const;

export const colleges = [
  "SDJ International College",
  "Navyug Science College",
  "VNSGU Department of ICT",
  "Sutex Bank College"
] as const;

export const courses = ["BCA", "BBA", "B.Com"] as const;

export const semesters = ["Sem 1", "Sem 2", "Sem 3", "Sem 4", "Sem 5", "Sem 6"] as const;

export const courseSubjects: Record<string, readonly string[]> = {
  BCA: ["C Programming", "C Language", "Web Design", "DBMS", "Mathematics", "Networking"],
  BBA: ["Accounting", "Business Communication", "Economics", "Marketing", "Mathematics", "Management"],
  "B.Com": ["Accounting", "Economics", "Finance", "Mathematics", "Taxation", "Law"]
} as const;


export const assignmentStatuses = ["Pending", "Checked", "Rejected"] as const;

