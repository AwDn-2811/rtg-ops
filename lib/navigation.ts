
export type UserRole =
  | "admin"
  | "operator"
  | "mcc"
  | "teknisi";

export type MenuItem = {
  label: string;
  href: string;
  roles: UserRole[];
};

export const navigationMenus: MenuItem[] = [
  {
    label: "Form Pelaporan",
    href: "/form-pelaporan",
    roles: ["admin", "operator"],
  },
  {
    label: "Approval MCC",
    href: "/verifikasi-mcc",
    roles: ["admin", "mcc"],
  },
  {
    label: "Dashboard Monitoring",
    href: "/dashboard",
    roles: ["admin", "mcc", "teknisi"],
  },
  {
    label: "Penanganan Teknisi",
    href: "/penanganan-teknis",
    roles: ["admin", "teknisi"],
  },
  {
    label: "Audit Log",
    href: "/audit-log",
    roles: ["admin", "mcc"],
  },
];
