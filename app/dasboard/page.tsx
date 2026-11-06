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
  Menu
} from "lucide-react";

interface Report {
  id: number;
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
}

interface RTGCardItem {
  id: string;
  status: "NORMAL" | "PERBAIKAN";
  prioritas?: string;
  sub: string;
  block?: string | null;
  lastUpdated?: string;
  reportDetails?: Report | null;
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

  // State RTG Status Supabase
  const [rtgStatuses, setRtgStatuses] = useState<RTGStatus[]>([]);
  const [rtgLoading, setRtgLoading] = useState(true);

  // State Modal Card RTG
  const [selectedRtgCard, setSelectedRtgCard] = useState<RTGCardItem | null>(null);
  const [showRtgModal, setShowRtgModal] = useState(false);

  // Supabase Client & Role Check
  const supabase = createClient();
  const [role, setRole] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

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
            .select("role, is_active")
            .eq("id", user.id)
            .single();

        if (
          profileError ||
          !profile ||
          !profile.is_active
        ) {
          await supabase.auth.signOut();
          router.replace("/");
          return;
        }

        const allowedRoles = ["admin", "operator", "mcc", "teknisi"];

        if (!allowedRoles.includes(profile.role)) {
          router.replace("/dasboard");
          return;
        }

        if (isMounted) {
          setRole(profile.role);
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

  // Realtime Supabase
  useEffect(() => {
    let isMounted = true;

    async function fetchRTGStatuses() {
      const { data, error } = await supabase
        .from("rtg_statuses")
        .select("id, unit_code, status, block, last_updated")
        .order("unit_code", { ascending: true });

      if (error) {
        console.error("Gagal mengambil data RTG:", error.message);
        if (isMounted) {
          setRtgLoading(false);
        }
        return;
      }

      if (isMounted) {
        setRtgStatuses(data ?? []);
        setRtgLoading(false);
      }
    }

    fetchRTGStatuses();

    const channel = supabase
      .channel("rtg_statuses_dashboard")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rtg_statuses" },
        (payload) => {
          setRtgStatuses((prev) =>
            prev.map((item) =>
              item.id === payload.new.id ? { ...item, ...payload.new } : item
            )
          );
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  // Modal Detail Tiket Tabel
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("rtg_reports");
    if (saved) {
      try {
        setReports(JSON.parse(saved));
      } catch (e) {
        console.error("Error read localstorage:", e);
      }
    }
  }, []);

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

  // Pemetaan Card RTG Units
  const rtgUnits = rtgStatuses.map((item) => {
    const activeReport = reports.find(
      (r) => r.rtg.toUpperCase() === item.unit_code.toUpperCase()
    );

    const isRepair = Boolean(activeReport);

    return {
      id: item.unit_code,
      status: (isRepair ? "PERBAIKAN" : "NORMAL") as "NORMAL" | "PERBAIKAN",
      prioritas: activeReport?.prioritas || "MEDIUM P3",
      sub: isRepair ? "Perlu Perbaikan" : "Tanpa laporan aktif",
      block: item.block,
      lastUpdated: item.last_updated,
      reportDetails: activeReport || null,
    };
  });

  // REVISI: Perhitungan total perbaikan & normal dihitung berdasarkan dynamic rtgUnits
  const totalPerbaikan = rtgUnits.filter((item) => item.status === "PERBAIKAN").length;
  const totalNormal = rtgUnits.filter((item) => item.status === "NORMAL").length;
  const handleCardClick = (unit: RTGCardItem) => {
    setSelectedRtgCard(unit);
    setShowRtgModal(true);
  };

  // Chart Data Calculation
  const rtgCounts: Record<string, number> = {};
  reports.forEach((r) => {
    rtgCounts[r.rtg] = (rtgCounts[r.rtg] || 0) + 1;
  });

  const chartData = Object.keys(rtgCounts).map((key) => ({
    label: key,
    value: rtgCounts[key],
  }));

  const maxVal = Math.max(...Object.values(rtgCounts), 5);

  const exportToExcel = () => {
    let dataToExport: Report[];

    try {
      const saved = localStorage.getItem("rtg_reports");
      const parsed: unknown = saved ? JSON.parse(saved) : [];

      if (!Array.isArray(parsed)) {
        alert("Format data laporan tidak valid.");
        return;
      }

      dataToExport = parsed as Report[];
    } catch (error) {
      console.error("Gagal membaca data untuk ekspor:", error);
      alert("Data laporan gagal dibaca.");
      return;
    }

    if (dataToExport.length === 0) {
      alert("Belum ada data laporan untuk diekspor!");
      return;
    }

    const excelData = dataToExport.map((r, idx) => ({
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

  // REVISI: Fungsi hapus laporan sekaligus meng-update status unit di Supabase menjadi READY
  const clearData = async () => {
    if (confirm("Apakah Anda yakin ingin mengosongkan semua data laporan? Status RTG akan kembali READY.")) {
      localStorage.removeItem("rtg_reports");
      setReports([]);

      try {
        const { error } = await supabase
          .from("rtg_statuses")
          .update({ status: "READY", last_updated: new Date().toISOString() })
          .neq("id", 0);

        if (error) {
          console.error("Gagal memperbarui status Supabase:", error.message);
        }
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
      {/* Header / Navbar Responsif */}
      <header className="bg-[#0b3c3c] text-white px-4 sm:px-8 py-3.5 sm:py-4 flex items-center justify-between shadow-md relative z-50">
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          {/* Tombol Hamburger khusus HP */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 text-slate-200 hover:text-white lg:hidden rounded-lg hover:bg-[#134e4e] transition cursor-pointer"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center">
            <img
              src="/images/logopelindo.png"
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

          <Link
            href="/dasboard"
            className={`px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-full transition font-semibold whitespace-nowrap ${
              pathname === "/dasboard"
                ? "bg-white text-[#0b3c3c] shadow"
                : "text-slate-300 hover:text-white"
            }`}
          >
            Dashboard Monitoring
          </Link>

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
        </nav>

        {/* Action Right: Notif & Profile */}
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
              <div className="p-1 bg-emerald-500 rounded-full text-white">
                <User size={14} />
              </div>
              <div className="text-left leading-tight hidden sm:block">
                <p className="font-semibold text-white text-xs">Supervisi Lapangan</p>
                <p className="text-[10px] text-emerald-200">Shift A - Pier 2</p>
              </div>
            </button>

            {showProfile && (
              <div className="absolute right-0 mt-3 w-64 bg-white text-slate-800 rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50 p-4 space-y-3">
                <div className="flex items-center space-x-3 border-b border-slate-100 pb-3">
                  <div className="w-10 h-10 rounded-full bg-[#0b3c3c] text-white flex items-center justify-center font-bold text-sm">
                    SL
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-800">Bambang S.</h4>
                    <p className="text-[10px] text-slate-400">ID Supervisor: #SPV-9942</p>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Shift Tugas:</span>
                    <span className="font-semibold text-slate-800">Shift A (07:00 - 15:00)</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Area Pengawasan:</span>
                    <span className="font-semibold text-slate-800">Pier 2 Dermaga</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Status TOS:</span>
                    <span className="text-emerald-600 font-semibold">Terhubung</span>
                  </div>
                </div>

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

      {/* DROPDOWN HAMBURGER MENU (KHUSUS MOBILE) */}
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
            Dashboard Monitoring
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

        {/* Top Summary Cards Responsif */}
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
              <h3 className="text-2xl font-bold mt-1 text-red-600">{totalPerbaikan} <span className="text-xs font-normal text-slate-500">unit</span></h3>
              <p className="text-[11px] text-slate-500 mt-2 font-medium">
                {totalPerbaikan > 0 ? `• ${totalPerbaikan} unit butuh pemeliharaan` : "• Seluruh unit siap operasi"}
              </p>
            </div>
            <div className="p-2 bg-red-50 text-red-500 rounded-lg"><AlertOctagon size={20} /></div>
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

        {/* Status Unit RTG Grid */}
        <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-800">Status Unit RTG (Layout Area)</h3>
              <p className="text-[11px] sm:text-xs text-slate-400">Pemetaan sebaran unit di Container Yard (Klik unit untuk detail)</p>
            </div>
            <div className="flex items-center space-x-3 text-xs font-medium self-end sm:self-auto">
              <span className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span className="text-slate-600">Ready</span> 
                <span className="text-slate-400">({totalNormal})</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
                <span className="text-slate-600">Perbaikan</span> 
                <span className="text-slate-400">({totalPerbaikan})</span>
              </span>
            </div>
          </div>

          {/* GRID RESPONSIVE */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5 sm:gap-3">
            {rtgUnits.map((item) => (
              <div 
                key={item.id} 
                onClick={() => handleCardClick(item)}
                className={`p-2.5 sm:p-3 rounded-lg border transition cursor-pointer hover:shadow-md ${
                  item.status === "PERBAIKAN" 
                    ? item.prioritas?.includes("P1")
                      ? "bg-red-100 border-red-500 text-red-900 animate-pulse"
                      : "bg-amber-50 border-amber-300 text-amber-900 hover:border-amber-400"
                    : "bg-slate-50 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/30"
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className="font-bold text-xs sm:text-sm text-slate-800">{item.id}</span>
                  <span className={`text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded ${
                    item.status === "PERBAIKAN" 
                      ? item.prioritas?.includes("P1") ? "bg-red-600 text-white" : "bg-amber-200 text-amber-800"
                      : "bg-emerald-100 text-emerald-700"
                  }`}>
                    {item.status}
                  </span>
                </div>
                <p className={`text-[9px] sm:text-[10px] mt-1.5 truncate ${item.status === "PERBAIKAN" ? "text-amber-800 font-semibold" : "text-slate-400"}`}>
                  {item.sub}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Section: Chart & Table */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Grafik Laporan Kendala */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-1">
                <h3 className="font-bold text-sm text-slate-800">Grafik Laporan Kendala</h3>
                <span className="text-[9px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-medium">
                  Sumbu X: Unit / Y: Jumlah
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-3">Distribusi frekuensi laporan per unit RTG terkini</p>

              <div className="relative pl-7 pr-2 pt-3 pb-10 h-52 sm:h-56 border-b border-l border-slate-300">
                <div className="absolute left-0 top-0 bottom-10 flex flex-col justify-between text-[10px] font-semibold text-slate-400 pr-1 text-right w-6">
                  <span>{maxVal}</span>
                  <span>{Math.round(maxVal / 2)}</span>
                  <span>0</span>
                </div>

                <div className="absolute left-6 right-0 top-3 border-b border-dashed border-slate-200"></div>
                <div className="absolute left-6 right-0 top-1/2 border-b border-dashed border-slate-200"></div>

                <div className="flex items-end justify-between gap-2 h-full w-full relative z-10 overflow-x-auto pb-8">
                  {chartData.length === 0 ? (
                    <div className="w-full text-center text-xs text-slate-400 my-auto">
                      Belum ada laporan kendala
                    </div>
                  ) : (
                    chartData.map((bar, idx) => {
                      const barHeightPercent = Math.max(15, Math.round((bar.value / maxVal) * 100));

                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end min-w-[36px] relative">
                          <span className="text-[10px] text-slate-700 font-bold mb-1">{bar.value}</span>
                          <div
                            style={{ height: `${barHeightPercent}%` }}
                            className="w-full max-w-[22px] bg-[#0e5c75] rounded-t-sm hover:bg-emerald-500 transition-all duration-300 shadow-sm"
                          ></div>
                          <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 flex flex-col items-center w-full">
                            <span className="text-[9px] font-bold text-slate-700 whitespace-nowrap">
                              {bar.label.includes("RTG") ? bar.label : `RTG ${bar.label}`}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
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
              <span className="font-semibold text-slate-700">Terselesaikan: 0%</span>
            </div>
          </div>

          {/* Laporan Kendala Terbaru */}
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

              {/* Filter Tombol Kategori Horizontal Scroll */}
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

              {/* TABEL LAPORAN */}
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

      {/* POP-UP MODAL 1: KLIK CARD RTG */}
      {showRtgModal && selectedRtgCard && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg text-slate-900">{selectedRtgCard.id}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  selectedRtgCard.status === "PERBAIKAN"
                    ? "bg-amber-100 text-amber-800 border border-amber-300"
                    : "bg-emerald-100 text-emerald-700 border border-emerald-300"
                }`}>
                  {selectedRtgCard.status === "PERBAIKAN" ? "PERLU PERBAIKAN" : "READY / NORMAL"}
                </span>
              </div>
              <button
                onClick={() => setShowRtgModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {selectedRtgCard.status === "PERBAIKAN" ? (
              <div className="space-y-3 text-xs">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start space-x-2.5 text-amber-900">
                  <AlertOctagon size={20} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-xs">Unit Membutuhkan Tindakan Perbaikan</h4>
                    <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                      Laporan kerusakan aktif terdeteksi untuk unit {selectedRtgCard.id}. Sistem menyarankan penanganan oleh tim teknisi.
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
                    <p className="text-slate-400">Waktu Masuk:</p>
                    <p className="font-bold text-slate-700 mt-0.5">
                      {selectedRtgCard.reportDetails ? `${selectedRtgCard.reportDetails.jam}` : "Terbaru"}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="font-bold text-slate-700 mb-1 flex items-center space-x-1">
                    <Wrench size={13} className="text-slate-500" />
                    <span>Rincian Temuan Kendala Alat:</span>
                  </p>
                  <p className="p-3 bg-red-50 text-red-700 border border-red-100 rounded-xl leading-relaxed text-xs">
                    {selectedRtgCard.reportDetails
                      ? (selectedRtgCard.reportDetails.praOperasi !== "-" ? selectedRtgCard.reportDetails.praOperasi : selectedRtgCard.reportDetails.pascaOperasi)
                      : "Terdeteksi anomali kondisi alat, menunggu detail verifikasi MCC."}
                  </p>
                </div>

                {selectedRtgCard.reportDetails?.pelapor && (
                  <div className="text-[11px] text-slate-500 flex justify-between items-center pt-1 px-1">
                    <span>Pelapor: <strong className="text-slate-700">{selectedRtgCard.reportDetails.pelapor}</strong></span>
                    <span>Status Tiket: <strong className="text-amber-700">{selectedRtgCard.reportDetails.status}</strong></span>
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

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 mt-6 flex flex-col sm:flex-row justify-between items-center text-[11px] text-slate-400 gap-2 text-center sm:text-left">
        <p>© 2026 Terminal Petikemas Surabaya - Sistem Operasional Rubber-Tired Gantry (RTG)</p>
        <div className="flex items-center space-x-3">
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Terminal TOS Connected</span>
          </span>
          <span>TOS Server: V3.4.1-Ops</span>
        </div>
      </footer>
    </div>
  );
}