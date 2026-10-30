"use client";

  import React, { useState, useEffect } from "react";
  import Link from "next/link";
  import { useRouter, usePathname } from "next/navigation";
  import {
    Bell,
    User,
    LogOut,
    RefreshCw,
    FileText,
    AlertOctagon,
    Ticket,
    Clock,
    Users,
    Search,
    CheckCircle2,
    X,
    Camera,
    Check,
    Edit3,
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
    teknisiId?: string;
    teknisiDitugaskanAt?: string;
    teknisiDitugaskanBy?: string;
    waktuMulai?: string;
    waktuSelesai?: string;
    durasiMenit?: number;
    queueTime?: string;
    progres?: number;
    fotoBukti?: string[];
    selectedFiles?: string[];
    namaFoto?: string;
    ukuranFoto?: string;
    ticketId?: string;
    approvedAt?: string;
    approvedBy?: string;
    rejectedAt?: string;
    rejectedBy?: string;
    rejectionReason?: string;
  }

  export default function ApprovalMCCPage() {
    const router = useRouter();
    const pathname = usePathname();
    const [reports, setReports] = useState<Report[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedBlokFilter, setSelectedBlokFilter] = useState("SEMUA");
    const [selectedUrgensiFilter, setSelectedUrgensiFilter] = useState("SEMUA");
    const [selectedTimFilter, setSelectedTimFilter] = useState("SEMUA");

    // State Pop-up Notifikasi & Profil
    const [showNotif, setShowNotif] = useState(false);
    const [showProfile, setShowProfile] = useState(false);

    // State Modal Detail & Approval MCC
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [alasanPenolakan, setAlasanPenolakan] = useState("");
    const [selectedPriority, setSelectedPriority] = useState("");
    const [daftarTeknisi, setDaftarTeknisi] = useState<
      { id: string; nama: string; tersedia?: boolean }[]
    >([]);
    const [selectedTeknisiId, setSelectedTeknisiId] = useState("");

    // State form laporan manual (dinonaktifkan pada halaman approval)
    const [showAddWOModal, setShowAddWOModal] = useState(false);
    const [newRtg, setNewRtg] = useState("");
    const [newBlok, setNewBlok] = useState("BLOK A-01");
    const [newKategori, setNewKategori] = useState("Sistem Hidrolik");
    const [newPrioritas, setNewPrioritas] = useState("CRITICAL P1");
    const [newDeskripsi, setNewDeskripsi] = useState("");

    // Membaca Data Murni dari LocalStorage (Kosong jika belum ada pelaporan)
    const loadData = () => {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("rtg_reports");
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            setReports(parsed);
          } catch (e) {
            console.error("Gagal membaca data rtg_reports:", e);
            setReports([]);
          }
        } else {
          setReports([]);
        }
      }
    };

    useEffect(() => {
      loadData();

      // Roster teknisi dibaca dari store daftar teknisi.
      // Bentuk data yang diharapkan: [{ id, nama, tersedia? }]
      // Jika sumber daftar teknisi di project memakai database/API, ganti bagian ini
      // dengan fetch dari tabel/API tersebut, lalu setDaftarTeknisi(data).
      if (typeof window !== "undefined") {
        try {
          const savedTechnicians = localStorage.getItem("rtg_teknisi");
          if (savedTechnicians) {
            const parsed = JSON.parse(savedTechnicians);
            if (Array.isArray(parsed)) {
              const normalized = parsed
                .map((item: any) => ({
                  id: String(item.id ?? item.teknisiId ?? item.uuid ?? ""),
                  nama: String(item.nama ?? item.name ?? item.full_name ?? item.username ?? ""),
                  tersedia: item.tersedia ?? item.available ?? item.statusAktif ?? true,
                }))
                .filter((item) => item.id && item.nama && item.tersedia !== false);
              setDaftarTeknisi(normalized);
            }
          }
        } catch (error) {
          console.error("Gagal membaca daftar teknisi:", error);
          setDaftarTeknisi([]);
        }
      }
    }, []);

    const saveReports = (updated: Report[]) => {
      setReports(updated);
      if (typeof window !== "undefined") {
        localStorage.setItem("rtg_reports", JSON.stringify(updated));
      }
    };

    const handleResetFilter = () => {
      setSearchTerm("");
      setSelectedBlokFilter("SEMUA");
      setSelectedUrgensiFilter("SEMUA");
      setSelectedTimFilter("SEMUA");
    };

    // Filter Data Berdasarkan Form Pelaporan / Input
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

    // Pengelompokan status laporan untuk proses verifikasi MCC
    const tiketMenunggu = filteredReports.filter(
      (r) =>
        r.status === "MENUNGGU VERIFIKASI MCC" ||
        r.status === "MENUNGGU APPROVAL MCC"
    );
    const tiketDikerjakan = filteredReports.filter(
      (r) =>
        r.status === "MENUNGGU PENANGANAN" ||
        r.status === "SEDANG DIKERJAKAN" ||
        r.status === "PERBAIKAN"
    );
    const tiketSelesai = filteredReports.filter(
      (r) => r.status === "DITOLAK MCC" || r.status === "SELESAI"
    );

    // Perhitungan Ringkasan Statistik Real-Time (Murni Dari Data Input)
    const totalTiketAktif = tiketMenunggu.length + tiketDikerjakan.length;

    const butuhTindakanCepat = reports.filter(
      (r) =>
        (r.status === "MENUNGGU VERIFIKASI MCC" || r.status === "MENUNGGU APPROVAL MCC" || r.status === "MENUNGGU PENANGANAN" || r.status === "PERBAIKAN" || r.status === "SEDANG DIKERJAKAN") &&
        (r.prioritas?.includes("CRITICAL") || r.prioritas?.includes("KRITIS") || r.prioritas?.includes("P1") || r.prioritas?.includes("EMERGENCY"))
    ).length;

    const totalWorkOrder = reports.length;

    const teknisiAktifSet = new Set(
      reports
        .filter((r) => r.status === "SEDANG DIKERJAKAN" && r.teknisi && r.teknisi !== "Belum Ditugaskan")
        .map((r) => r.teknisi)
    );
    const totalTeknisiOnDuty = teknisiAktifSet.size;

    // Approval MCC: laporan yang disetujui otomatis dibuatkan ticket untuk tim teknisi.
    const handleApproveReport = (reportId: number, priority: string, technicianId: string) => {
      const report = reports.find((r) => r.id === reportId);
      if (!report) return;

      if (!["URGENT P1", "MEDIUM P2", "BASIC P3"].includes(priority)) {
        alert("Pilih prioritas laporan terlebih dahulu.");
        return;
      }

      const teknisiTerpilih = daftarTeknisi.find((item) => item.id === technicianId);
      if (!teknisiTerpilih) {
        alert("Pilih teknisi yang tersedia terlebih dahulu.");
        return;
      }

      if (report.status !== "MENUNGGU VERIFIKASI MCC" && report.status !== "MENUNGGU APPROVAL MCC") {
        alert("Laporan ini sudah diproses atau tidak lagi menunggu approval MCC.");
        return;
      }

      const ticketId = report.ticketId || `WO-RTG-${String(report.id).slice(-6)}`;
      const approvedAt = new Date().toLocaleString("id-ID", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit"
      }) + " WIB";

      const updated = reports.map((r) => {
        if (r.id !== reportId) return r;
        return {
          ...r,
          status: "MENUNGGU PENANGANAN",
          prioritas: priority,
          ticketId,
          approvedAt,
          approvedBy: "MCC",
          teknisi: teknisiTerpilih.nama,
          teknisiId: teknisiTerpilih.id,
          teknisiDitugaskanAt: approvedAt,
          teknisiDitugaskanBy: "MCC",
          queueTime: "Baru saja",
        };
      });

      saveReports(updated);
      setSelectedReport(null);
      setShowDetailModal(false);
      setAlasanPenolakan("");
      setSelectedPriority("");
      setSelectedTeknisiId("");
      alert(`Laporan disetujui. Ticket ${ticketId} ditugaskan kepada ${teknisiTerpilih.nama} dan diteruskan ke Penanganan Teknis.`);
    };

    // Reject MCC: simpan status penolakan dan alasan agar dapat ditelusuri.
    const handleRejectReport = (reportId: number) => {
      if (!alasanPenolakan.trim()) {
        alert("Masukkan alasan penolakan laporan.");
        return;
      }

      const report = reports.find((r) => r.id === reportId);
      if (!report) return;

      const updated = reports.map((r) => {
        if (r.id !== reportId) return r;
        return {
          ...r,
          status: "DITOLAK MCC",
          rejectedAt: new Date().toLocaleString("id-ID", {
            day: "2-digit", month: "2-digit", year: "numeric",
            hour: "2-digit", minute: "2-digit"
          }) + " WIB",
          rejectedBy: "MCC",
          rejectionReason: alasanPenolakan.trim(),
        };
      });

      saveReports(updated);
      setSelectedReport(null);
      setShowDetailModal(false);
      setAlasanPenolakan("");
    };

    return (
      <div className="min-h-screen bg-slate-100 text-slate-800 font-sans text-xs pb-10">
        {/* Header / Navbar */}
        <header className="bg-[#0b3c3c] text-white px-8 py-3.5 flex items-center justify-between shadow-md relative z-50">
          <div className="flex items-center space-x-3.5">
            <div className="bg-emerald-600 p-2 rounded-lg shadow-sm">
              <span className="font-extrabold text-sm uppercase tracking-wider text-white">RTG</span>
            </div>
            <div>
              <h1 className="font-bold text-base leading-none tracking-tight flex items-center space-x-2">
                <span>PELAPORAN RTG</span>
                <span className="bg-emerald-500/30 text-emerald-200 text-[9px] font-medium px-2 py-0.5 rounded border border-emerald-400/30">
                  TOS LIVE
                </span>
              </h1>
              <p className="text-[10px] text-emerald-200 mt-0.5">OPERASIONAL LAPANGAN TERMINAL PETIKEMAS SURABAYA</p>
            </div>
          </div>

          <nav className="flex items-center space-x-2 bg-[#082e2e] p-1.5 rounded-full text-xs shadow-inner">
            <Link
              href="/form-pelaporan"
              className={`px-5 py-2 rounded-full transition font-semibold ${
                pathname === "/form-pelaporan" ? "bg-white text-[#0b3c3c] shadow" : "text-slate-300 hover:text-white"
              }`}
            >
              Form Pelaporan
            </Link>

            <Link
            href="/verifikasi-mcc"
            className={`px-5 py-2 rounded-full transition font-semibold ${
              pathname === "/verifikasi-mcc" ? "bg-white text-[#0b3c3c] shadow" : "text-slate-300 hover:text-white"
            }`}
          >
            Approval MCC
          </Link>
          
            <Link
              href="/dasboard"
              className={`px-5 py-2 rounded-full transition font-semibold ${
                pathname === "/dasboard" ? "bg-white text-[#0b3c3c] shadow" : "text-slate-300 hover:text-white"
              }`}
            >
              Dashboard Monitoring
            </Link>
            <Link
              href="/penanganan-teknis"
              className={`px-5 py-2 rounded-full transition font-semibold ${
                pathname === "/penanganan-teknis" ? "bg-white text-[#0b3c3c] shadow" : "text-slate-300 hover:text-white"
              }`}
            >
              Penanganan Teknis
            </Link>
          </nav>

          {/* Notifikasi & Profile Pop-up */}
          <div className="flex items-center space-x-4">
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotif(!showNotif);
                  setShowProfile(false);
                }}
                className="p-2 text-slate-200 hover:text-white rounded-full hover:bg-[#134e4e] transition relative"
              >
                <Bell size={18} />
                {reports.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                )}
              </button>

              {showNotif && (
                <div className="absolute right-0 mt-3 w-80 bg-white text-slate-800 rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50">
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
                }}
                className="flex items-center space-x-2.5 bg-[#134e4e] hover:bg-[#185d5d] px-3.5 py-1.5 rounded-full text-xs transition border border-emerald-700/50 cursor-pointer"
              >
                <div className="p-1 bg-emerald-500 rounded-full text-white">
                  <User size={14} />
                </div>
                <div className="text-left leading-tight">
                  <p className="font-semibold text-white text-[11px]">Supervisi Lapangan</p>
                  <p className="text-[9px] text-emerald-200">Shift A • Pier 2</p>
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

        {/* Main Container */}
        <main className="max-w-7xl mx-auto px-6 mt-6 space-y-5">
          {/* Title & Action Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Approval Laporan Kendala RTG oleh MCC</h2>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>LIVE TOS SYNC</span>
                </span>
              </div>
              <p className="text-slate-500 text-xs mt-0.5">
                Daftar laporan kendala RTG yang menunggu verifikasi MCC. Laporan yang disetujui akan otomatis dibuatkan ticket untuk diteruskan ke teknisi.
              </p>
            </div>

            <div className="flex items-center space-x-2.5">
              <button
                onClick={loadData}
                className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 px-3.5 py-2 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition shadow-sm"
              >
                <RefreshCw size={14} />
                <span>Refresh Data</span>
              </button>


            </div>
          </div>

          {/* Top Summary Cards (Statistik Awal Berjumlah 0) */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-start shadow-sm">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">LAPORAN MENUNGGU MCC</p>
                <h3 className="text-2xl font-extrabold mt-1 text-slate-800">
                  {tiketMenunggu.length} <span className="text-xs font-normal text-slate-500">Laporan</span>
                </h3>
              </div>
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl"><FileText size={20} /></div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-start shadow-sm border-l-4 border-l-red-500">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">LAPORAN PRIORITAS TINGGI</p>
                <h3 className="text-2xl font-extrabold mt-1 text-red-600">
                  {butuhTindakanCepat} <span className="text-xs font-normal text-slate-500">(Unit)</span>
                </h3>
              </div>
              <div className="p-2.5 bg-red-50 text-red-500 rounded-xl"><AlertOctagon size={20} /></div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-start shadow-sm">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">TIKET DIBUAT</p>
                <h3 className="text-2xl font-extrabold mt-1 text-slate-800">
                  {reports.filter((r) => !!r.ticketId).length} <span className="text-xs font-normal text-slate-500">Ticket</span>
                </h3>
              </div>
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl"><Ticket size={20} /></div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-start shadow-sm">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">LAPORAN DIPROSES</p>
                <h3 className="text-2xl font-extrabold mt-1 text-slate-800">
                  {totalTeknisiOnDuty} <span className="text-xs font-normal text-slate-500">Personel Aktif</span>
                </h3>
              </div>
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl"><Users size={20} /></div>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 justify-between items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari laporan, nomor RTG, atau pelapor..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              <select
                value={selectedBlokFilter}
                onChange={(e) => setSelectedBlokFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="SEMUA">Semua Blok (A, B, C, D, E)</option>
                <option value="A">Blok A</option>
                <option value="B">Blok B</option>
                <option value="C">Blok C</option>
                <option value="D">Blok D</option>
                <option value="E">Blok E</option>
              </select>

              <select
                value={selectedUrgensiFilter}
                onChange={(e) => setSelectedUrgensiFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="SEMUA">Tingkat Urgensi: Semua</option>
                <option value="CRITICAL">Urgent P1</option>
                <option value="HIGH">Medium P2</option>
                <option value="MEDIUM">Basic P3</option>
              </select>

              <select
                value={selectedTimFilter}
                onChange={(e) => setSelectedTimFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="SEMUA">Semua Kategori Kendala</option>
                <option value="Hidrolik">Tim Hidrolik</option>
                <option value="Spreader">Tim Spreader</option>
                <option value="Mekanikal">Tim Mekanikal</option>
                <option value="Elektrikal">Tim Elektrikal/Genset</option>
              </select>

              <span className="bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-medium px-2.5 py-1.5 rounded-lg flex items-center space-x-1">
                <Clock size={12} />
                <span>Peran: MCC</span>
              </span>

              <button
                onClick={handleResetFilter}
                className="text-slate-500 hover:text-slate-800 text-xs font-semibold px-2 py-1 transition"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Kanban Board Layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* KOLOM 1: MENUNGGU VERIFIKASI MCC */}
            <div className="bg-slate-200/50 p-4 rounded-xl border border-slate-200 flex flex-col h-[450px] min-h-0">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">MENUNGGU VERIFIKASI MCC</h3>
                  <span className="bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded-full text-[11px]">
                    {tiketMenunggu.length}
                  </span>
                </div>
              </div>

              <div className="space-y-3.5 flex-1 min-h-0 overflow-y-auto pr-2 flex flex-col">
                {tiketMenunggu.length === 0 ? (
                  <div className="bg-white/80 rounded-xl p-8 text-center text-xs text-slate-400 border border-dashed border-slate-300 my-auto flex flex-col items-center justify-center">
                    <FileText className="mb-2 text-slate-300" size={28} />
                    <span>Belum ada laporan yang menunggu verifikasi MCC.</span>
                    <span className="text-[10px] text-slate-400 mt-1">Laporan operator akan muncul di sini untuk diverifikasi.</span>
                  </div>
                ) : (
                  tiketMenunggu.map((item) => (
                    <div key={item.id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 space-y-2.5">
                      <div className="flex justify-between items-start">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                          item.prioritas?.includes("CRITICAL") || item.prioritas?.includes("KRITIS")
                            ? "bg-red-100 text-red-700 border border-red-200"
                            : item.prioritas?.includes("HIGH")
                            ? "bg-amber-100 text-amber-800"
                            : item.prioritas?.includes("MEDIUM")
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-slate-100 text-slate-600"
                        }`}>
                          {item.prioritas || "MEDIUM P3"}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">Queue: {item.queueTime || "Baru saja"}</span>
                      </div>

                      <div>
                        <div className="flex items-baseline space-x-2">
                          <span className="font-extrabold text-sm text-slate-900">{item.rtg}</span>
                          <span className="font-bold text-xs text-slate-800">• {item.kategori}</span>
                        </div>
                        <p className="text-slate-500 text-[11px] mt-1 line-clamp-2 leading-relaxed">
                          {item.praOperasi !== "-" ? item.praOperasi : item.pascaOperasi}
                        </p>
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                        <span className="text-[10px] text-slate-500 font-semibold flex items-center space-x-1">
                          <span>📍{item.lokasi}</span>
                        </span>
                        <button
                          onClick={() => {
                            setSelectedReport(item);
                            setSelectedPriority(
                              ["URGENT P1", "MEDIUM P2", "BASIC P3"].includes(item.prioritas || "")
                                ? item.prioritas || ""
                                : ""
                            );
                            setSelectedTeknisiId(item.teknisiId || "");
                            setAlasanPenolakan("");
                            setShowDetailModal(true);
                          }}
                          className="px-3.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition"
                        >
                          Verifikasi
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* KOLOM 2: TIKET DITERUSKAN */}
            <div className="bg-slate-200/50 p-4 rounded-xl border border-slate-200 flex flex-col h-[450px] min-h-0">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">TIKET DITERUSKAN</h3>
                  <span className="bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full text-[11px]">
                    {tiketDikerjakan.length}
                  </span>
                </div>
              </div>

              <div className="space-y-3.5 flex-1 min-h-0 overflow-y-auto pr-2 flex flex-col">
                {tiketDikerjakan.length === 0 ? (
                  <div className="bg-white/80 rounded-xl p-8 text-center text-xs text-slate-400 border border-dashed border-slate-300 my-auto flex flex-col items-center justify-center">
                    <Clock className="mb-2 text-slate-300" size={28} />
                    <span>Tidak ada unit sedang dikerjakan.</span>
                  </div>
                ) : (
                  tiketDikerjakan.map((item) => (
                    <div key={item.id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 space-y-3">
                      <div className="flex justify-between items-start">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                          item.prioritas?.includes("KRITIS") || item.prioritas?.includes("CRITICAL")
                            ? "bg-red-100 text-red-700"
                            : "bg-blue-100 text-blue-800"
                        }`}>
                          {item.prioritas || "HIGH P2"} • AKTIF
                        </span>
                        <div className="text-right">
                          <span className="text-[11px] text-slate-500 font-medium">
                            ⏱ Mulai: {item.waktuMulai || "08:00"}
                          </span>
                          <div className="bg-blue-100 text-blue-800 font-bold text-[10px] px-2 py-0.5 rounded mt-1">
                            {item.lokasi}
                          </div>
                        </div>
                      </div>

                      <div>
                        <span className="font-extrabold text-sm text-slate-900 block">{item.rtg}</span>
                        <h4 className="font-bold text-xs text-slate-800 mt-0.5">{item.kategori}</h4>
                        <p className="text-slate-500 text-[11px] mt-1 line-clamp-2">{item.praOperasi}</p>
                      </div>

                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-1 text-[11px]">
                        <div className="flex justify-between text-slate-600">
                          <span>TEKNISI BERTUGAS</span>
                        </div>
                        <div className="font-bold text-slate-800">
                          <span>{item.teknisi || "Belum Ditugaskan"}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <button
                          onClick={() => alert(`Log update untuk ${item.rtg}`)}
                          className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold transition flex items-center space-x-1"
                        >
                          <Edit3 size={13} />
                          <span>Lihat Detail</span>
                        </button>

                        <button
                          onClick={() =>
                            alert(
                              item.ticketId
                                ? `Ticket ${item.ticketId} sudah dibuat dan diteruskan ke teknisi.`
                                : "Ticket belum tersedia untuk laporan ini."
                            )
                          }
                          className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition shadow-sm flex items-center space-x-1"
                        >
                          <CheckCircle2 size={13} />
                          <span>{item.ticketId ? item.ticketId : "Ticket Dibuat"}</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* KOLOM 3: DITOLAK / SELESAI */}
            <div className="bg-slate-200/50 p-4 rounded-xl border border-slate-200 flex flex-col h-[450px] min-h-0">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">DITOLAK / SELESAI</h3>
                  <span className="bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full text-[11px]">
                    {tiketSelesai.length}
                  </span>
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
                        <div className="flex items-center space-x-2">
                          <span className="bg-emerald-100 text-emerald-700 font-extrabold text-[10px] px-2 py-0.5 rounded flex items-center space-x-1">
                            <Check size={12} />
                            <span>FOTO OK</span>
                          </span>
                          <span className="bg-blue-50 text-blue-700 font-bold text-[10px] px-2 py-0.5 rounded">
                            VERIFIED
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[11px] font-bold text-slate-700 block">{item.waktuSelesai || "Selesai"}</span>
                          <span className="bg-blue-100 text-blue-800 font-bold text-[10px] px-2 py-0.5 rounded">
                            {item.lokasi}
                          </span>
                        </div>
                      </div>

                      <div>
                        <span className="font-extrabold text-sm text-slate-900 block">{item.rtg}</span>
                        <h4 className="font-bold text-xs text-slate-800 mt-0.5">{item.kategori}</h4>
                        <p className="text-slate-500 text-[11px] mt-1 line-clamp-2">{item.praOperasi}</p>
                      </div>

                      {((item.fotoBukti && item.fotoBukti.length > 0) || (item.selectedFiles && item.selectedFiles.length > 0)) && (
                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 flex items-center space-x-2">
                          <div className="w-8 h-8 bg-slate-200 rounded flex items-center justify-center text-slate-500 shrink-0">
                            <Camera size={16} />
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-[10px] font-bold text-slate-700 truncate">✓ Bukti Foto Terlampir</p>
                            <p className="text-[9px] text-slate-400 truncate">
                              {item.namaFoto || "Lampiran Kerusakan"}
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="flex justify-between items-center pt-1 border-t border-slate-100 text-[11px]">
                        <span className="text-slate-500">Teknisi: <strong className="text-slate-800">{item.teknisi || "-"}</strong></span>
                        <button
                          onClick={() => {
                            setSelectedReport(item);
                            setSelectedPriority(
                              ["URGENT P1", "MEDIUM P2", "BASIC P3"].includes(item.prioritas || "")
                                ? item.prioritas || ""
                                : ""
                            );
                            setSelectedTeknisiId(item.teknisiId || "");
                            setAlasanPenolakan("");
                            setShowDetailModal(true);
                          }}
                          className="text-blue-600 font-semibold hover:underline flex items-center space-x-0.5"
                        >
                          <span>Detail Laporan →</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </main>

        {/* MODAL 1: DETAIL TIKET & PENUGASAN */}
        {showDetailModal && selectedReport && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">
                    LAPORAN #{selectedReport.id.toString().slice(-6)}
                  </span>
                  <h3 className="text-base font-bold text-slate-800 mt-1">
                    Detail Kendala Unit {selectedReport.rtg}
                  </h3>
                </div>
                <button onClick={() => setShowDetailModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
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
                    <label htmlFor="mcc-priority" className="text-slate-400 block mb-1">
                      Prioritas MCC:
                    </label>
                    {selectedReport.status === "MENUNGGU VERIFIKASI MCC" ||
                    selectedReport.status === "MENUNGGU APPROVAL MCC" ? (
                      <select
                        id="mcc-priority"
                        value={selectedPriority}
                        onChange={(e) => setSelectedPriority(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-emerald-500"
                      >
                        <option value="">Pilih prioritas...</option>
                        <option value="URGENT P1">Priority 1</option>
                        <option value="MEDIUM P2">Priority 2</option>
                        <option value="BASIC P3">Priority 3</option>
                      </select>
                    ) : (
                      <p className="font-bold text-red-600">
                        {selectedReport.prioritas || "Belum ditetapkan"}
                      </p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="mcc-technician" className="text-slate-400 block mb-1">
                      Teknisi Ditugaskan:
                    </label>
                    {selectedReport.status === "MENUNGGU VERIFIKASI MCC" ||
                    selectedReport.status === "MENUNGGU APPROVAL MCC" ? (
                      <select
                        id="mcc-technician"
                        value={selectedTeknisiId}
                        onChange={(e) => setSelectedTeknisiId(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-emerald-500"
                      >
                        <option value="">Pilih teknisi tersedia...</option>
                        {daftarTeknisi.map((teknisi) => (
                          <option key={teknisi.id} value={teknisi.id}>
                            {teknisi.nama}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="font-bold text-slate-700">
                        {selectedReport.teknisi || "Belum Ditugaskan"}
                      </p>
                    )}
                    {daftarTeknisi.length === 0 &&
                      (selectedReport.status === "MENUNGGU VERIFIKASI MCC" ||
                        selectedReport.status === "MENUNGGU APPROVAL MCC") && (
                        <p className="mt-1 text-[10px] text-amber-700">
                          Daftar teknisi belum tersedia. Hubungkan roster teknisi dari database/API.
                        </p>
                      )}
                  </div>

                  <div>
                    <p className="text-slate-400">Kategori Kendala:</p>
                    <p className="font-bold text-slate-700">{selectedReport.kategori}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Waktu Masuk:</p>
                    <p className="font-bold text-slate-700">{selectedReport.jam}</p>
                  </div>
                </div>

                <div>
                  <p className="font-bold text-slate-700 mb-1">Deskripsi Permasalahan:</p>
                  <p className="p-3 bg-red-50 text-red-700 rounded-lg">
                    {selectedReport.praOperasi !== "-" ? selectedReport.praOperasi : selectedReport.pascaOperasi}
                  </p>
                </div>

                {selectedReport.status === "MENUNGGU VERIFIKASI MCC" ||
                selectedReport.status === "MENUNGGU APPROVAL MCC" ? (
                  <div className="pt-2 border-t border-slate-100">
                    <label className="font-bold text-slate-700 block mb-1">Keputusan Verifikasi MCC:</label>
                    <textarea
                      rows={2}
                      value={alasanPenolakan}
                      onChange={(e) => setAlasanPenolakan(e.target.value)}
                      placeholder="Catatan MCC / alasan penolakan (wajib diisi jika Reject)"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleApproveReport(selectedReport.id, selectedPriority, selectedTeknisiId)}
                        disabled={!selectedPriority || !selectedTeknisiId}

                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Approve & Buat Ticket
                      </button>
                      <button
                        onClick={() => handleRejectReport(selectedReport.id)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition shrink-0"
                      >
                        Reject Laporan
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="pt-2 border-t border-slate-100 text-xs text-slate-600">
                    <p><strong>Status:</strong> {selectedReport.status}</p>
                    {selectedReport.ticketId && <p><strong>Ticket ID:</strong> {selectedReport.ticketId}</p>}
                    {selectedReport.rejectionReason && <p><strong>Alasan Reject:</strong> {selectedReport.rejectionReason}</p>}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-200"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="max-w-7xl mx-auto px-6 mt-6 flex justify-between items-center text-[10px] text-slate-400 border-t border-slate-200/60 pt-4">
          <p>© 2026 Terminal Petikemas Surabaya - Sistem Operasional Rubber-Tired Gantry (RTG). Hak Cipta Dilindungi.</p>
          <div className="flex items-center space-x-3">
            <span className="flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span className="text-slate-600 font-medium">Terminal TOS Connected</span>
            </span>
            <span>• TOS Server: V3.4.1-Ops</span>
          </div>
        </footer>
      </div>
    );
  }