export const APP_NAME = "FINAL2 Portal";

export const studentNav = [
  { href: "/dashboard", label: "Submit Assignment" },
  { href: "/history", label: "My History" },
  { href: "/guidelines", label: "Guidelines" },
  { href: "/profile", label: "My Profile" }
] as const;

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

export const courseSubjects: Record<string, readonly string[]> = {
  BCA: ["C Programming", "Web Design", "DBMS", "Mathematics", "Networking"],
  BBA: ["Accounting", "Business Communication", "Economics", "Marketing", "Management"],
  "B.Com": ["Accounting", "Economics", "Finance", "Mathematics", "Taxation", "Law"]
} as const;

export const assignmentStatuses = ["Pending", "Checked", "Rejected"] as const;
