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
    label: "Dashboard",
    href: "/dasboard",
    roles: ["admin", "operator", "mcc", "teknisi"],
  },
  {
    label: "Form Pelaporan",
    href: "/form-pelaporan",
    roles: ["admin", "operator"],
  },
  {
    label: "Verifikasi MCC",
    href: "/verifikasi-mcc",
    roles: ["admin", "mcc"],
  },
  {
    label: "Work Orders",
    href: "/penanganan-teknis",
    roles: ["admin", "teknisi"],
  },
];