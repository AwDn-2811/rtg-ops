"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createAuditLog } from "@/lib/auditLogger";
import {
  Bell,
  User,
  LogOut,
  RefreshCw,
  FileText,
  AlertOctagon,
  Ticket,
  Users,
  Search,
  CheckCircle2,
  X,
  Camera,
  Check,
  Edit3,
  Film,
  Menu,
} from "lucide-react";

interface MediaItem {
  type: string;
  url: string;
  name: string;
}

interface Report {
  id: string;
  rtg_id?: number;
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
  teknisiId?: string;
  waktuMulai?: string;
  waktuSelesai?: string;
  fotoBukti?: string[];
  lampiranMedia?: MediaItem[];
  ticketId?: string;
}

interface TechnicianProfile {
  id: string;
  full_name: string;
  employee_id?: string;
}

export default function ApprovalMCCPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [reports, setReports] = useState<Report[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBlokFilter, setSelectedBlokFilter] = useState("SEMUA");
  const [selectedUrgensiFilter, setSelectedUrgensiFilter] = useState("SEMUA");
  const [selectedTimFilter, setSelectedTimFilter] = useState("SEMUA");

  // State Hamburger Menu Mobile
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Supabase Client
  const supabase = createClient();
  const [role, setRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // State menampung profil pengguna yang sedang login dari Supabase
  const [currentUserProfile, setCurrentUserProfile] = useState<{
    full_name: string;
    employee_id: string;
    role: string;
  } | null>(null);

  const [showNotif, setShowNotif] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [alasanPenolakan, setAlasanPenolakan] = useState("");
  const [selectedPriority, setSelectedPriority] = useState("");
  const [daftarTeknisi, setDaftarTeknisi] = useState<TechnicianProfile[]>([]);
  const [selectedTeknisiId, setSelectedTeknisiId] = useState("");

  // Cek Hak Akses User
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

        if (profileError || !profile || !profile.is_active) {
          await supabase.auth.signOut();
          router.replace("/");
          return;
        }

        const allowedRoles = ["admin", "mcc"];
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
        console.error("Gagal memeriksa akses:", error);
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

  // Fetch List Teknisi Aktif
  useEffect(() => {
    async function fetchActiveTechnicians() {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, employee_id")
        .eq("role", "teknisi")
        .eq("is_on_duty", true)
        .eq("is_active", true)
        .order("full_name", { ascending: true });

      if (!error && data) {
        setDaftarTeknisi(data);
      }
    }

    fetchActiveTechnicians();
  }, [supabase]);

  // Fetch Laporan Kendala (Include Media Lampiran)
  const loadData = async () => {
    try {
      const { data, error } = await supabase
        .from("rtg_reports")
        .select(`
          id,
          rtg_id,
          report_date,
          findings,
          verification_status,
          priority,
          evidence_url,
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
            technician_id,
            execution_date,
            solving_date,
            profiles!technician_id (
              full_name
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Gagal mengambil rtg_reports:", error.message);
        return;
      }

      if (data) {
        const formatted: Report[] = data.map((item: any) => {
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

          const pelaporObj = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
          const namaPelapor = pelaporObj?.full_name || "Supervisi Lapangan";

          const woList = Array.isArray(item.work_orders)
            ? item.work_orders
            : item.work_orders
            ? [item.work_orders]
            : [];
          const activeWO = woList.length > 0 ? woList[0] : null;

          const teknisiObj = activeWO?.profiles;
          const namaTeknisi = Array.isArray(teknisiObj) ? teknisiObj[0]?.full_name : teknisiObj?.full_name;

          let uiStatus = "MENUNGGU VERIFIKASI MCC";
          const dbStatus = item.verification_status?.toUpperCase();
          const woStatus = activeWO?.status?.toUpperCase();

          if (dbStatus === "APPROVED" || activeWO) {
            // Pemetaan dinamis mengikuti status Work Order dari Teknisi
            if (woStatus === "ON_PROGRESS" || woStatus === "IN_PROGRESS") {
              uiStatus = "SEDANG DIKERJAKAN";
            } else if (woStatus === "WAITING_PART" || woStatus === "WAITING PART") {
              uiStatus = "WAITING PART / PM";
            } else if (woStatus === "COMPLETED" || woStatus === "SELESAI" || woStatus === "DONE") {
              uiStatus = "SELESAI";
            } else {
              uiStatus = "MENUNGGU PENANGANAN";
            }
          } else if (dbStatus === "REJECTED" || dbStatus === "DITOLAK") {
            uiStatus = "DITOLAK MCC";
          }

          const temuanTeks = item.findings || "";
          let kat = "Kendala Umum";
          const lowerFindings = temuanTeks.toLowerCase();
          if (lowerFindings.includes("twistlock") || lowerFindings.includes("spreader")) {
            kat = "Spreader & Twistlock";
          } else if (lowerFindings.includes("hidrolik") || lowerFindings.includes("oli") || lowerFindings.includes("bocor")) {
            kat = "Sistem Hidrolik";
          } else if (lowerFindings.includes("hoist") || lowerFindings.includes("motor") || lowerFindings.includes("wire")) {
            kat = "Hoist & Motor";
          } else if (lowerFindings.includes("listrik") || lowerFindings.includes("genset") || lowerFindings.includes("power")) {
            kat = "Sistem Elektrikal / Genset";
          } else if (lowerFindings.includes("ban") || lowerFindings.includes("gantry") || lowerFindings.includes("wheel")) {
            kat = "Gantry & Ban";
          }

          let formattedPriority = "";
          if (item.priority !== null && item.priority !== undefined) {
            const rawP = String(item.priority).trim();
            if (rawP === "1" || rawP === "P1") formattedPriority = "P1";
            else if (rawP === "2" || rawP === "P2") formattedPriority = "P2";
            else if (rawP === "3" || rawP === "P3") formattedPriority = "P3";
            else formattedPriority = `P${rawP}`;
          }

          let mediaList: MediaItem[] = [];
          if (item.evidence_url) {
            let urls: string[] = [];
            if (Array.isArray(item.evidence_url)) {
              urls = item.evidence_url.filter((u: any) => typeof u === "string" && u.trim() !== "");
            } else if (typeof item.evidence_url === "string" && item.evidence_url.trim() !== "") {
              try {
                const parsed = JSON.parse(item.evidence_url);
                urls = Array.isArray(parsed) ? parsed : [item.evidence_url];
              } catch {
                urls = [item.evidence_url];
              }
            }

            mediaList = urls.map((url: string, index: number) => ({
              type: url.match(/\.(mp4|webm|mov|avi)$/i) ? "video" : "image",
              url,
              name: `Lampiran Berkas #${index + 1}`,
            }));
          }

          return {
            id: item.id,
            rtg_id: item.rtg_id,
            tanggal: tanggalStr,
            jam: jamStr,
            rtg: item.rtg_statuses?.unit_code || "RTG-XX",
            lokasi: item.rtg_statuses?.block || "BLOK AREA",
            pelapor: namaPelapor,
            praOperasi: temuanTeks || "-",
            pascaOperasi: "-",
            kategori: kat,
            prioritas: formattedPriority,
            status: uiStatus,
            teknisi: namaTeknisi || "Belum Ditugaskan",
            teknisiId: activeWO?.technician_id,
            ticketId: activeWO ? `WO-${activeWO.id.slice(0, 8).toUpperCase()}` : undefined,
            lampiranMedia: mediaList,
            waktuMulai: activeWO?.execution_date
              ? new Date(activeWO.execution_date).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB"
              : undefined,
            waktuSelesai: activeWO?.solving_date
              ? new Date(activeWO.solving_date).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB"
              : undefined,
          };
        });

        setReports(formatted);
      }
    } catch (err) {
      console.error("Error loading MCC verification data:", err);
    }
  };

  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel("mcc_reports_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "rtg_reports" }, () => loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "work_orders" }, () => loadData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const handleResetFilter = () => {
    setSearchTerm("");
    setSelectedBlokFilter("SEMUA");
    setSelectedUrgensiFilter("SEMUA");
    setSelectedTimFilter("SEMUA");
  };

  const filteredReports = reports.filter((r) => {
    const matchesSearch =
      r.rtg.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.lokasi.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.kategori.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.teknisi && r.teknisi.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesBlok =
      selectedBlokFilter === "SEMUA" ||
      r.lokasi.toUpperCase().includes(`BLOK ${selectedBlokFilter}`);

    const matchesUrgensi =
      selectedUrgensiFilter === "SEMUA" ||
      (r.prioritas && r.prioritas.toUpperCase().includes(selectedUrgensiFilter));

    const matchesTim =
      selectedTimFilter === "SEMUA" ||
      r.kategori.toLowerCase().includes(selectedTimFilter.toLowerCase());

    return matchesSearch && matchesBlok && matchesUrgensi && matchesTim;
  });

  const tiketMenunggu = filteredReports.filter(
    (r) => r.status === "MENUNGGU VERIFIKASI MCC"
  );
  
  const tiketDikerjakan = filteredReports.filter(
    (r) =>
      r.status === "MENUNGGU PENANGANAN" ||
      r.status === "SEDANG DIKERJAKAN" ||
      r.status === "WAITING PART / PM" ||
      r.status === "APPROVED"
  );

  const tiketSelesai = filteredReports.filter(
    (r) => r.status === "DITOLAK MCC" || r.status === "SELESAI"
  );

  const butuhTindakanCepat = reports.filter(
    (r) =>
      r.status === "MENUNGGU VERIFIKASI MCC" &&
      (r.prioritas?.includes("P1") || r.prioritas?.includes("1"))
  ).length;

  const totalTeknisiOnDuty = new Set(
    reports
      .filter((r) => (r.status === "MENUNGGU PENANGANAN" || r.status === "SEDANG DIKERJAKAN") && r.teknisi && r.teknisi !== "Belum Ditugaskan")
      .map((r) => r.teknisi)
  ).size;

  // HANDLER APPROVE DENGAN STRUKTUR DIBENARKAN
  const handleApproveReport = async (reportId: string, priority: string, technicianId: string) => {
    const prioStr = priority || selectedPriority;

    if (!priority) {
      alert("Pilih prioritas laporan terlebih dahulu.");
      return;
    }

    if (!technicianId) {
      alert("Pilih teknisi yang ditugaskan.");
      return;
    }

    if (!currentUserId) {
      alert("Sesi login MCC tidak valid. Harap muat ulang halaman.");
      return;
    }

    let priorityNum = 3;
    if (prioStr.includes("1")) priorityNum = 1;
    else if (prioStr.includes("2")) priorityNum = 2;
    else if (prioStr.includes("3")) priorityNum = 3;

    try {
      console.log("Mengirim Update Priority ke Supabase:", { reportId, priorityNum, currentUserId });

      // 1. UPDATE TABEL rtg_reports
      const { data: updateData, error: updateReportError } = await supabase
        .from("rtg_reports")
        .update({
          verification_status: "APPROVED",
          priority: priorityNum,
          mcc_id: currentUserId,
          verified_at: new Date().toISOString(),
        })
        .eq("id", reportId)
        .select();

      if (updateReportError) {
        console.error("Error Update rtg_reports:", updateReportError);
        alert("Gagal update rtg_reports di Supabase: " + updateReportError.message);
        return;
      }

      console.log("Hasil Update rtg_reports:", updateData);

    // 2. CEK DAN UPSERT WORK ORDER
      const { data: existingWO } = await supabase
        .from("work_orders")
        .select("id")
        .eq("report_id", reportId)
        .maybeSingle();

      if (existingWO) {
        const { error: woUpdateError } = await supabase
          .from("work_orders")
          .update({
            technician_id: technicianId,
            assigned_by: currentUserId, // <-- TAMBAHKAN BARIS INI
            status: "ASSIGNED",
          })
          .eq("id", existingWO.id);

        if (woUpdateError) {
          alert("Gagal memperbarui Work Order: " + woUpdateError.message);
          return;
        }
      } else {
        const { error: woInsertError } = await supabase
          .from("work_orders")
          .insert({
            report_id: reportId,
            technician_id: technicianId,
            assigned_by: currentUserId, // <-- TAMBAHKAN BARIS INI (PENYEBAB ERROR)
            status: "ASSIGNED",
          });

        if (woInsertError) {
          alert("Gagal membuat Work Order: " + woInsertError.message);
          return;
        }
      }

          await createAuditLog({
        userId: currentUserId,
        userName: "Operator MCC",
        userRole: role,
        action: "MCC_APPROVE",
        description: `MCC meluluskan laporan unit ${selectedReport?.rtg} dengan Prioriti P${priorityNum} dan menugaskan teknisi.`,
        targetId: reportId,
      });

      // 3. UPDATE STATUS UNIT RTG
      if (selectedReport?.rtg_id) {
        await supabase
          .from("rtg_statuses")
          .update({
            status: "NEED_REPAIR",
            last_updated: new Date().toISOString(),
          })
          .eq("id", selectedReport.rtg_id);
      }

      alert(`Tiket Berhasil Dibuat! Priority diset ke ${priorityNum} dan teknisi segera ditugaskan.`);
      setSelectedReport(null);
      setShowDetailModal(false);
      setAlasanPenolakan("");
      setSelectedPriority("");
      setSelectedTeknisiId("");
      
      // Refresh Data UI
      await loadData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error("Error approving report:", err);
      alert("Terjadi kesalahan sistem: " + errorMessage);
    }
  };

  // Handler Reject
  const handleRejectReport = async (reportId: string) => {
    if (!alasanPenolakan.trim()) {
      alert("Masukkan alasan penolakan laporan pada kolom catatan.");
      return;
    }

    try {
      const { error } = await supabase
        .from("rtg_reports")
        .update({
          verification_status: "REJECTED",
          mcc_id: currentUserId,
          verified_at: new Date().toISOString(),
        })
        .eq("id", reportId);

      if (error) {
        alert("Gagal menolak laporan: " + error.message);
        return;
      }

      alert("Laporan berhasil ditolak.");
      setSelectedReport(null);
      setShowDetailModal(false);
      setAlasanPenolakan("");
      await loadData();
    } catch (err) {
      console.error("Error rejecting report:", err);
    }
  };

  if (profileLoading || !role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <p className="text-xs text-slate-500">Memeriksa hak akses...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans text-xs pb-10">
      {/* Header / Navbar Responsif */}
      <header className="bg-[#0b3c3c] text-white px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-md relative z-50">
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Tombol Hamburger khusus Layar HP (lg:hidden) */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 text-slate-200 hover:text-white lg:hidden rounded-lg hover:bg-[#134e4e] transition cursor-pointer"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center shrink-0">
            <img
              src="/images/logopelindo.webp"
              alt="Logo Pelindo"
              width={48}
              height={48}
              className="object-contain"
            />
          </div>
          <div>
            <h1 className="font-bold text-sm sm:text-base leading-none tracking-tight flex items-center space-x-1.5">
              <span>PELAPORAN RTG</span>
              <span className="bg-emerald-500/30 text-emerald-200 text-[8px] sm:text-[9px] font-medium px-1.5 py-0.5 rounded border border-emerald-400/30">
                TOS LIVE
              </span>
            </h1>
            <p className="text-[9px] sm:text-[10px] text-emerald-200 mt-0.5 hidden sm:block">
              OPERASIONAL LAPANGAN TERMINAL PETIKEMAS SURABAYA
            </p>
          </div>
        </div>

        {/* Navigasi Desktop */}
        <nav className="hidden lg:flex items-center space-x-2 bg-[#082e2e] p-1.5 rounded-full text-xs shadow-inner">
          {(role === "admin" || role === "operator") && (
            <Link href="/form-pelaporan" className={`px-5 py-2 rounded-full transition font-semibold ${pathname === "/form-pelaporan" ? "bg-white text-[#0b3c3c] shadow" : "text-slate-300 hover:text-white"}`}>Form Pelaporan</Link>
          )}
          {(role === "admin" || role === "mcc") && (
            <Link href="/verifikasi-mcc" className={`px-5 py-2 rounded-full transition font-semibold ${pathname === "/verifikasi-mcc" ? "bg-white text-[#0b3c3c] shadow" : "text-slate-300 hover:text-white"}`}>Approval MCC</Link>
          )}
          <Link href="/dasboard" className={`px-5 py-2 rounded-full transition font-semibold ${pathname === "/dasboard" ? "bg-white text-[#0b3c3c] shadow" : "text-slate-300 hover:text-white"}`}>Dashboard</Link>
          {(role === "admin" || role === "teknisi") && (
            <Link href="/penanganan-teknis" className={`px-5 py-2 rounded-full transition font-semibold ${pathname === "/penanganan-teknis" ? "bg-white text-[#0b3c3c] shadow" : "text-slate-300 hover:text-white"}`}>Penanganan Teknisi</Link>
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

        {/* Notifikasi & Profile Pop-up */}
        <div className="flex items-center space-x-2 sm:space-x-4 shrink-0">
          <div className="relative">
            <button
              onClick={() => {
                setShowNotif(!showNotif);
                setShowProfile(false);
                setMobileMenuOpen(false);
              }}
              className="p-2 text-slate-200 hover:text-white rounded-full hover:bg-[#134e4e] transition relative cursor-pointer"
            >
              <Bell size={18} />
              {reports.length > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
            </button>
            {showNotif && (
              <div className="absolute right-0 mt-3 w-72 sm:w-80 bg-white text-slate-800 rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50">
                <div className="p-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                  <span className="font-bold text-xs text-slate-700">Notifikasi Kendala</span>
                  <span className="text-[10px] bg-red-100 text-red-600 font-semibold px-2 py-0.5 rounded-full">{reports.length} Baru</span>
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
                        <p className="text-slate-600 text-[11px] line-clamp-2">{item.praOperasi}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Profile Pop-up */}
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

                <button
                  onClick={() => router.push("/")}
                  className="w-full mt-2 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition cursor-pointer"
                >
                  <LogOut size={14} />
                  <span>Ganti Shift / Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* DROPDOWN NAVIGASI HAMBURGER MENU (KHUSUS MOBILE) */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#082e2e] text-white px-4 py-3 border-b border-emerald-800/40 space-y-2 shadow-lg animate-in slide-in-from-top duration-200">
          {(role === "admin" || role === "operator") && (
            <Link
              href="/form-pelaporan"
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-4 py-2.5 rounded-lg text-xs font-semibold transition ${
                pathname === "/form-pelaporan"
                  ? "bg-white text-[#0b3c3c]"
                  : "text-slate-200 hover:bg-[#104848]"
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
                  ? "bg-white text-[#0b3c3c]"
                  : "text-slate-200 hover:bg-[#104848]"
              }`}
            >
              Approval MCC
            </Link>
          )}

          <Link
            href="/dasboard"
            onClick={() => setMobileMenuOpen(false)}
            className={`block px-4 py-2.5 rounded-lg text-xs font-semibold transition ${
              pathname === "/dasboard"
                ? "bg-white text-[#0b3c3c]"
                : "text-slate-200 hover:bg-[#104848]"
            }`}
          >
            Dashboard
          </Link>

          {(role === "admin" || role === "teknisi") && (
            <Link
              href="/penanganan-teknis"
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-4 py-2.5 rounded-lg text-xs font-semibold transition ${
                pathname === "/penanganan-teknis"
                  ? "bg-white text-[#0b3c3c]"
                  : "text-slate-200 hover:bg-[#104848]"
              }`}
            >
              Penanganan Teknisi
            </Link>
          )}
        </div>
      )}

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 mt-4 sm:mt-6 space-y-4 sm:space-y-5">

        {/* Title & Action Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                Approval Laporan Kendala RTG oleh MCC
              </h2>
              <span className="bg-emerald-100 text-emerald-800 text-[9px] sm:text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>LIVE TOS SYNC</span>
              </span>
            </div>
            <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">
              Daftar laporan kendala RTG yang menunggu verifikasi MCC. Laporan yang disetujui akan
              otomatis dibuatkan ticket untuk diteruskan ke teknisi.
            </p>
          </div>

          <div className="flex items-center space-x-2.5 self-start md:self-auto">
            <button
              onClick={loadData}
              className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 px-3.5 py-2 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition shadow-sm cursor-pointer"
            >
              <RefreshCw size={14} />
              <span>Refresh Data</span>
            </button>
          </div>
        </div>

        {/* Cards Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-start shadow-sm">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">LAPORAN MENUNGGU MCC</p>
              <h3 className="text-2xl font-extrabold mt-1 text-slate-800">{tiketMenunggu.length} <span className="text-xs font-normal text-slate-500">Laporan</span></h3>
            </div>
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl"><FileText size={20} /></div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-start shadow-sm border-l-4 border-l-red-500">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">LAPORAN PRIORITAS TINGGI</p>
              <h3 className="text-2xl font-extrabold mt-1 text-red-600">{butuhTindakanCepat} <span className="text-xs font-normal text-slate-500">(Unit)</span></h3>
            </div>
            <div className="p-2.5 bg-red-50 text-red-500 rounded-xl"><AlertOctagon size={20} /></div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-start shadow-sm">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">TIKET DIBUAT</p>
              <h3 className="text-2xl font-extrabold mt-1 text-slate-800">{reports.filter((r) => !!r.ticketId).length} <span className="text-xs font-normal text-slate-500">Ticket</span></h3>
            </div>
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl"><Ticket size={20} /></div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-start shadow-sm">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">LAPORAN DIPROSES</p>
              <h3 className="text-2xl font-extrabold mt-1 text-slate-800">{totalTeknisiOnDuty} <span className="text-xs font-normal text-slate-500">Personel Aktif</span></h3>
            </div>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl"><Users size={20} /></div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 justify-between items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Cari laporan, nomor RTG, atau pelapor..." className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500" />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <select value={selectedBlokFilter} onChange={(e) => setSelectedBlokFilter(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none cursor-pointer">
              <option value="SEMUA">Semua Blok (A, B, C, D, E)</option>
              <option value="A">Blok A</option>
              <option value="B">Blok B</option>
              <option value="C">Blok C</option>
              <option value="D">Blok D</option>
              <option value="E">Blok E</option>
            </select>

            <select value={selectedUrgensiFilter} onChange={(e) => setSelectedUrgensiFilter(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none cursor-pointer">
              <option value="SEMUA">Tingkat Urgensi: Semua</option>
              <option value="P1">Priority 1 (P1)</option>
              <option value="P2">Priority 2 (P2)</option>
              <option value="P3">Priority 3 (P3)</option>
            </select>

            <select value={selectedTimFilter} onChange={(e) => setSelectedTimFilter(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none cursor-pointer">
              <option value="SEMUA">Semua Kategori Kendala</option>
              <option value="Hidrolik">Tim Hidrolik</option>
              <option value="Spreader">Tim Spreader</option>
              <option value="Mekanikal">Tim Mekanikal</option>
              <option value="Elektrikal">Tim Elektrikal/Genset</option>
            </select>

            <button onClick={handleResetFilter} className="text-slate-500 hover:text-slate-800 text-xs font-semibold px-2 py-1 transition cursor-pointer">Reset</button>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Kolom 1 */}
          <div className="bg-slate-200/50 p-4 rounded-xl border border-slate-200 flex flex-col h-[450px] min-h-0">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">MENUNGGU VERIFIKASI MCC</h3>
                <span className="bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded-full text-[11px]">{tiketMenunggu.length}</span>
              </div>
            </div>

            <div className="space-y-3.5 flex-1 min-h-0 overflow-y-auto pr-2 flex flex-col">
              {tiketMenunggu.length === 0 ? (
                <div className="bg-white/80 rounded-xl p-6 sm:p-8 text-center text-xs text-slate-400 border border-dashed border-slate-300 my-auto flex flex-col items-center justify-center">
                  <FileText className="mb-2 text-slate-300" size={28} />
                  <span>Belum ada laporan yang menunggu verifikasi MCC.</span>
                </div>
              ) : (
                tiketMenunggu.map((item) => (
                  <div key={item.id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 space-y-2.5">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-100 text-amber-800">{item.prioritas || "P3"}</span>
                      <span className="text-[11px] text-slate-400 font-medium">{item.jam}</span>
                    </div>
                    <div>
                      <div className="flex items-baseline space-x-2">
                        <span className="font-extrabold text-sm text-slate-900">{item.rtg}</span>
                        <span className="font-bold text-xs text-slate-800">{item.kategori}</span>
                      </div>
                      <p className="text-slate-500 text-[11px] mt-1 line-clamp-2 leading-relaxed">{item.praOperasi}</p>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                      <span className="text-[10px] text-slate-500 font-semibold">📍 {item.lokasi}</span>
                      <button onClick={() => { setSelectedReport(item); setSelectedPriority(item.prioritas || "P3"); setSelectedTeknisiId(item.teknisiId || ""); setAlasanPenolakan(""); setShowDetailModal(true); }} className="px-3.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition cursor-pointer">
                        Verifikasi
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Kolom 2 */}
          <div className="bg-slate-200/50 p-4 rounded-xl border border-slate-200 flex flex-col h-[450px] min-h-0">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">TIKET DITERUSKAN</h3>
                <span className="bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full text-[11px]">{tiketDikerjakan.length}</span>
              </div>
            </div>
            <div className="space-y-3.5 flex-1 min-h-0 overflow-y-auto pr-2 flex flex-col">
              {tiketDikerjakan.length === 0 ? (
                <div className="bg-white/80 rounded-xl p-6 sm:p-8 text-center text-xs text-slate-400 border border-dashed border-slate-300 my-auto flex flex-col items-center justify-center">
                  <span>Tidak ada unit sedang dikerjakan.</span>
                </div>
              ) : (
                tiketDikerjakan.map((item) => (
                  <div key={item.id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 space-y-3">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-black px-2 py-0.5 rounded bg-blue-100 text-blue-800">{item.prioritas || "P3"} AKTIF</span>
                      <div className="text-right">
                        <span className="text-[11px] text-slate-500 font-medium">⏱ {item.jam}</span>
                        <div className="bg-blue-100 text-blue-800 font-bold text-[10px] px-2 py-0.5 rounded mt-1">{item.lokasi}</div>
                      </div>
                    </div>
                    <div>
                      <span className="font-extrabold text-sm text-slate-900 block">{item.rtg}</span>
                      <h4 className="font-bold text-xs text-slate-800 mt-0.5">{item.kategori}</h4>
                      <p className="text-slate-500 text-[11px] mt-1 line-clamp-2">{item.praOperasi}</p>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-1 text-[11px]">
                      <div className="flex justify-between text-slate-600"><span>TEKNISI BERTUGAS</span></div>
                      <div className="font-bold text-slate-800"><span>{item.teknisi || "Belum Ditugaskan"}</span></div>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <button onClick={() => { setSelectedReport(item); setSelectedPriority(item.prioritas || "P3"); setShowDetailModal(true); }} className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold transition flex items-center space-x-1 cursor-pointer">
                        <Edit3 size={13} /><span>Lihat Detail</span>
                      </button>
                      <span className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center space-x-1">
                        <CheckCircle2 size={13} /><span>{item.ticketId || "WO-ACTIVE"}</span>
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Kolom 3 */}
          <div className="bg-slate-200/50 p-4 rounded-xl border border-slate-200 flex flex-col h-[450px] min-h-0">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">DITOLAK / SELESAI / DITERUSKAN KE PIHAK TERKAIT</h3>
                <span className="bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full text-[11px]">{tiketSelesai.length}</span>
              </div>
            </div>

            <div className="space-y-3.5 flex-1 min-h-0 overflow-y-auto pr-2 flex flex-col">
              {tiketSelesai.length === 0 ? (
                <div className="bg-white/80 rounded-xl p-6 sm:p-8 text-center text-xs text-slate-400 border border-dashed border-slate-300 my-auto flex flex-col items-center justify-center">
                  <CheckCircle2 className="mb-2 text-slate-300" size={28} />
                  <span>Belum ada perbaikan selesai / laporan ditolak.</span>
                </div>
              ) : (
                tiketSelesai.map((item) => (
                  <div key={item.id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 space-y-2.5">
                    <div className="flex justify-between items-start">
                      <span className={`font-extrabold text-[10px] px-2 py-0.5 rounded flex items-center space-x-1 ${item.status === "DITOLAK MCC" ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                        <Check size={12} /><span>{item.status}</span>
                      </span>
                      <span className="text-[11px] text-slate-500 font-bold">{item.lokasi}</span>
                    </div>
                    <div>
                      <span className="font-extrabold text-sm text-slate-900 block">{item.rtg}</span>
                      <h4 className="font-bold text-xs text-slate-800 mt-0.5">{item.kategori}</h4>
                      <p className="text-slate-500 text-[11px] mt-1 line-clamp-2">{item.praOperasi}</p>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-slate-100 text-[11px]">
                      <span className="text-slate-500">Teknisi: <strong className="text-slate-800">{item.teknisi || "-"}</strong></span>
                      <button onClick={() => { setSelectedReport(item); setSelectedPriority(item.prioritas || "P3"); setShowDetailModal(true); }} className="text-blue-600 font-semibold hover:underline cursor-pointer">Detail →</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* MODAL APPROVAL DENGAN PREVIEW FOTO / VIDEO LAMPIRAN */}
      {showDetailModal && selectedReport && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">
                  LAPORAN #{selectedReport.id.slice(0, 8)}
                </span>
                <h3 className="text-base font-bold text-slate-800 mt-1">
                  Detail Kendala Unit {selectedReport.rtg}
                </h3>
              </div>

              <button onClick={() => setShowDetailModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg">
                <div>
                  <p className="text-slate-400">Lokasi Yard:</p>
                  <p className="font-bold text-slate-700">{selectedReport.lokasi}</p>
                </div>
                <div>
                  <label htmlFor="mcc-priority" className="text-slate-400 block mb-1">Prioritas MCC:</label>
                  {selectedReport.status === "MENUNGGU VERIFIKASI MCC" ? (
                    <select id="mcc-priority" value={selectedPriority} onChange={(e) => setSelectedPriority(e.target.value)} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-emerald-500">
                      <option value="">Pilih prioritas...</option>
                      <option value="P1">Priority 1 (P1)</option>
                      <option value="P2">Priority 2 (P2)</option>
                      <option value="P3">Priority 3 (P3)</option>
                    </select>
                  ) : (
                    <p className={`font-bold ${(selectedReport.prioritas || selectedPriority) === "P1" ? "text-red-600" : (selectedReport.prioritas || selectedPriority) === "P2" ? "text-amber-600" : "text-slate-700"}`}>
                      {selectedReport.prioritas || selectedPriority || "P3"}
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="mcc-technician" className="text-slate-400 block mb-1">Teknisi Ditugaskan:</label>
                  {selectedReport.status === "MENUNGGU VERIFIKASI MCC" ? (
                    <select id="mcc-technician" value={selectedTeknisiId} onChange={(e) => setSelectedTeknisiId(e.target.value)} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-emerald-500">
                      <option value="">Pilih teknisi tersedia...</option>
                      {daftarTeknisi.map((teknisi) => (
                        <option key={teknisi.id} value={teknisi.id}>
                          {teknisi.full_name} {teknisi.employee_id ? `(${teknisi.employee_id})` : ""}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="font-bold text-slate-700">{selectedReport.teknisi || "Belum Ditugaskan"}</p>
                  )}
                </div>
                <div>
                  <p className="text-slate-400">Kategori Kendala:</p>
                  <p className="font-bold text-slate-700">{selectedReport.kategori}</p>
                </div>
              </div>

              <div>
                <p className="font-bold text-slate-700 mb-1">Deskripsi Permasalahan:</p>
                <p className="p-3 bg-red-50 text-red-700 rounded-lg">{selectedReport.praOperasi}</p>
              </div>

              {/* RENDER PREVIEW FOTO / VIDEO KERUSAKAN */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <p className="font-bold text-slate-700 flex items-center justify-between">
                  <span>Lampiran Media Kerusakan:</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    {selectedReport.lampiranMedia && selectedReport.lampiranMedia.length > 0
                      ? `${selectedReport.lampiranMedia.length} Berkas`
                      : "0 Berkas"}
                  </span>
                </p>

                {selectedReport.lampiranMedia && selectedReport.lampiranMedia.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {selectedReport.lampiranMedia.map((media, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-900 rounded-xl overflow-hidden border border-slate-200 aspect-video relative flex items-center justify-center group cursor-pointer"
                        onClick={() => {
                          if (media.type !== "video") {
                            setPreviewImage(media.url);
                          }
                        }}
                      >
                        {media.type === "video" ? (
                          <video
                            src={media.url}
                            controls
                            className="w-full h-full object-contain bg-black"
                          />
                        ) : (
                          <>
                            <img
                              src={media.url}
                              alt={media.name || "Foto Bukti Kerusakan"}
                              className="w-full h-full object-cover transition duration-200 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white font-semibold text-[11px]">
                              Klik untuk memperbesar 🔍
                            </div>
                          </>
                        )}
                        <div className="absolute top-1.5 left-1.5 bg-slate-900/80 text-white text-[9px] px-2 py-0.5 rounded font-medium backdrop-blur-xs flex items-center space-x-1 z-10">
                          {media.type === "video" ? <Film size={10} /> : <Camera size={10} />}
                          <span className="truncate max-w-[120px]">{media.name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-slate-50 p-3 rounded-lg border border-dashed border-slate-200 text-center text-slate-400 text-xs">
                    <Camera size={18} className="mx-auto mb-1 text-slate-300" />
                    <span>Pelapor tidak menyertakan foto/video bukti kerusakan.</span>
                  </div>
                )}
              </div>

              {/* MODAL LIGHTBOX / PEMBESAR FOTO BUKTI */}
              {previewImage && (
                <div
                  className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in"
                  onClick={() => setPreviewImage(null)}
                >
                  <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center justify-center">
                    <button
                      onClick={() => setPreviewImage(null)}
                      className="absolute -top-10 right-0 text-white hover:text-slate-300 p-2 rounded-full transition cursor-pointer"
                    >
                      <X size={24} />
                    </button>
                    <img
                      src={previewImage}
                      alt="Preview Kerusakan Ukuran Besar"
                      className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl border border-slate-700"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
              )}

              {selectedReport.status === "MENUNGGU VERIFIKASI MCC" ? (
                <div className="pt-2 border-t border-slate-100">
                  <label className="font-bold text-slate-700 block mb-1">Keputusan Verifikasi MCC:</label>
                  <textarea rows={2} value={alasanPenolakan} onChange={(e) => setAlasanPenolakan(e.target.value)} placeholder="Catatan MCC / alasan penolakan (wajib diisi jika Reject)" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-emerald-500" />
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => handleApproveReport(selectedReport.id, selectedPriority, selectedTeknisiId)} disabled={!selectedPriority || !selectedTeknisiId} className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition shrink-0 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
                      Approve & Buat Ticket
                    </button>
                    <button onClick={() => handleRejectReport(selectedReport.id)} className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition shrink-0 cursor-pointer">
                      Reject Laporan
                    </button>
                  </div>
                </div>
              ) : (
                // KODE MODAL DETAIL
                <div className="pt-2 border-t border-slate-100 text-xs text-slate-600 space-y-1.5">
                  <div className="flex items-center space-x-2">
                    <strong>Status Tiket:</strong>
                    <span className={`px-2.5 py-0.5 rounded-full font-extrabold text-[10px] ${
                      selectedReport.status === "SEDANG DIKERJAKAN"
                        ? "bg-blue-100 text-blue-800 border border-blue-200"
                        : selectedReport.status === "WAITING PART / PM"
                        ? "bg-purple-100 text-purple-800 border border-purple-200"
                        : selectedReport.status === "SELESAI"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        : selectedReport.status === "DITOLAK MCC"
                        ? "bg-red-100 text-red-800 border border-red-200"
                        : "bg-amber-100 text-amber-800 border border-amber-200"
                    }`}>
                      {selectedReport.status}
                    </span>
                  </div>

                  {selectedReport.ticketId && (
                    <p><strong>Nomor Ticket:</strong> {selectedReport.ticketId}</p>
                  )}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button onClick={() => setShowDetailModal(false)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-200 cursor-pointer">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 mt-6 flex justify-between items-center text-[10px] text-slate-400 border-t border-slate-200/60 pt-4">
        <p>© 2026 Terminal Petikemas Surabaya - Sistem Operasional Rubber-Tired Gantry (RTG).</p>
        <div className="flex items-center space-x-3">
          <span className="flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span className="text-slate-600 font-medium">Terminal TOS Connected</span>
          </span>
          <span>TOS Server: V3.4.1-Ops</span>
        </div>
      </footer>
    </div>
  );
}