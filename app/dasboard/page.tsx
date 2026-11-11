"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import * as XLSX from "xlsx-js-style";
import { createClient } from "@/lib/supabase/client";
import { 
  Bell, 
  User, 
  CheckCircle2, 
  AlertOctagon, 
  FileText,
  Plus, 
  Search, 
  ChevronRight,
  Download,
  Trash2,
  LogOut,
  X,
  Wrench,
  MapPin,
  ShieldCheck,
  Menu,
  UserPlus,
  Users,
  Shield,
  Key,
  Package
} from "lucide-react";

interface Report {
  id: number | string;
  tanggal: string;
  jam: string;
  rtg: string;
  lokasi: string;
  pelapor: string;
  praOperasi: string;
  pascaOperasi: string;
  kategori: string;
  prioritas?: string;
  status: string;
  teknisi?: string;
}

interface RTGStatus {
  id: number;
  unit_code: string;
  status: string;
  block: string | null;
  last_updated: string;
  activeReport?: any;
}

interface RTGCardItem {
  id: string;
  status: "NORMAL" | "PENDING_MCC" | "ON_PROGRESS" | "WAITING_PART";
  prioritas?: string;
  sub: string;
  block?: string | null;
  lastUpdated?: string;
  reportDetails?: Report | null;
}

interface UserProfile {
  id: string;
  full_name: string;
  employee_id: string;
  role: "admin" | "operator" | "mcc" | "teknisi";
  is_active: boolean;
}

export default function DashboardPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [reports, setReports] = useState<Report[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedKategoriFilter, setSelectedKategoriFilter] = useState("SEMUA");
  const [showNotif, setShowNotif] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  // State Hamburger Menu Mobile
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // State RTG Status Supabase Realtime
  const [rtgStatuses, setRtgStatuses] = useState<RTGStatus[]>([]);
  const [rtgLoading, setRtgLoading] = useState(true);

  //state untuk filter grafik laporan per bulan
  const [grafikFilterBulan, setGrafikFilterBulan] = useState<string>("SEMUA");
  const [grafikFilterTahun, setGrafikFilterTahun] = useState<string>("SEMUA");

  // Ekstrak tahun unik secara otomatis dari data laporan
  const availableYears = Array.from(
    new Set(
      reports
        .map((r) => new Date(r.tanggal).getFullYear())
        .filter((y) => !isNaN(y))
    )
  ).sort((a, b) => b - a); // Urutkan dari tahun terbaru ke tertua

  // State Modal Card RTG
  const [selectedRtgCard, setSelectedRtgCard] = useState<RTGCardItem | null>(null);
  const [showRtgModal, setShowRtgModal] = useState(false);

  // State RBAC & User Management Modal
  const [showUserManagementModal, setShowUserManagementModal] = useState(false);
  const [userList, setUserList] = useState<UserProfile[]>([]);
  const [selectedRoleTab, setSelectedRoleTab] = useState<string>("admin");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmployeeId, setNewUserEmployeeId] = useState("");
  const [newUserRole, setNewUserRole] = useState<"admin" | "operator" | "mcc" | "teknisi">("operator");
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // State untuk menampung user yang sedang diedit
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmployeeId, setEditEmployeeId] = useState("");
  const [editRole, setEditRole] = useState<"admin" | "operator" | "mcc" | "teknisi">("operator");
  const [editIsActive, setEditIsActive] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // Supabase Client & Role Check
  const supabase = createClient();
  const [role, setRole] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // State menampung profil pengguna yang sedang login dari Supabase
  const [currentUserProfile, setCurrentUserProfile] = useState<{
    full_name: string;
    employee_id: string;
    role: string;
  } | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function checkAccess() {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          router.replace("/");
          return;
        }

        const { data: profile, error: profileError } =
          await supabase
          .from("profiles")
          .select("full_name, employee_id, role, is_active")
          .eq("id", user.id)
          .single();

        if ( profileError || !profile || !profile.is_active) {
          await supabase.auth.signOut();
          router.replace("/");
          return;
        }

        const allowedRoles = ["admin", "mcc", "operator", "teknisi"];

        if (!allowedRoles.includes(profile.role)) {
          router.replace("/dasboard");
          return;
        }

        if (isMounted) {
          setRole(profile.role);
          setCurrentUserProfile({
            full_name: profile.full_name || "User RTG-ops",
            employee_id: profile.employee_id || "-",
            role: profile.role,
          });
        }
      } catch (error) {
        console.error(error);
        router.replace("/");
      } finally {
        if (isMounted) {
          setProfileLoading(false);
        }
      }
    }

    checkAccess();

    return () => {
      isMounted = false;
    };
  }, [router, supabase]);

  // Fetch User Profiles untuk Admin
  const fetchUserProfiles = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, employee_id, role, is_active")
      .order("full_name", { ascending: true });

    if (!error && data) {
      setUserList(data as UserProfile[]);
    }
  };

  const handleOpenUserManagement = () => {
    setShowProfile(false);
    setShowUserManagementModal(true);
    fetchUserProfiles();
  };

  // Fungsi Tambah User Baru
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail || !newUserPassword || !newUserName || !newUserEmployeeId) {
      alert("Mohon lengkapi semua data pendaftaran user baru (termasuk Employee ID).");
      return;
    }

    setIsCreatingUser(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: newUserEmail,
        password: newUserPassword,
        options: {
          data: {
            full_name: newUserName,
            employee_id: newUserEmployeeId,
            role: newUserRole,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        alert(`User baru (${newUserName} - ${newUserEmployeeId}) berhasil dibuat!`);
        setNewUserEmail("");
        setNewUserPassword("");
        setNewUserName("");
        setNewUserEmployeeId("");
        
        setTimeout(() => {
          fetchUserProfiles();
        }, 500);
      }
    } catch (err: any) {
      alert(`Gagal membuat user: ${err.message}`);
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleStartEdit = (user: UserProfile) => {
    setEditingUser(user);
    setEditName(user.full_name);
    setEditEmployeeId(user.employee_id || "");
    setEditRole(user.role);
    setEditIsActive(user.is_active);
  };

  const handleSaveUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: editName,
          employee_id: editEmployeeId,
          role: editRole,
          is_active: editIsActive,
        })
        .eq("id", editingUser.id);

      if (error) throw error;

      alert(`Data user ${editName} berhasil diperbarui!`);
      setEditingUser(null);
      fetchUserProfiles();
    } catch (err: any) {
      alert(`Gagal memperbarui user: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    const confirmDelete = confirm(
      `Apakah Anda yakin ingin menghapus permanen user "${userName}"?\nTindakan ini tidak dapat dibatalkan.`
    );

    if (!confirmDelete) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", userId);

      if (error) throw error;

      alert(`User "${userName}" berhasil dihapus dari sistem!`);
      fetchUserProfiles();
    } catch (err: any) {
      alert(`Gagal menghapus user: ${err.message}`);
    }
  };

  // Realtime Supabase Query RTG Status & Laporan Kerusakan
  const fetchRealtimeDashboardData = async () => {
    try {
      // 1. Ambil data status RTG dari Supabase
      const { data: statusData, error: statusError } = await supabase
        .from("rtg_statuses")
        .select("id, unit_code, status, block, last_updated")
        .order("unit_code", { ascending: true });

      if (statusError) throw statusError;

      // 2. Ambil data laporan rtg_reports beserta work_orders terkait
      const { data: reportData, error: reportError } = await supabase
        .from("rtg_reports")
        .select(`
          id,
          rtg_id,
          report_date,
          findings,
          verification_status,
          priority,
          created_at,
          rtg_statuses (
            unit_code,
            block
          ),
          profiles!pelapor_id (
            full_name
          ),
          work_orders (
            id,
            status,
            resolution_notes,
            profiles!technician_id (
              full_name
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (reportError) console.error("Report fetch error:", reportError.message);

      if (statusData) {
        // Gabungkan data status RTG dengan status laporan yang sedang aktif
        const mappedStatuses = statusData.map((unit) => {
          const activeReports = reportData?.filter(
            (r: any) => r.rtg_id === unit.id || r.rtg_statuses?.unit_code === unit.unit_code
          );

          // Cari laporan terbaru yang statusnya belum SELESAI / DONE / REJECTED
          const latestActive = activeReports?.find((r: any) => {
            const vStatus = r.verification_status?.toUpperCase();
            const wo = Array.isArray(r.work_orders) ? r.work_orders[0] : r.work_orders;
            const woStatus = wo?.status?.toUpperCase();

            return vStatus !== "REJECTED" && woStatus !== "DONE" && woStatus !== "COMPLETED";
          });

          return {
            ...unit,
            activeReport: latestActive || null,
          };
        });

        setRtgStatuses(mappedStatuses);
      }

      // Format daftar laporan untuk tabel dashboard
      if (reportData) {
        const formattedReports: Report[] = reportData.map((item: any) => {
          const dateObj = new Date(item.report_date || item.created_at);
          const tanggalStr = dateObj.toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          });
          const jamStr =
            dateObj.toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
            }) + " WIB";

          const wo = Array.isArray(item.work_orders) ? item.work_orders[0] : item.work_orders;
          const woStatus = wo?.status?.toUpperCase();
          const vStatus = item.verification_status?.toUpperCase();

          let statusTeks = "MENUNGGU VERIFIKASI MCC";
          if (vStatus === "APPROVED" || wo) {
            if (woStatus === "ON_PROGRESS" || woStatus === "IN_PROGRESS") {
              statusTeks = "SEDANG DIKERJAKAN";
            } else if (woStatus === "WAITING_PART") {
              statusTeks = "WAITING PART";
            } else if (woStatus === "DONE" || woStatus === "COMPLETED") {
              statusTeks = "SELESAI";
            } else {
              statusTeks = "MENUNGGU PENANGANAN";
            }
          } else if (vStatus === "REJECTED") {
            statusTeks = "DITOLAK MCC";
          }

          const findings = item.findings || "";
          let kategori = "Kendala Umum";
          const lower = findings.toLowerCase();
          if (lower.includes("twistlock") || lower.includes("spreader")) kategori = "Spreader & Twistlock";
          else if (lower.includes("hidrolik") || lower.includes("oli")) kategori = "Sistem Hidrolik";
          else if (lower.includes("hoist") || lower.includes("motor")) kategori = "Hoist & Motor";
          else if (lower.includes("listrik") || lower.includes("genset")) kategori = "Sistem Elektrikal / Genset";
          else if (lower.includes("ban") || lower.includes("gantry")) kategori = "Gantry & Ban";

          return {
            id: item.id,
            tanggal: tanggalStr,
            jam: jamStr,
            rtg: item.rtg_statuses?.unit_code || "RTG-XX",
            lokasi: item.rtg_statuses?.block || "BLOK AREA",
            pelapor: item.profiles?.full_name || "Supervisi Lapangan",
            praOperasi: findings,
            pascaOperasi: "-",
            kategori,
            prioritas: item.priority ? `P${item.priority}` : "P3",
            status: statusTeks,
            teknisi: wo?.profiles?.full_name || "Belum Ditugaskan",
          };
        });

        setReports(formattedReports);
      }
    } catch (err) {
      console.error("Fetch realtime error:", err);
    } finally {
      setRtgLoading(false);
    }
  };

  useEffect(() => {
    fetchRealtimeDashboardData();

    // Subscribe realtime listeners ke 3 tabel terkait
    const statusChannel = supabase
      .channel("dashboard_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "rtg_statuses" }, () => fetchRealtimeDashboardData())
      .on("postgres_changes", { event: "*", schema: "public", table: "rtg_reports" }, () => fetchRealtimeDashboardData())
      .on("postgres_changes", { event: "*", schema: "public", table: "work_orders" }, () => fetchRealtimeDashboardData())
      .subscribe();

    return () => {
      supabase.removeChannel(statusChannel);
    };
  }, [supabase]);

  // Modal Detail Tiket Tabel
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Filter Laporan
  const filteredReports = reports.filter((r) => {
    const matchesSearch =
      r.rtg.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.pelapor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.praOperasi.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.pascaOperasi.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesKategori =
      selectedKategoriFilter === "SEMUA" || r.kategori === selectedKategoriFilter;

    return matchesSearch && matchesKategori;
  });

  // PEMETAAN COLOR-CODING REALTIME UNTUK CARD RTG (Kuning, Biru, Ungu, Hijau)
  const rtgUnits = rtgStatuses.map((item) => {
    const rep = item.activeReport;
    const vStatus = rep?.verification_status?.toUpperCase();
    const wo = Array.isArray(rep?.work_orders) ? rep?.work_orders[0] : rep?.work_orders;
    const woStatus = wo?.status?.toUpperCase();

    let statusType: "NORMAL" | "PENDING_MCC" | "ON_PROGRESS" | "WAITING_PART" = "NORMAL";
    ariaLabel: "Status Unit RTG";

    if (rep) {
      if (vStatus === "PENDING") {
        statusType = "PENDING_MCC"; // KUNING
      } else if (woStatus === "ON_PROGRESS" || woStatus === "IN_PROGRESS" || woStatus === "ASSIGNED") {
        statusType = "ON_PROGRESS"; // BIRU
      } else if (woStatus === "WAITING_PART") {
        statusType = "WAITING_PART"; // UNGU
      }
    }

    let subText = "Tanpa laporan aktif";
    if (statusType === "PENDING_MCC") subText = "Menunggu Approval MCC";
    else if (statusType === "ON_PROGRESS") subText = "Sedang Dikerjakan";
    else if (statusType === "WAITING_PART") subText = "Waiting Parts / PM";

    const reportDetailObj: Report | null = rep
      ? {
          id: rep.id,
          tanggal: new Date(rep.created_at).toLocaleDateString("id-ID"),
          jam: new Date(rep.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB",
          rtg: item.unit_code,
          lokasi: item.block || "Yard Area",
          pelapor: rep.profiles?.full_name || "Operator Lapangan",
          praOperasi: rep.findings || "-",
          pascaOperasi: "-",
          kategori: "Kendala RTG",
          prioritas: rep.priority ? `P${rep.priority}` : "P3",
          status: subText,
          teknisi: wo?.profiles?.full_name || "Belum Ditugaskan",
        }
      : null;

    return {
      id: item.unit_code,
      status: statusType,
      prioritas: rep?.priority ? `P${rep.priority}` : "P3",
      sub: subText,
      block: item.block,
      lastUpdated: item.last_updated,
      reportDetails: reportDetailObj,
    };
  });

  const totalKuning = rtgUnits.filter((u) => u.status === "PENDING_MCC").length;
  const totalBiru = rtgUnits.filter((u) => u.status === "ON_PROGRESS").length;
  const totalUngu = rtgUnits.filter((u) => u.status === "WAITING_PART").length;
  const totalNormal = rtgUnits.filter((u) => u.status === "NORMAL").length;
  const totalPerbaikan = totalKuning + totalBiru + totalUngu;

  const handleCardClick = (unit: RTGCardItem) => {
    setSelectedRtgCard(unit);
    setShowRtgModal(true);
  };

  // Kalkulasi Data Grafik dengan Filter Bulan
  const rtgCounts: Record<string, number> = {};

  reports.forEach((r) => {
    const itemDate = new Date(r.tanggal);
    if (isNaN(itemDate.getTime())) return;

    const bulanItem = (itemDate.getMonth() + 1).toString().padStart(2, "0");
    const tahunItem = itemDate.getFullYear().toString();

    const matchesBulan = grafikFilterBulan === "SEMUA" || bulanItem === grafikFilterBulan;
    const matchesTahun = grafikFilterTahun === "SEMUA" || tahunItem === grafikFilterTahun;

    if (matchesBulan && matchesTahun) {
      rtgCounts[r.rtg] = (rtgCounts[r.rtg] || 0) + 1;
    }
  });

  // Urutkan unit secara natural (RTG 2 < RTG 10) supaya batang rapi berurutan
  const chartData = Object.keys(rtgCounts)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((key) => ({
      label: key,
      value: rtgCounts[key],
    }));

  // Skala sumbu Y: selalu kelipatan 4 supaya 5 garis tick (0..max) angkanya bulat
  const maxCount = Math.max(0, ...Object.values(rtgCounts));
  const yMax = Math.max(4, Math.ceil(maxCount / 4) * 4);
  const yTicks = [0, 1, 2, 3, 4].map((i) => (yMax / 4) * i);

  const exportToExcel = () => {
    if (reports.length === 0) {
      alert("Belum ada data laporan untuk diekspor!");
      return;
    }

    const excelData = reports.map((r, idx) => ({
      No: idx + 1,
      Tanggal: r.tanggal,
      Jam: r.jam,
      "Nomor RTG": r.rtg,
      Lokasi: r.lokasi,
      Pelapor: r.pelapor,
      Prioritas: r.prioritas || "MEDIUM P3",
      Kategori: r.kategori,
      "Temuan Kendala Alat": r.praOperasi !== "-" ? r.praOperasi : r.pascaOperasi,
      Status: r.status,
      "Nama PIC / Penanggung Jawab": r.teknisi?.trim() || "Belum Ditugaskan",
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const columnWidths = [6, 14, 12, 14, 16, 23, 18, 25, 45, 22, 31];
    worksheet["!cols"] = columnWidths.map((wch) => ({ wch }));

    const range = XLSX.utils.decode_range(worksheet["!ref"]!);

    for (let row = range.s.r; row <= range.e.r; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const address = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = worksheet[address];
        if (!cell) continue;

        const header = row === 0;

        cell.s = {
          font: {
            name: "Calibri",
            sz: header ? 11 : 10,
            bold: header,
            color: { rgb: header ? "FFFFFF" : "243447" },
          },
          fill: {
            fgColor: {
              rgb: header ? "0B3C3C" : row % 2 === 0 ? "F1F7F8" : "FFFFFF",
            },
          },
          alignment: {
            wrapText: true,
            vertical: header ? "center" : "top",
            horizontal: header || col === 0 ? "center" : "left",
          },
          border: {
            bottom: { style: "thin", color: { rgb: "DCE5E8" } },
          },
        };
      }
    }

    worksheet["!autofilter"] = { ref: worksheet["!ref"]! };

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Rekap Laporan RTG");
    XLSX.writeFile(
      workbook,
      `Rekap_Evaluasi_RTG_${new Date().toISOString().split("T")[0]}.xlsx`,
      { cellStyles: true }
    );
  };

  const clearData = async () => {
    if (confirm("Apakah Anda yakin ingin mengosongkan semua data laporan? Status RTG akan kembali READY.")) {
      setReports([]);

      try {
        const { error } = await supabase
          .from("rtg_statuses")
          .update({ status: "READY", last_updated: new Date().toISOString() })
          .neq("id", 0);

        if (error) {
          console.error("Gagal memperbarui status Supabase:", error.message);
        }
        fetchRealtimeDashboardData();
      } catch (err) {
        console.error("Database update error:", err);
      }
    }
  };

  if (profileLoading || !role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <p className="text-sm text-slate-500">Memeriksa hak akses...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans text-sm pb-10">
      {/* Header / Navbar */}
      <header className="bg-[#0b3c3c] text-white px-4 sm:px-8 py-3.5 sm:py-4 flex items-center justify-between shadow-md relative z-50">
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 text-slate-200 hover:text-white lg:hidden rounded-lg hover:bg-[#134e4e] transition cursor-pointer"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center">
            <img
              src="/images/logopelindo.webp"
              alt="Logo Pelindo"
              width={48}
              height={48}
              className="object-contain"
            />
          </div>
          <div>
            <h1 className="font-bold text-sm sm:text-lg leading-none tracking-tight">PELAPORAN RTG</h1>
            <p className="text-[9px] sm:text-[11px] text-emerald-200 mt-0.5 hidden sm:block">
              OPERASIONAL LAPANGAN TERMINAL PETIKEMAS SURABAYA
            </p>
          </div>
        </div>

        {/* Navigasi Desktop */}
        <nav className="hidden lg:flex items-center space-x-1 sm:space-x-2 bg-[#082e2e] p-1 sm:p-1.5 rounded-full text-[11px] sm:text-xs shadow-inner">
          {(role === "admin" || role === "operator") && (
            <Link
              href="/form-pelaporan"
              className={`px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-full transition font-semibold whitespace-nowrap ${
                pathname === "/form-pelaporan"
                  ? "bg-white text-[#0b3c3c] shadow"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              Form Pelaporan
            </Link>
          )}

          {(role === "admin" || role === "mcc") && (
            <Link
              href="/verifikasi-mcc"
              className={`px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-full transition font-semibold whitespace-nowrap ${
                pathname === "/verifikasi-mcc"
                  ? "bg-white text-[#0b3c3c] shadow"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              Approval MCC
            </Link>
          )}

          {(role === "admin" || role === "mcc" || role === "teknisi") && (
            <Link
              href="/dasboard"
              className={`px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-full transition font-semibold whitespace-nowrap ${
                pathname === "/dasboard"
                  ? "bg-white text-[#0b3c3c] shadow"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              Dashboard
            </Link>
          )}

          {(role === "admin" || role === "teknisi") && (
            <Link
              href="/penanganan-teknis"
              className={`px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-full transition font-semibold whitespace-nowrap ${
                pathname === "/penanganan-teknis"
                  ? "bg-white text-[#0b3c3c] shadow"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              Penanganan Teknisi
            </Link>
          )}

          {(role === "admin" || role === "mcc") && (
            <Link
              href="/audit-log"
              className={`px-5 py-2 rounded-full transition font-semibold ${
                pathname === "/audit-log"
                  ? "bg-white text-[#0b3c3c] shadow"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              Audit Log
            </Link>
          )}
        </nav>

        {/* Profile & Notif */}
        <div className="flex items-center space-x-2 sm:space-x-4 shrink-0">
          <div className="relative">
            <button
              onClick={() => {
                setShowNotif(!showNotif);
                setShowProfile(false);
                setMobileMenuOpen(false);
              }}
              className="p-2 sm:p-2.5 text-slate-200 hover:text-white rounded-full hover:bg-[#134e4e] transition relative"
            >
              <Bell size={18} />
              {reports.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>
              )}
            </button>

            {showNotif && (
              <div className="absolute right-0 mt-3 w-72 sm:w-80 bg-white text-slate-800 rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50">
                <div className="p-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                  <span className="font-bold text-xs text-slate-700">Notifikasi Kendala</span>
                  <span className="text-[10px] bg-red-100 text-red-600 font-semibold px-2 py-0.5 rounded-full">
                    {reports.length} Baru
                  </span>
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                  {reports.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">Tidak ada notifikasi baru</div>
                  ) : (
                    reports.slice(0, 4).map((item, idx) => (
                      <div key={idx} className="p-3 hover:bg-slate-50 transition text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-red-600">{item.rtg}</span>
                          <span className="text-[10px] text-slate-400">{item.jam}</span>
                        </div>
                        <p className="text-slate-600 text-[11px] line-clamp-2">
                          {item.praOperasi !== "-" ? item.praOperasi : item.pascaOperasi}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => {
                setShowProfile(!showProfile);
                setShowNotif(false);
                setMobileMenuOpen(false);
              }}
              className="flex items-center space-x-2 sm:space-x-3 bg-[#134e4e] hover:bg-[#185d5d] px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs transition border border-emerald-700/50 cursor-pointer"
            >
              <div className="p-1 bg-emerald-500 rounded-full text-white font-bold text-[10px] w-6 h-6 flex items-center justify-center">
                {currentUserProfile?.full_name?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <div className="text-left leading-tight hidden sm:block">
                <p className="font-semibold text-white text-xs">
                  {currentUserProfile?.full_name || "Memuat..."}
                </p>
                <p className="text-[10px] text-emerald-200">
                  Role: <span className="uppercase font-bold">{currentUserProfile?.role || role}</span>
                </p>
              </div>
            </button>

            {showProfile && (
              <div className="absolute right-0 mt-3 w-64 bg-white text-slate-800 rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50 p-4 space-y-3">
                <div className="flex items-center space-x-3 border-b border-slate-100 pb-3">
                  <div className="w-10 h-10 rounded-full bg-[#0b3c3c] text-white flex items-center justify-center font-bold text-sm">
                    {currentUserProfile?.full_name?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                  <div className="overflow-hidden">
                    <h4 className="font-bold text-xs text-slate-800 truncate">
                      {currentUserProfile?.full_name || "User Terminal"}
                    </h4>
                    <p className="text-[10px] text-slate-400 font-mono">
                      ID: {currentUserProfile?.employee_id || "-"}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Nama Lengkap:</span>
                    <span className="font-semibold text-slate-800 truncate max-w-[120px]">
                      {currentUserProfile?.full_name}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600">
                    <span>ID Pegawai:</span>
                    <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                      {currentUserProfile?.employee_id}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Role Akses:</span>
                    <span className="font-bold text-[#0b3c3c] uppercase bg-emerald-50 px-2 py-0.5 rounded text-[10px] border border-emerald-200">
                      {currentUserProfile?.role}
                    </span>
                  </div>
                </div>

                {role === "admin" && (
                  <button
                    onClick={handleOpenUserManagement}
                    className="w-full py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-[#0b3c3c] border border-emerald-200 rounded-lg text-xs font-bold flex items-center justify-center space-x-2 transition cursor-pointer"
                  >
                    <UserPlus size={14} className="text-[#0b3c3c]" />
                    <span>Kelola / Tambah User</span>
                  </button>
                )}

                <button
                  onClick={() => router.push("/")}
                  className="w-full mt-2 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition"
                >
                  <LogOut size={14} />
                  <span>Ganti Shift / Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>


      {/* DROPDOWN MENU MOBILE (MENU HAMBURGER) */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#082e2e] text-white px-4 py-3 space-y-2 border-b border-emerald-900/50 animate-in slide-in-from-top-2 duration-200 relative z-40">
          {(role === "admin" || role === "operator") && (
            <Link
              href="/form-pelaporan"
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-4 py-2.5 rounded-lg text-xs font-semibold transition ${
                pathname === "/form-pelaporan"
                  ? "bg-white text-[#0b3c3c] font-bold"
                  : "text-slate-200 hover:bg-[#134e4e]"
              }`}
            >
              Form Pelaporan
            </Link>
          )}

          {(role === "admin" || role === "mcc") && (
            <Link
              href="/verifikasi-mcc"
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-4 py-2.5 rounded-lg text-xs font-semibold transition ${
                pathname === "/verifikasi-mcc"
                  ? "bg-white text-[#0b3c3c] font-bold"
                  : "text-slate-200 hover:bg-[#134e4e]"
              }`}
            >
              Approval MCC
            </Link>
          )}

          {(role === "admin" || role === "mcc" || role === "teknisi") && (
            <Link
              href="/dasboard"
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-4 py-2.5 rounded-lg text-xs font-semibold transition ${
                pathname === "/dasboard"
                  ? "bg-white text-[#0b3c3c] font-bold"
                  : "text-slate-200 hover:bg-[#134e4e]"
              }`}
            >
              Dashboard
            </Link>
          )}

          {(role === "admin" || role === "teknisi") && (
            <Link
              href="/penanganan-teknis"
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-4 py-2.5 rounded-lg text-xs font-semibold transition ${
                pathname === "/penanganan-teknis"
                  ? "bg-white text-[#0b3c3c] font-bold"
                  : "text-slate-200 hover:bg-[#134e4e]"
              }`}
            >
              Penanganan Teknisi
            </Link>
          )}

          {(role === "admin" || role === "mcc") && (
            <Link
              href="/audit-log"
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-4 py-2.5 rounded-lg text-xs font-semibold transition ${
                pathname === "/audit-log"
                  ? "bg-white text-[#0b3c3c] font-bold"
                  : "text-slate-200 hover:bg-[#134e4e]"
              }`}
            >
              Audit Log
            </Link>
          )}
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 mt-4 sm:mt-6 space-y-4 sm:space-y-6">
        {/* Banner Utama */}
        <div className="bg-[#0f4c5c] text-white p-5 sm:p-6 rounded-xl relative overflow-hidden shadow-sm">
          <div className="inline-flex items-center space-x-2 bg-[#175d70] px-3 py-1 rounded-full text-[11px] sm:text-xs text-emerald-300 mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>LIVE MONITORING RTG • DERMAGA PETIKEMAS</span>
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold mb-1">Pelaporan Kendala Operasional</h2>
              <p className="text-slate-300 text-xs leading-relaxed max-w-2xl">
                Pemantauan status kondisi, kesiapan alat Rubber-Tired Gantry (RTG), dan tindak lanjut laporan kendala terminal secara real-time.
              </p>
            </div>
            <div className="flex space-x-2 w-full sm:w-auto">
              <button
                onClick={exportToExcel}
                className="flex-1 sm:flex-initial bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-2 rounded-lg font-medium text-xs flex items-center justify-center space-x-1.5 transition shadow cursor-pointer"
              >
                <Download size={15} />
                <span>Rekap Excel</span>
              </button>
              <button 
                onClick={() => router.push("/form-pelaporan")}
                className="flex-1 sm:flex-initial bg-[#0e5c75] hover:bg-[#0b485c] border border-emerald-400 text-white px-3.5 py-2 rounded-lg font-medium text-xs flex items-center justify-center space-x-1.5 transition shadow cursor-pointer whitespace-nowrap"
              >
                <Plus size={15} />
                <span>Buat Laporan</span>
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-start shadow-sm">
            <div>
              <p className="text-xs text-slate-500 font-medium">RTG Beroperasi Normal</p>
              <h3 className="text-2xl font-bold mt-1 text-slate-800">{totalNormal} <span className="text-xs font-normal text-slate-500">dari {rtgUnits.length} unit</span></h3>
              <p className="text-[11px] text-emerald-600 mt-2 font-medium">
                • {rtgUnits.length > 0 ? Math.round((totalNormal / rtgUnits.length) * 100) : 100}% Kesiapan Operasi
              </p>
            </div>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><CheckCircle2 size={20} /></div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-start shadow-sm">
            <div>
              <p className="text-xs text-slate-500 font-medium">RTG Perlu Perbaikan</p>
              <h3 className="text-2xl font-bold mt-1 text-amber-600">{totalPerbaikan} <span className="text-xs font-normal text-slate-500">unit</span></h3>
              <p className="text-[11px] text-slate-500 mt-2 font-medium">
                {totalPerbaikan > 0 ? `• ${totalPerbaikan} unit dalam penanganan` : "• Seluruh unit siap operasi"}
              </p>
            </div>
            <div className="p-2 bg-amber-50 text-amber-500 rounded-lg"><AlertOctagon size={20} /></div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 sm:col-span-2 md:col-span-1 flex justify-between items-start shadow-sm">
            <div>
              <p className="text-xs text-slate-500 font-medium">Laporan Hari Ini</p>
              <h3 className="text-2xl font-bold mt-1 text-slate-800">{reports.length} <span className="text-xs font-normal text-slate-500">laporan masuk</span></h3>
              <p className="text-[11px] text-blue-600 mt-2 font-medium">Shift A & Shift B Terhubung</p>
            </div>
            <div className="p-2 bg-blue-50 text-blue-500 rounded-lg"><FileText size={20} /></div>
          </div>
        </div>

        {/* STATUS UNIT RTG GRID REALTIME (Kuning, Biru, Ungu, Hijau) */}
        <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-800">Status Unit RTG (Layout Area Realtime)</h3>
              <p className="text-[11px] sm:text-xs text-slate-400">Pemetaan status unit secara live (Klik unit untuk rincian detail)</p>
            </div>

            {/* LEGENDARIS WARNA STATUS */}
            <div className="flex flex-wrap items-center gap-3 text-xs font-medium">
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span className="text-slate-600">Normal</span> 
                <span className="text-slate-400">({totalNormal})</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400"></span>
                <span className="text-slate-600">Verifikasi MCC</span> 
                <span className="text-slate-400">({totalKuning})</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                <span className="text-slate-600">Dikerjakan</span> 
                <span className="text-slate-400">({totalBiru})</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                <span className="text-slate-600">Waiting Parts</span> 
                <span className="text-slate-400">({totalUngu})</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5 sm:gap-3">
            {rtgUnits.map((item) => {
              // Tentukan style CSS berdasarkan statusnya
              let cardBg = "bg-emerald-50/50 border-slate-200 hover:border-emerald-500 text-slate-800";
              let badgeStyle = "bg-emerald-100 text-emerald-700";
              let badgeText = "NORMAL";

              if (item.status === "PENDING_MCC") {
                cardBg = "bg-yellow-100 border-yellow-300 text-yellow-900 hover:border-yellow-400 animate-pulse";
                badgeStyle = "bg-yellow-200 text-yellow-800 font-bold";
                badgeText = "VERIFIKASI MCC";
              } else if (item.status === "ON_PROGRESS") {
                cardBg = "bg-blue-100 border-blue-300 text-blue-900 hover:border-blue-400";
                badgeStyle = "bg-blue-200 text-blue-800 font-bold";
                badgeText = "DIKERJAKAN";
              } else if (item.status === "WAITING_PART") {
                cardBg = "bg-purple-100 border-purple-300 text-purple-900 hover:border-purple-400";
                badgeStyle = "bg-purple-200 text-purple-800 font-bold";
                badgeText = "WAITING PARTS";
              }

              return (
                <div 
                  key={item.id} 
                  onClick={() => handleCardClick(item)}
                  className={`p-2.5 sm:p-3 rounded-lg border transition cursor-pointer shadow-xs hover:shadow-md ${cardBg}`}
                >
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-xs sm:text-sm text-slate-800">{item.id}</span>
                    <span className={`text-[8px] sm:text-[9px] font-extrabold px-1.5 py-0.5 rounded ${badgeStyle}`}>
                      {badgeText}
                    </span>
                  </div>
                  <p className={`text-[9px] sm:text-[10px] mt-1.5 truncate font-medium ${
                    item.status !== "NORMAL" ? "font-semibold" : "text-slate-400"
                  }`}>
                    {item.sub}
                  </p>
                  {/* KODE COUNTING JUMLAH LAPORAN DI DALAM KOTAK UNIT */}
                  {item.status !== "NORMAL" && (
                    <div className="mt-2 pt-1.5 border-t border-black/10 flex justify-between items-center text-[9px]">
                      <span className="text-slate-600 font-medium">Kendala Aktif:</span>
                      <span className="font-extrabold bg-white/80 px-1.5 py-0.2 rounded text-red-600 shadow-2xs">
                        {reports.filter(r => r.rtg === item.id).length} Tiket
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* BOTTOM SECTION: GRAFIK & TABEL LAPORAN */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* 1. GRAFIK LAPORAN KENDALA */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5 mb-1">
                <h3 className="font-bold text-sm text-slate-800">Grafik Laporan Kendala</h3>

                {/* Control Filter Bulan & Tahun Grafik */}
                <div className="flex items-center space-x-1.5">
                  {/* Dropdown Bulan */}
                  <select
                    value={grafikFilterBulan}
                    onChange={(e) => setGrafikFilterBulan(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded px-2 py-0.5 text-[10px] font-semibold text-slate-600 focus:outline-none cursor-pointer"
                  >
                    <option value="SEMUA">Semua Bulan</option>
                    <option value="01">Januari</option>
                    <option value="02">Februari</option>
                    <option value="03">Maret</option>
                    <option value="04">April</option>
                    <option value="05">Mei</option>
                    <option value="06">Juni</option>
                    <option value="07">Juli</option>
                    <option value="08">Agustus</option>
                    <option value="09">September</option>
                    <option value="10">Oktober</option>
                    <option value="11">November</option>
                    <option value="12">Desember</option>
                  </select>

                  {/* Dropdown Tahun (Dinamis Otomatis) */}
                  <select
                    value={grafikFilterTahun}
                    onChange={(e) => setGrafikFilterTahun(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded px-2 py-0.5 text-[10px] font-semibold text-slate-600 focus:outline-none cursor-pointer"
                  >
                    <option value="SEMUA">Semua Tahun</option>
                    {availableYears.map((tahun) => (
                      <option key={tahun} value={tahun.toString()}>
                        {tahun}
                      </option>
                    ))}
                  </select>
                </div>
              </div> 
              <p className="text-xs text-slate-400 mb-3">Distribusi frekuensi laporan per unit RTG terkini</p>

              <div className="flex">
                {/* Label sumbu Y: posisi pakai persen yang SAMA dengan gridline */}
                <div className="relative h-48 w-7 shrink-0 mt-5">
                  {yTicks.map((t) => (
                    <span
                      key={t}
                      style={{ bottom: `${(t / yMax) * 100}%` }}
                      className="absolute right-2 translate-y-1/2 text-[10px] font-semibold leading-none text-slate-400"
                    >
                      {t}
                    </span>
                  ))}
                </div>

                {/* Area scroll horizontal (kalau unit RTG banyak) */}
                <div className="flex-1 min-w-0 overflow-x-auto">
                  <div className="min-w-full w-max pt-5">
                    {/* Plot area */}
                    <div className="relative h-48 border-l border-b border-slate-300">
                      {/* Gridline putus-putus */}
                      {yTicks.slice(1).map((t) => (
                        <div
                          key={t}
                          style={{ bottom: `${(t / yMax) * 100}%` }}
                          className="absolute left-0 right-0 border-t border-dashed border-slate-200"
                        />
                      ))}

                      {chartData.length === 0 ? (
                        <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-400">
                          Belum ada laporan kendala
                        </div>
                      ) : (
                        <div className="relative z-10 flex h-full items-end justify-around gap-4 px-3">
                          {chartData.map((bar) => (
                            <div
                              key={bar.label}
                              className="flex h-full w-12 shrink-0 items-end justify-center"
                            >
                              <div
                                style={{ height: `${(bar.value / yMax) * 100}%` }}
                                className="relative w-6 rounded-t bg-[#0e5c75] transition-all duration-300 hover:bg-emerald-500"
                              >
                                {/* Angka kasus nempel di atas batang */}
                                <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-700">
                                  {bar.value}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Label sumbu X: baris terpisah di bawah garis sumbu, lebar kolom sama dengan batang */}
                    {chartData.length > 0 && (
                      <div className="flex justify-around gap-4 px-3 pt-2">
                        {chartData.map((bar) => (
                          <span
                            key={bar.label}
                            className="w-12 shrink-0 truncate text-center text-[10px] font-bold text-slate-700"
                          >
                            {bar.label.includes("RTG") ? bar.label : `RTG ${bar.label}`}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-center text-[10px] font-bold text-slate-400 mt-3 mb-3">
                Unit RTG Crane (Sumbu X)
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-slate-700">Ringkasan Kategori Kendala</h4>
                  <span className="text-[10px] text-slate-400 italic">Scroll detail</span>
                </div>

                <div className="max-h-36 overflow-y-auto pr-1 space-y-1.5 text-xs">
                  {[
                    "Sistem Hidrolik",
                    "Spreader & Twistlock",
                    "Hoist & Motor",
                    "Sistem Elektrikal / Genset",
                    "Gantry & Ban"
                  ].map((kategoriName) => {
                    const totalKasus = reports.filter(r => r.kategori === kategoriName).length;
                    return (
                      <div 
                        key={kategoriName} 
                        className="flex justify-between items-center px-3 py-2 bg-slate-50 rounded-lg border border-slate-100 hover:bg-slate-100 transition"
                      >
                        <span className="text-slate-600 font-medium text-[11px]">{kategoriName}</span>
                        <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                          totalKasus > 0 ? "bg-teal-100 text-[#0e5c75]" : "bg-slate-200 text-slate-500"
                        }`}>
                          {totalKasus} Kasus
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center text-[11px] text-slate-500 pt-3 border-t border-slate-100 mt-3">
              <span>Total: {reports.length} Laporan</span>
              <span className="font-semibold text-slate-700">Terselesaikan: {reports.filter(r => r.status === 'SELESAI').length} Unit</span>
            </div>
          </div>

          {/* 2. TABEL LAPORAN KENDALA TERBARU */}
          <div className="lg:col-span-2 bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
                <h3 className="font-bold text-sm text-slate-800">Laporan Kendala Terbaru</h3>
                <div className="flex space-x-2 w-full sm:w-auto justify-between sm:justify-end">
                  <div className="relative flex-1 sm:flex-initial">
                    <Search className="absolute left-2.5 top-2 text-slate-400" size={14} />
                    <input 
                      type="text" 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Cari tiket RTG..." 
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs focus:outline-none" 
                    />
                  </div>
                  {reports.length > 0 && (
                    <button onClick={clearData} title="Reset Data Laporan" className="p-1.5 border border-slate-200 rounded-md text-red-500 hover:bg-red-50 cursor-pointer">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Filter Kategori */}
              <div className="flex items-center space-x-1.5 mb-3 overflow-x-auto pb-1.5 max-w-full">
                <span className="text-[11px] font-bold text-slate-400 mr-1 shrink-0">Filter:</span>
                {["SEMUA", "Sistem Hidrolik", "Spreader & Twistlock", "Hoist & Motor", "Sistem Elektrikal / Genset", "Gantry & Ban"].map((kat) => (
                  <button
                    key={kat}
                    onClick={() => setSelectedKategoriFilter(kat)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition whitespace-nowrap cursor-pointer shrink-0 ${
                      selectedKategoriFilter === kat
                        ? "bg-[#0b3c3c] text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {kat}
                  </button>
                ))}
              </div>

              {/* Tabel Data */}
              <div className="overflow-x-auto max-h-[380px] overflow-y-auto border border-slate-100 rounded-lg">
                <table className="w-full text-left text-xs relative min-w-[500px] sm:min-w-full">
                  <thead className="sticky top-0 bg-slate-100 text-slate-600 font-bold z-10 shadow-sm">
                    <tr>
                      <th className="py-2.5 px-3">TANGGAL</th>
                      <th className="py-2.5 px-3">RTG</th>
                      <th className="py-2.5 px-3">PRIORITAS</th>
                      <th className="py-2.5 px-3">TEMUAN KENDALA ALAT</th>
                      <th className="py-2.5 px-3">ST</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredReports.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                          Belum ada laporan kendala yang dikirim.
                        </td>
                      </tr>
                    ) : (
                      filteredReports.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50 transition">
                          <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                            {item.tanggal}<br />
                            <span className="text-[10px] text-slate-400">{item.jam}</span>
                          </td>
                          <td className="py-3 px-3 font-bold text-slate-800 whitespace-nowrap">
                            {item.rtg}<br />
                            <span className="font-normal text-[10px] text-slate-400">{item.lokasi}</span>
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                              item.prioritas?.includes("P1") 
                                ? "bg-red-600 text-white animate-pulse" 
                                : item.prioritas?.includes("P4") 
                                ? "bg-blue-100 text-blue-700" 
                                : "bg-amber-100 text-amber-700"
                            }`}>
                              {item.prioritas || "MEDIUM P3"}
                            </span>
                            <br />
                            <span className="text-[10px] text-slate-400">{item.kategori}</span>
                          </td>
                          <td className="py-3 px-3 text-red-600 bg-red-50/40 font-medium rounded-lg">
                            {item.praOperasi !== "-" ? item.praOperasi : item.pascaOperasi}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <button
                              onClick={() => {
                                setSelectedReport(item);
                                setShowDetailModal(true);
                              }}
                              className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-[#0e5c75] transition flex items-center space-x-1 cursor-pointer"
                              title="Lihat Detail Tiket (ST)"
                            >
                              <ChevronRight size={18} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-between items-center text-[11px] text-slate-400 pt-3 border-t border-slate-100 mt-3">
              <span>Menampilkan {filteredReports.length} tiket aktif terkini</span>
              <span className="hidden sm:inline">Scroll tabel ke bawah untuk memuat data lainnya</span>
            </div>
          </div>
        </div>
      </main>
    );

      {/* POP-UP MODAL REALTIME: KLIK CARD RTG */}
      {showRtgModal && selectedRtgCard && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg text-slate-900">{selectedRtgCard.id}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  selectedRtgCard.status === "PENDING_MCC"
                    ? "bg-yellow-100 text-yellow-800 border border-yellow-300"
                    : selectedRtgCard.status === "ON_PROGRESS"
                    ? "bg-blue-100 text-blue-800 border border-blue-300"
                    : selectedRtgCard.status === "WAITING_PART"
                    ? "bg-purple-100 text-purple-800 border border-purple-300"
                    : "bg-emerald-100 text-emerald-700 border border-emerald-300"
                }`}>
                  {selectedRtgCard.status === "PENDING_MCC"
                    ? "MENUNGGU VERIFIKASI MCC"
                    : selectedRtgCard.status === "ON_PROGRESS"
                    ? "SEDANG DIKERJAKAN"
                    : selectedRtgCard.status === "WAITING_PART"
                    ? "WAITING PARTS / PM"
                    : "READY / NORMAL"}
                </span>
              </div>
              <button
                onClick={() => setShowRtgModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {selectedRtgCard.status !== "NORMAL" ? (
              <div className="space-y-3 text-xs">
                <div className={`p-3 rounded-xl border flex items-start space-x-2.5 ${
                  selectedRtgCard.status === "PENDING_MCC"
                    ? "bg-yellow-50 border-yellow-200 text-yellow-900"
                    : selectedRtgCard.status === "ON_PROGRESS"
                    ? "bg-blue-50 border-blue-200 text-blue-900"
                    : "bg-purple-50 border-purple-200 text-purple-900"
                }`}>
                  {selectedRtgCard.status === "WAITING_PART" ? (
                    <Package size={20} className="text-purple-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertOctagon size={20} className="shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h4 className="font-bold text-xs">Unit Membutuhkan Pemeliharaan / Perbaikan</h4>
                    <p className="text-[11px] mt-0.5 leading-relaxed">
                      Laporan aktif terdeteksi untuk unit {selectedRtgCard.id}. Status terkini: <strong>{selectedRtgCard.sub}</strong>.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div>
                    <p className="text-slate-400">Lokasi Yard:</p>
                    <p className="font-bold text-slate-700 flex items-center space-x-1 mt-0.5">
                      <MapPin size={12} className="text-slate-400" />
                      <span>{selectedRtgCard.reportDetails?.lokasi || selectedRtgCard.block || "Blok Area"}</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400">Tingkat Prioritas:</p>
                    <span className="font-extrabold text-amber-700 bg-amber-100 px-2 py-0.5 rounded text-[10px] inline-block mt-0.5">
                      {selectedRtgCard.prioritas || "MEDIUM P3"}
                    </span>
                  </div>
                  <div>
                    <p className="text-slate-400">Kategori Kendala:</p>
                    <p className="font-bold text-slate-700 mt-0.5">{selectedRtgCard.reportDetails?.kategori || "Kendala Umum"}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Teknisi PJ:</p>
                    <p className="font-bold text-slate-700 mt-0.5">{selectedRtgCard.reportDetails?.teknisi || "Belum Ditugaskan"}</p>
                  </div>
                </div>

                <div>
                  <p className="font-bold text-slate-700 mb-1 flex items-center space-x-1">
                    <Wrench size={13} className="text-slate-500" />
                    <span>Rincian Temuan Kendala Alat:</span>
                  </p>
                  <p className="p-3 bg-red-50 text-red-700 border border-red-100 rounded-xl leading-relaxed text-xs">
                    {selectedRtgCard.reportDetails?.praOperasi || "Terdeteksi anomali kondisi alat."}
                  </p>
                </div>

                {selectedRtgCard.reportDetails?.pelapor && (
                  <div className="text-[11px] text-slate-500 flex justify-between items-center pt-1 px-1">
                    <span>Pelapor: <strong className="text-slate-700">{selectedRtgCard.reportDetails.pelapor}</strong></span>
                    <span>Waktu: <strong className="text-slate-700">{selectedRtgCard.reportDetails.jam}</strong></span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4 text-xs text-center py-2">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl mx-auto flex items-center justify-center border border-emerald-200">
                  <ShieldCheck size={28} className="text-emerald-600" />
                </div>

                <div>
                  <h4 className="font-bold text-sm text-slate-800">Unit RTG Siap Operasi (Ready)</h4>
                  <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                    Unit <strong className="text-slate-800">{selectedRtgCard.id}</strong> beroperasi secara normal tanpa adanya laporan kerusakan aktif di Container Yard.
                  </p>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-left text-xs space-y-1.5">
                  <div className="flex justify-between text-slate-600">
                    <span>Lokasi Yard:</span>
                    <span className="font-bold text-slate-800">{selectedRtgCard.block || "BLOK Standard"}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Kondisi Mesin & Ban:</span>
                    <span className="text-emerald-600 font-bold">100% Optimal</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Status TOS Terminal:</span>
                    <span className="text-emerald-600 font-bold">Terhubung</span>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
              <button
                onClick={() => setShowRtgModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-200 cursor-pointer transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETAIL TIKET TABEL (ST) */}
      {showDetailModal && selectedReport && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">
                  TIKET TKN-#{selectedReport.id.toString().slice(-4)}
                </span>
                <h3 className="text-base font-bold text-slate-800 mt-1">
                  Detail Status Laporan {selectedReport.rtg}
                </h3>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg">
                <div>
                  <p className="text-slate-400">Lokasi Yard:</p>
                  <p className="font-bold text-slate-700">{selectedReport.lokasi}</p>
                </div>
                <div>
                  <p className="text-slate-400">Waktu Pelaporan:</p>
                  <p className="font-bold text-slate-700">{selectedReport.tanggal} {selectedReport.jam}</p>
                </div>
                <div>
                  <p className="text-slate-400">Kategori Kendala:</p>
                  <p className="font-bold text-slate-700">{selectedReport.kategori}</p>
                </div>
                <div>
                  <p className="text-slate-400">Tingkat Prioritas:</p>
                  <p className="font-bold text-amber-600">{selectedReport.prioritas || "MEDIUM P3"}</p>
                </div>
              </div>

              <div>
                <p className="font-bold text-slate-700 mb-1">Rincian Temuan Kendala Alat:</p>
                <p className="p-2.5 bg-red-50 text-red-700 rounded-lg text-xs">
                  {selectedReport.praOperasi !== "-" ? selectedReport.praOperasi : selectedReport.pascaOperasi}
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-200 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL USER MANAGEMENT (RBAC) */}
      {showUserManagementModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-2.5">
                <div className="p-2.5 bg-emerald-50 text-[#0b3c3c] rounded-xl">
                  <Shield size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-800">Kelola User Role & Tambah User Baru</h3>
                  <p className="text-xs text-slate-400">Tambahkan akun baru dan kelompokkan pengguna berdasarkan Role Hak Akses.</p>
                </div>
              </div>
              <button
                onClick={() => setShowUserManagementModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                <UserPlus size={15} className="text-[#0b3c3c]" />
                <span>Form Pendaftaran Account Baru</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600">ID Pegawai (Employee ID) *</label>
                  <input
                    type="text"
                    value={newUserEmployeeId}
                    onChange={(e) => setNewUserEmployeeId(e.target.value.toUpperCase())}
                    placeholder="Contoh: ADM002 / OP002 / TEK002 / MCC002"
                    className="w-full mt-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold uppercase text-slate-700 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600">Nama Lengkap *</label>
                  <input
                    type="text"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="Contoh: Arya Wisnu"
                    className="w-full mt-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600">Email User *</label>
                  <input
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="user@pelindo.co.id"
                    className="w-full mt-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600">Password *</label>
                  <input
                    type="password"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full mt-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[11px] font-semibold text-slate-600">Role Hak Akses *</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as any)}
                    className="w-full mt-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="admin">ADMIN (Akses Penuh)</option>
                    <option value="operator">OPERATOR (Form Pelaporan)</option>
                    <option value="mcc">MCC (Approval Laporan)</option>
                    <option value="teknisi">TEKNISI (Penanganan Fisik)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={isCreatingUser}
                  className="px-4 py-2 bg-[#0b3c3c] hover:bg-[#134e4e] text-white font-semibold text-xs rounded-lg transition shadow flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Key size={14} />
                  <span>{isCreatingUser ? "Memproses..." : "Buat Akun User"}</span>
                </button>
              </div>
            </form>

            {editingUser && (
              <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-[110] flex items-center justify-center p-4">
                <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-2xl space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <h4 className="font-bold text-sm text-slate-800">Edit Data User</h4>
                    <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-600">
                      <X size={18} />
                    </button>
                  </div>

                  <form onSubmit={handleSaveUpdate} className="space-y-3 text-xs">
                    <div>
                      <label className="font-semibold text-slate-600">ID Pegawai (Employee ID)</label>
                      <input
                        type="text"
                        value={editEmployeeId}
                        onChange={(e) => setEditEmployeeId(e.target.value.toUpperCase())}
                        className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold uppercase focus:outline-none focus:border-emerald-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-slate-600">Nama Lengkap</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-slate-600">Role Akses</label>
                      <select
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value as any)}
                        className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-semibold focus:outline-none focus:border-emerald-500"
                      >
                        <option value="admin">ADMIN</option>
                        <option value="operator">OPERATOR</option>
                        <option value="mcc">MCC</option>
                        <option value="teknisi">TEKNISI</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-semibold text-slate-600">Status Akun</label>
                      <select
                        value={editIsActive ? "true" : "false"}
                        onChange={(e) => setEditIsActive(e.target.value === "true")}
                        className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-semibold focus:outline-none focus:border-emerald-500"
                      >
                        <option value="true">Aktif</option>
                        <option value="false">Non-Aktif (Nolkan Akses)</option>
                      </select>
                    </div>

                    <div className="flex justify-end space-x-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setEditingUser(null)}
                        className="px-3.5 py-1.5 bg-slate-100 text-slate-600 rounded-lg font-semibold"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        disabled={isUpdating}
                        className="px-4 py-1.5 bg-[#0b3c3c] text-white rounded-lg font-semibold hover:bg-[#134e4e] transition"
                      >
                        {isUpdating ? "Menyimpan..." : "Simpan Perubahan"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                  <Users size={15} className="text-slate-500" />
                  <span>Daftar Pengguna Terdaftar Berdasarkan Role</span>
                </h4>
                <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full">
                  Total: {userList.length} User
                </span>
              </div>

              <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl">
                {["admin", "operator", "mcc", "teknisi"].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setSelectedRoleTab(r)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold uppercase transition ${
                      selectedRoleTab === r
                        ? "bg-[#0b3c3c] text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {r} ({userList.filter((u) => u.role === r).length})
                  </button>
                ))}
              </div>

              <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
                {userList.filter((u) => u.role === selectedRoleTab).length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400 italic">
                    Belum ada user terdaftar dalam role {selectedRoleTab.toUpperCase()}.
                  </div>
                ) : (
                  userList
                    .filter((u) => u.role === selectedRoleTab)
                    .map((usr) => (
                      <div key={usr.id} className="p-3 flex justify-between items-center hover:bg-slate-50 text-xs">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs">
                            {usr.full_name?.charAt(0) || "U"}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <p className="font-bold text-slate-800">{usr.full_name}</p>
                              <span className="bg-slate-100 text-slate-600 font-mono text-[9px] px-1.5 py-0.2 rounded border border-slate-200">
                                {usr.employee_id || "NO-ID"}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400">Role: <span className="uppercase font-semibold">{usr.role}</span></p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            usr.is_active ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"
                          }`}>
                            {usr.is_active ? "Aktif" : "Non-Aktif"}
                          </span>
                          
                          {role === "admin" && (
                            <button
                              onClick={() => handleStartEdit(usr)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition cursor-pointer"
                            >
                              Edit
                            </button>
                          )}

                          {role === "admin" && !usr.is_active && (
                            <button
                              onClick={() => handleDeleteUser(usr.id, usr.full_name)}
                              className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition cursor-pointer"
                              title="Hapus Permanen User Non-Aktif"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowUserManagementModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-200 cursor-pointer"
              >
                Tutup Window
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 mt-6 flex flex-col sm:flex-row justify-between items-center text-[11px] text-slate-400 gap-2 text-center sm:text-left">
        <p>© 2026 Terminal Petikemas Surabaya - Sistem Operasional Rubber-Tired Gantry (RTG)</p>
        <div className="flex items-center space-x-3">
        </div>
      </footer>
    </div>
  );
}