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
  Menu,
  X,
  Camera,
  Check,
  Edit3,
  Film,
  Package,
} from "lucide-react";

interface MediaItem {
  type: string;
  url: string;
  name: string;
}

interface Report {
  id: string; // UUID rtg_reports
  workOrderId?: string; // UUID work_orders
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
  woStatus?: string;
  teknisi?: string;
  teknisiId?: string;
  waktuMulai?: string;
  waktuSelesai?: string;
  durasiMenit?: number;
  lampiranMedia?: MediaItem[];
  resolutionNotes?: string;
}


export default function PenangananTeknisPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [reports, setReports] = useState<Report[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBlokFilter, setSelectedBlokFilter] = useState("SEMUA");
  const [selectedUrgensiFilter, setSelectedUrgensiFilter] = useState("SEMUA");
  const [selectedTimFilter, setSelectedTimFilter] = useState("SEMUA");

  // State Hamburger Menu Mobile
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const supabase = createClient();
  const [role, setRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // State Pop-up Notifikasi & Profil
  const [showNotif, setShowNotif] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  // State Modal Detail & Penanganan
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [catatanPerbaikan, setCatatanPerbaikan] = useState("");
  const [namaSparepart, setNamaSparepart] = useState("");
  const [fileHasilPerbaikan, setFileHasilPerbaikan] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State Lightbox Gambar
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // State menampung profil pengguna yang sedang login dari Supabase
  const [currentUserProfile, setCurrentUserProfile] = useState<{
    full_name: string;
    employee_id: string;
    role: string;
  } | null>(null);

  // Cek Hak Akses User (Khusus Admin & Teknisi)
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

        const allowedRoles = ["admin", "teknisi"];
        if (!allowedRoles.includes(profile.role)) {
          router.replace("/dasboard");
          return;
        }

       if (isMounted) {
          setRole(profile.role);
          setCurrentUserId(user.id);
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

  // Fetch Data dari Supabase (rtg_reports & work_orders)
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
          work_orders!report_id (
            id,
            status,
            technician_id,
            execution_date,
            solving_date,
            resolution_notes,
            evidence_url,
            profiles!technician_id (
              full_name
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Gagal mengambil data penanganan teknis:", error.message);
        return;
      }

      if (data) {
        const approvedReports = data.filter((item: any) => {
          const vStatus = item.verification_status?.toUpperCase();
          const woList = Array.isArray(item.work_orders)
            ? item.work_orders
            : item.work_orders
            ? [item.work_orders]
            : [];
          return vStatus === "APPROVED" || woList.length > 0;
        });

        const formatted: Report[] = approvedReports.map((item: any) => {
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

          // Pemetaan Status UI berdasarkan Work Order (ASSIGNED / IN_PROGRESS / COMPLETED)
          let uiStatus = "MENUNGGU PENANGANAN";
          const woStatus = activeWO?.status?.toUpperCase();

         if (woStatus === "ON_PROGRESS" || woStatus === "IN_PROGRESS" || woStatus === "SEDANG DIKERJAKAN") {
              uiStatus = "SEDANG DIKERJAKAN";
            } else if (woStatus === "WAITING_PART" || woStatus === "WAITING PM") {
              uiStatus = "WAITING PART";
            } else if (woStatus === "DONE" || woStatus === "COMPLETED" || woStatus === "SELESAI") {
              uiStatus = "SELESAI";
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

          let mediaList: MediaItem[] = [];
          const rawMedia = activeWO?.evidence_url || item.evidence_url;

          if (rawMedia) {
            let urls: string[] = [];
            if (Array.isArray(rawMedia)) {
              urls = rawMedia.filter((u: any) => typeof u === "string" && u.trim() !== "");
            } else if (typeof rawMedia === "string" && rawMedia.trim() !== "") {
              try {
                const parsed = JSON.parse(rawMedia);
                urls = Array.isArray(parsed) ? parsed : [rawMedia];
              } catch {
                urls = [rawMedia];
              }
            }

            mediaList = urls.map((url: string, index: number) => ({
              type: url.match(/\.(mp4|webm|mov|avi)$/i) ? "video" : "image",
              url,
              name: `Bukti Lampiran #${index + 1}`,
            }));
          }

          return {
            id: item.id,
            workOrderId: activeWO?.id,
            rtg_id: item.rtg_id,
            tanggal: tanggalStr,
            jam: jamStr,
            rtg: item.rtg_statuses?.unit_code || "RTG-XX",
            lokasi: item.rtg_statuses?.block || "BLOK AREA",
            pelapor: namaPelapor,
            praOperasi: temuanTeks || "-",
            pascaOperasi: "-",
            kategori: kat,
            prioritas: item.priority ? `P${item.priority}` : "P3",
            status: uiStatus,
            woStatus: woStatus || "ASSIGNED",
            teknisi: namaTeknisi || "Belum Ditugaskan",
            teknisiId: activeWO?.technician_id,
            lampiranMedia: mediaList,
            resolutionNotes: activeWO?.resolution_notes || "-",
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
      console.error("Error loading teknisi data:", err);
    }
  };

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel("teknisi_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "work_orders" }, () => loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "rtg_reports" }, () => loadData())
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

  const tiketMenunggu = filteredReports.filter((r) => r.status === "MENUNGGU PENANGANAN");
  const tiketDikerjakan = filteredReports.filter((r) => r.status === "SEDANG DIKERJAKAN");
  const tiketWaitingPack = filteredReports.filter((r) => r.status === "WAITING PART");
  const tiketSelesai = filteredReports.filter((r) => r.status === "SELESAI");

  const totalTiketAktif = tiketMenunggu.length + tiketDikerjakan.length;
  const butuhTindakanCepat = reports.filter(
    (r) =>
      r.status !== "SELESAI" &&
      (r.prioritas?.includes("P1") || r.prioritas?.includes("1"))
  ).length;

  const totalWorkOrder = reports.length;
  const teknisiAktifSet = new Set(
    reports
      .filter((r) => r.status === "SEDANG DIKERJAKAN" && r.teknisi && r.teknisi !== "Belum Ditugaskan")
      .map((r) => r.teknisi)
  );
  const totalTeknisiOnDuty = teknisiAktifSet.size;

  // Aksi 1: Mulai Pengerjaan Tiket (Kirim status 'SEDANG DIKERJAKAN' kapital)
  const handleMulaiPengerjaan = async (workOrderId?: string) => {
    if (!workOrderId) {
      alert("ID Work Order tidak ditemukan!");
      return;
    }

    try {
      setIsSubmitting(true);
      const { error } = await supabase
        .from("work_orders")
        .update({
          status: "ON_PROGRESS",
          execution_date: new Date().toISOString(),
        })
        .eq("id", workOrderId);

      if (error) {
        alert("Gagal memulai pengerjaan: " + error.message);
        return;
      }

      alert("Pengerjaan perbaikan dimulai!");
      setShowDetailModal(false);
      loadData();
    } catch (err) {
      console.error("Error starting repair:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle untuk memindahkan status ke WAITING_PART dari Modal Detail
  const handleHoldWaitingPart = async (workOrderId?: string, partName?: string) => {
  if (!workOrderId) {
    alert("ID Work Order tidak ditemukan!");
    return;
  }

  const targetPart = partName || namaSparepart;
  if (!targetPart.trim()) {
    alert("Masukkan nama sparepart / komponen yang sedang ditunggu!");
    return;
  }

  try {
    setIsSubmitting(true);
    const { error } = await supabase
      .from("work_orders")
      .update({
        status: "WAITING_PART",
        resolution_notes: `[WAITING SPAREPART]: ${targetPart.trim()}`,
      })
      .eq("id", workOrderId);

    if (error) {
      alert("Gagal memperbarui status: " + error.message);
      return;
    }

    // AUDIT LOG UNTUK HOLD WAITING PACK / PM
      await createAuditLog({
        userId: currentUserId || "",
        userName: currentUserProfile?.full_name || "Teknisi Lapangan",
        userRole: role || "teknisi",
        action: "HOLD_WAITING_PART",
        description: `Penanganan unit ${selectedReport?.rtg || "RTG"} ditunda (Waiting Part). Memerlukan sparepart: ${targetPart.trim()}`,
        targetId: workOrderId,
      });

    alert("Status perbaikan diubah menjadi WAITING PART.");
    setShowDetailModal(false);
    setNamaSparepart("");
    loadData();
  } catch (err) {
    console.error("Error updating to waiting part:", err);
  } finally {
    setIsSubmitting(false);
  }
};

  // Aksi 2: Selesaikan Tiket (Kirim status 'COMPLETED' kapital)
  const handleSelesaikanTiket = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedReport?.workOrderId) {
      alert("Work Order tidak ditemukan.");
      return;
    }

    if (!catatanPerbaikan.trim()) {
      alert("Masukkan catatan hasil perbaikan teknis!");
      return;
    }

    try {
      setIsSubmitting(true);
      let uploadedUrl: string | null = null;

      if (fileHasilPerbaikan) {
        const fileExt = fileHasilPerbaikan.name.split(".").pop();
        const fileName = `fix_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
        const filePath = `reports/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("rtg_media")
          .upload(filePath, fileHasilPerbaikan);

        if (uploadError) {
          console.error("Gagal upload foto perbaikan:", uploadError.message);
        } else {
          const { data: publicUrlData } = supabase.storage
            .from("rtg_media")
            .getPublicUrl(filePath);
          uploadedUrl = publicUrlData?.publicUrl || null;
        }
      }

      // Mengirim status "DONE" (sesuai check constraint Postgres)
      const { error: woError } = await supabase
        .from("work_orders")
        .update({
          status: "DONE",
          solving_date: new Date().toISOString(),
          resolution_notes: catatanPerbaikan,
          evidence_url: uploadedUrl ? [uploadedUrl] : selectedReport.lampiranMedia?.map((m) => m.url) || [],
        })
        .eq("id", selectedReport.workOrderId);

      if (woError) {
        alert("Gagal menyelesaikan Work Order: " + woError.message);
        return;
      }

      // AUDIT LOG UNTUK PERBAIKAN SELESAI
      await createAuditLog({
        userId: currentUserId || "",
        userName: currentUserProfile?.full_name || "Teknisi Lapangan",
        userRole: role || "teknisi",
        action: "COMPLETE_REPAIR",
        description: `Penanganan unit ${selectedReport?.rtg || "RTG"} telah SELESAI dikerjakan oleh teknisi. Catatan perbaikan: ${catatanPerbaikan.trim()}`,
        targetId: selectedReport.workOrderId,
      });

    if (selectedReport.rtg_id) {
        // Cek apakah masih ada laporan lain yang aktif pada rtg_id yang sama
        const { data: activeReports } = await supabase
          .from("rtg_reports")
          .select(`
            id,
            verification_status,
            work_orders!report_id (
              status
            )
          `)
          .eq("rtg_id", selectedReport.rtg_id)
          .in("verification_status", ["PENDING", "APPROVED"]);

        const stillHasOpenIssue = (activeReports || []).some((rep: any) => {
          const vStatus = rep.verification_status?.toUpperCase();
          // Jika masih PENDING di MCC, berarti unit belum ready
          if (vStatus === "PENDING") return true;

          // Jika APPROVED, cek apakah WO-nya belum DONE
          if (vStatus === "APPROVED") {
            const woList = Array.isArray(rep.work_orders)
              ? rep.work_orders
              : rep.work_orders
              ? [rep.work_orders]
              : [];
            if (woList.length === 0) return true;
            const woStatus = woList[0]?.status?.toUpperCase();
            return woStatus !== "DONE" && woStatus !== "COMPLETED" && woStatus !== "SELESAI";
          }
          return false;
        });

        await supabase
          .from("rtg_statuses")
          .update({
            status: stillHasOpenIssue ? "NEED_REPAIR" : "READY",
            last_updated: new Date().toISOString(),
          })
          .eq("id", selectedReport.rtg_id);
      }

      alert("Perbaikan unit RTG berhasil diselesaikan!");
      setShowDetailModal(false);
      setCatatanPerbaikan("");
      setFileHasilPerbaikan(null);
      loadData();
    } catch (err) {
      console.error("Error completing repair:", err);
    } finally {
      setIsSubmitting(false);
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
          {/* Tombol Hamburger khusus HP */}
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
            </h1>
            <p className="text-[9px] sm:text-[10px] text-emerald-200 mt-0.5 hidden sm:block">
              OPERASIONAL LAPANGAN TERMINAL PETIKEMAS SURABAYA
            </p>
          </div>
        </div>

        {/* Navigasi Desktop */}
        <nav className="hidden lg:flex items-center space-x-2 bg-[#082e2e] p-1.5 rounded-full text-xs shadow-inner">
          {(role === "admin" || role === "operator") && (
            <Link
              href="/form-pelaporan"
              className={`px-5 py-2 rounded-full transition font-semibold ${
                pathname === "/form-pelaporan"
                  ? "bg-white text-[#0b3c3c] shadow"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              Laporkan Kendala
            </Link>
          )}

          {(role === "admin" || role === "mcc") && (
            <Link
              href="/verifikasi-mcc"
              className={`px-5 py-2 rounded-full transition font-semibold ${
                pathname === "/verifikasi-mcc"
                  ? "bg-white text-[#0b3c3c] shadow"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              Approval MCC
            </Link>
          )}

          <Link
            href="/dasboard"
            className={`px-5 py-2 rounded-full transition font-semibold ${
              pathname === "/dasboard"
                ? "bg-white text-[#0b3c3c] shadow"
                : "text-slate-300 hover:text-white"
            }`}
          >
            Dashboard
          </Link>

          {(role === "admin" || role === "teknisi") && (
            <Link
              href="/penanganan-teknis"
              className={`px-5 py-2 rounded-full transition font-semibold ${
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
              {reports.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
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
              Laporkan Kendala
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

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 mt-4 sm:mt-6 space-y-4 sm:space-y-5">
        {/* Title & Action Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">Monitoring & Penanganan Teknisi RTG</h2>
            </div>
            <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">
              Papan kendali work order penanganan kerusakan, inspeksi mekanikal-elektrikal, dan alokasi tim teknisi lapangan secara real-time.
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

        {/* Top Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 flex justify-between items-start shadow-sm">
            <div>
              <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider">TOTAL RTG AKTIF</p>
              <h3 className="text-xl sm:text-2xl font-extrabold mt-1 text-slate-800">
                {totalTiketAktif} <span className="text-xs font-normal text-slate-500">Unit</span>
              </h3>
            </div>
            <div className="p-2 sm:p-2.5 bg-blue-50 text-blue-600 rounded-xl"><FileText size={18} /></div>
          </div>

          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 flex justify-between items-start shadow-sm border-l-4 border-l-red-500">
            <div>
              <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider">PERLU PERBAIKAN</p>
              <h3 className="text-xl sm:text-2xl font-extrabold mt-1 text-red-600">
                {butuhTindakanCepat} <span className="text-xs font-normal text-slate-500">(Unit)</span>
              </h3>
            </div>
            <div className="p-2 sm:p-2.5 bg-red-50 text-red-500 rounded-xl"><AlertOctagon size={18} /></div>
          </div>

          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 flex justify-between items-start shadow-sm">
            <div>
              <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider">WORK ORDER</p>
              <h3 className="text-xl sm:text-2xl font-extrabold mt-1 text-slate-800">
                {totalWorkOrder} <span className="text-xs font-normal text-slate-500">Ticket</span>
              </h3>
            </div>
            <div className="p-2 sm:p-2.5 bg-blue-50 text-blue-600 rounded-xl"><Ticket size={18} /></div>
          </div>

          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 flex justify-between items-start shadow-sm">
            <div>
              <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider">TEKNISI ON-DUTY</p>
              <h3 className="text-xl sm:text-2xl font-extrabold mt-1 text-slate-800">
                {totalTeknisiOnDuty} <span className="text-xs font-normal text-slate-500">Personel</span>
              </h3>
            </div>
            <div className="p-2 sm:p-2.5 bg-emerald-50 text-emerald-600 rounded-xl"><Users size={18} /></div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-2.5 sm:gap-3 justify-between items-center">
          <div className="relative w-full md:flex-1">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari tiket, ID RTG, atau teknisi..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full md:w-auto">
            <select
              value={selectedBlokFilter}
              onChange={(e) => setSelectedBlokFilter(e.target.value)}
              className="w-full sm:w-auto bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="SEMUA">Semua Blok (A-E)</option>
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
              <option value="SEMUA">Semua Tim Penugasan</option>
              <option value="Hidrolik">Tim Hidrolik</option>
              <option value="Spreader">Tim Spreader</option>
              <option value="Mekanikal">Tim Mekanikal</option>
              <option value="Elektrikal">Tim Elektrikal/Genset</option>
            </select>

            <button onClick={handleResetFilter} className="text-slate-500 hover:text-slate-800 text-xs font-semibold px-2 py-1 transition cursor-pointer">Reset</button>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Kolom 1: MENUNGGU PENANGANAN */}
          <div className="bg-slate-200/50 p-4 rounded-xl border border-slate-200 flex flex-col h-[450px] min-h-0">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">MENUNGGU PENANGANAN</h3>
                <span className="bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded-full text-[11px]">{tiketMenunggu.length}</span>
              </div>
            </div>
            <div className="space-y-3.5 flex-1 min-h-0 overflow-y-auto pr-2 flex flex-col">
              {tiketMenunggu.length === 0 ? (
                <div className="bg-white/80 rounded-xl p-8 text-center text-xs text-slate-400 border border-dashed border-slate-300 my-auto flex flex-col items-center justify-center">
                  <FileText className="mb-2 text-slate-300" size={28} />
                  <span>Belum ada Work Order menunggu penanganan.</span>
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
                    
                    <div className="bg-slate-50 p-2 rounded-lg text-[11px] text-slate-600">
                      <span>Teknisi Ditugaskan: <strong>{item.teknisi}</strong></span>
                    </div>

                    {/* Opsi Cepat Waiting Pack Langsung di Kartu */}
                    <div className="bg-purple-50/50 p-2 rounded-lg border border-purple-100 space-y-1.5">
                      <div className="flex items-center space-x-1 text-[10px] font-bold text-purple-800">
                        <Package size={12} className="text-purple-600" />
                        <span>Kendalanya Sparepart? (Hold ke Waiting Part):</span>
                      </div>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          placeholder="Nama sparepart..."
                          id={`sparepart-${item.id}`}
                          className="w-full bg-white border border-purple-200 rounded px-2 py-1 text-[11px] focus:outline-none focus:border-purple-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const inputEl = document.getElementById(`sparepart-${item.id}`) as HTMLInputElement;
                            if (!inputEl || !inputEl.value.trim()) {
                              alert("Masukkan nama sparepart terlebih dahulu!");
                              return;
                            }
                           handleHoldWaitingPart(item.workOrderId, inputEl.value);
                          }}
                          disabled={isSubmitting}
                          className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-[10px] font-semibold transition shrink-0 cursor-pointer disabled:opacity-50"
                        >
                          Hold
                        </button>
                      </div>
                    </div>

                    {/* Tombol Aksi Bawah: Detail & Mulai Kerjakan */}
                    <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                      <button
                        onClick={() => { setSelectedReport(item); setShowDetailModal(true); }}
                        className="text-[11px] text-blue-600 font-semibold hover:underline cursor-pointer"
                      >
                        Detail →
                      </button>
                      <button
                        onClick={() => handleMulaiPengerjaan(item.workOrderId)}
                        disabled={isSubmitting}
                        className="px-3.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                      >
                        Mulai Kerjakan
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Kolom 2: SEDANG DIKERJAKAN */}
          <div className="bg-slate-200/50 p-4 rounded-xl border border-slate-200 flex flex-col h-[450px] min-h-0">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">SEDANG DIKERJAKAN</h3>
                <span className="bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full text-[11px]">{tiketDikerjakan.length}</span>
              </div>
            </div>
            <div className="space-y-3.5 flex-1 min-h-0 overflow-y-auto pr-2 flex flex-col">
              {tiketDikerjakan.length === 0 ? (
                <div className="bg-white/80 rounded-xl p-8 text-center text-xs text-slate-400 border border-dashed border-slate-300 my-auto flex flex-col items-center justify-center">
                  <span>Tidak ada unit sedang dalam proses perbaikan.</span>
                </div>
              ) : (
                tiketDikerjakan.map((item) => (
                  <div key={item.id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 space-y-3">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-black px-0 py-0.5 rounded bg-blue-100 text-blue-800">{item.prioritas || "P3"} • IN-PROGRESS</span>
                      <span className="text-[10px] text-slate-500 font-medium">⏱ Mulai: {item.waktuMulai || item.jam}</span>
                    </div>
                    <div>
                      <span className="font-extrabold text-sm text-slate-900 block">{item.rtg}</span>
                      <h4 className="font-bold text-xs text-slate-800 mt-0.5">{item.kategori}</h4>
                      <p className="text-slate-500 text-[11px] mt-1 line-clamp-2">{item.praOperasi}</p>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-1 text-[11px]">
                      <span className="text-slate-600 block">TEKNISI BERTUGAS:</span>
                      <strong className="text-slate-800 block">{item.teknisi}</strong>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <button onClick={() => { setSelectedReport(item); setShowDetailModal(true); }} className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold transition flex items-center space-x-1 cursor-pointer">
                        <Edit3 size={13} /><span>Update & Selesaikan</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Kolom 3: WAITING PACK (BARU) */}
          <div className="bg-slate-200/50 p-4 rounded-xl border border-slate-200 flex flex-col h-[450px] min-h-0">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">WAITING PART / PM</h3>
                <span className="bg-purple-100 text-purple-700 font-bold px-2 py-0.5 rounded-full text-[11px]">
                  {tiketWaitingPack.length}
                </span>
              </div>
            </div>

            <div className="space-y-3.5 flex-1 min-h-0 overflow-y-auto pr-2 flex flex-col">
              {tiketWaitingPack.length === 0 ? (
                <div className="bg-white/80 rounded-xl p-8 text-center text-xs text-slate-400 border border-dashed border-slate-300 my-auto flex flex-col items-center justify-center">
                  <Package className="mb-2 text-slate-300" size={28} />
                  <span>Tidak ada unit tertunda sparepart.</span>
                </div>
              ) : (
                tiketWaitingPack.map((item) => (
                  <div key={item.id} className="bg-white rounded-xl p-4 shadow-sm border border-purple-200 space-y-3">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-black px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                        HOLD SPAREPART
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium">⏱ {item.jam}</span>
                    </div>

                    <div>
                      <span className="font-extrabold text-sm text-slate-900 block">{item.rtg}</span>
                      <h4 className="font-bold text-xs text-slate-800 mt-0.5">{item.kategori}</h4>
                    </div>

                    <div className="bg-purple-50 p-2.5 rounded-lg border border-purple-100 text-[11px] text-purple-900">
                      <span className="text-[10px] font-bold text-purple-700 block uppercase">Menunggu:</span>
                      <p className="font-medium mt-0.5">{item.resolutionNotes || "Komponen Sparepart"}</p>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                      <span className="text-[10px] text-slate-500">📍 {item.lokasi}</span>
                      <button
                        onClick={() => {
                          setSelectedReport(item);
                          setShowDetailModal(true);
                        }}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                      >
                        Update / Selesai ➔
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Kolom 4: SELESAI HARI INI */}
          <div className="bg-slate-200/50 p-4 rounded-xl border border-slate-200 flex flex-col h-[450px] min-h-0">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">SELESAI HARI INI</h3>
                <span className="bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full text-[11px]">{tiketSelesai.length}</span>
              </div>
            </div>
            <div className="space-y-3.5 flex-1 min-h-0 overflow-y-auto pr-2 flex flex-col">
              {tiketSelesai.length === 0 ? (
                <div className="bg-white/80 rounded-xl p-8 text-center text-xs text-slate-400 border border-dashed border-slate-300 my-auto flex flex-col items-center justify-center">
                  <CheckCircle2 className="mb-2 text-slate-300" size={28} />
                  <span>Belum ada perbaikan selesai hari ini.</span>
                </div>
              ) : (
                tiketSelesai.map((item) => (
                  <div key={item.id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 space-y-2.5">
                    <div className="flex justify-between items-start">
                      <span className="bg-emerald-100 text-emerald-700 font-extrabold text-[10px] px-2 py-0.5 rounded flex items-center space-x-1">
                        <Check size={12} /><span>COMPLETED</span>
                      </span>
                      <span className="text-[11px] font-bold text-slate-700">{item.waktuSelesai || "Selesai"}</span>
                    </div>
                    <div>
                      <span className="font-extrabold text-sm text-slate-900 block">{item.rtg}</span>
                      <h4 className="font-bold text-xs text-slate-800 mt-0.5">{item.kategori}</h4>
                      <p className="text-slate-500 text-[11px] mt-1 line-clamp-2">Catatan: {item.resolutionNotes}</p>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-slate-100 text-[11px]">
                      <span className="text-slate-500">Teknisi: <strong className="text-slate-800">{item.teknisi}</strong></span>
                      <button onClick={() => { setSelectedReport(item); setShowDetailModal(true); }} className="text-blue-600 font-semibold hover:underline cursor-pointer">Detail WO →</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* MODAL UPDATE & PENYELESAIAN TIKET */}
      {showDetailModal && selectedReport && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  WORK ORDER #{selectedReport.workOrderId?.slice(0, 8).toUpperCase() || "WO-ACTIVE"}
                </span>
                <h3 className="text-base font-bold text-slate-800 mt-1">
                  Penanganan Kendala Unit {selectedReport.rtg}
                </h3>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer">
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
                  <p className="text-slate-400">Prioritas Laporan:</p>
                  <p className="font-bold text-red-600">{selectedReport.prioritas}</p>
                </div>
                <div>
                  <p className="text-slate-400">Teknisi Bertugas:</p>
                  <p className="font-bold text-slate-700">{selectedReport.teknisi}</p>
                </div>
                <div>
                  <p className="text-slate-400">Kategori Kendala:</p>
                  <p className="font-bold text-slate-700">{selectedReport.kategori}</p>
                </div>
              </div>

              <div>
                <p className="font-bold text-slate-700 mb-1">Deskripsi Permasalahan Awal:</p>
                <p className="p-3 bg-red-50 text-red-700 rounded-lg">{selectedReport.praOperasi}</p>
              </div>

              {/* LAMPIRAN MEDIA */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <p className="font-bold text-slate-700 flex items-center justify-between">
                  <span>Lampiran Foto/Video Terkait:</span>
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
                          if (media.type !== "video") setPreviewImage(media.url);
                        }}
                      >
                        {media.type === "video" ? (
                          <video src={media.url} controls className="w-full h-full object-contain bg-black" />
                        ) : (
                          <img src={media.url} alt={media.name} className="w-full h-full object-cover transition group-hover:scale-105" />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-slate-50 p-3 rounded-lg border border-dashed border-slate-200 text-center text-slate-400 text-xs">
                    <span>Tidak ada lampiran foto/video.</span>
                  </div>
                )}
              </div>

              {/* INPUT SPAREPART & KONTROL WAITING PACK (Selalu tampil jika belum selesai) */}
              {selectedReport.status !== "SELESAI" && (
                <div className="bg-purple-50/60 p-3 rounded-xl border border-purple-200 space-y-2">
                  <label className="font-bold text-purple-900 flex items-center space-x-1">
                    <Package size={14} className="text-purple-600" />
                    <span>Kendala Sparepart? (Pindahkan ke Waiting Part):</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={namaSparepart}
                      onChange={(e) => setNamaSparepart(e.target.value)}
                      placeholder="Nama komponen / sparepart..."
                      className="w-full bg-white border border-purple-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-purple-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleHoldWaitingPart(selectedReport.workOrderId)}
                      disabled={isSubmitting}
                      className="px-3 py-1.5 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition shrink-0 text-xs cursor-pointer disabled:opacity-50"
                    >
                      Set Waiting Part
                    </button>
                  </div>
                </div>
              )}

              {/* FORM PENYELESAIAN */}
              {selectedReport.status !== "SELESAI" ? (
                <form onSubmit={handleSelesaikanTiket} className="pt-2 border-t border-slate-100 space-y-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Catatan Hasil Perbaikan Teknis *</label>
                    <textarea
                      rows={3}
                      required
                      value={catatanPerbaikan}
                      onChange={(e) => setCatatanPerbaikan(e.target.value)}
                      placeholder="Jelaskan tindakan perbaikan atau pengujian yang telah dilakukan..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Unggah Bukti Hasil Perbaikan (Opsional)</label>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={(e) => e.target.files && setFileHasilPerbaikan(e.target.files[0])}
                      className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={() => setShowDetailModal(false)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg font-semibold hover:bg-slate-200 cursor-pointer">
                      Batal
                    </button>

                    {/* Tombol Cepat Mulai Kerjakan jika status awal masih menunggu */}
                    {selectedReport.status === "MENUNGGU PENANGANAN" && (
                      <button
                        type="button"
                        onClick={() => handleMulaiPengerjaan(selectedReport.workOrderId)}
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition cursor-pointer"
                      >
                        Mulai Kerjakan
                      </button>
                    )}

                    <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-amber-600 text-white rounded-lg font-semibold hover:bg-amber-700 transition cursor-pointer">
                      {isSubmitting ? "Menyimpan..." : "Tandai Perbaikan Selesai"}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="pt-2 border-t border-slate-100 text-xs text-slate-600 space-y-1">
                  <p><strong>Catatan Hasil Perbaikan:</strong> {selectedReport.resolutionNotes}</p>
                  <p><strong>Waktu Selesai:</strong> {selectedReport.waktuSelesai}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX PREVIEW GAMBAR */}
      {previewImage && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center justify-center">
            <button onClick={() => setPreviewImage(null)} className="absolute -top-10 right-0 text-white hover:text-slate-300 p-2 rounded-full transition cursor-pointer">
              <X size={24} />
            </button>
            <img src={previewImage} alt="Preview Bukti kerusakan/perbaikan" className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl border border-slate-700" onClick={(e) => e.stopPropagation()} />
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 mt-6 flex justify-between items-center text-[10px] text-slate-400 border-t border-slate-200/60 pt-4">
        <p>© 2026 Terminal Petikemas Surabaya - Sistem Operasional Rubber-Tired Gantry (RTG).</p>
        <div className="flex items-center space-x-3">
        </div>
      </footer>
    </div>
  );
}