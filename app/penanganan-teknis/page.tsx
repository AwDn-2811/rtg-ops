"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Bell,
  User,
  LogOut,
  RefreshCw,
  FileText,
  AlertOctagon,
  Clock,
  Users,
  Search,
  CheckCircle2,
  X,
  Plus,
  Camera,
  Check,
  Edit3,
  ImageIcon,
  Maximize2,
  Wrench,
  UploadCloud,
  Info,
  ShieldCheck,
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
  waktuMulai?: string;
  waktuSelesai?: string;
  durasiMenit?: number;
  queueTime?: string;
  progres?: number;
  fotoBukti?: string[];
  fotoSelesai?: string[];
  selectedFiles?: string[];
  catatanPerbaikan?: string;
  catatanSelesai?: string;
}

export default function PenangananTeknisPage() {
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

  // State Modal Detail & Penugasan
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [namaTeknisiInput, setNamaTeknisiInput] = useState("");

  // State Modal Update Log (Sesuai Desain Rujukan 1)
  const [showUpdateLogModal, setShowUpdateLogModal] = useState(false);
  const [selectedReportForLog, setSelectedReportForLog] = useState<Report | null>(null);
  const [progresVal, setProgresVal] = useState(25);
  const [catatanInput, setCatatanInput] = useState("");

  // State Modal Selesaikan Work Order (Sesuai Desain Rujukan 2)
  const [showSelesaiModal, setShowSelesaiModal] = useState(false);
  const [selectedReportForSelesai, setSelectedReportForSelesai] = useState<Report | null>(null);
  const [catatanSelesaiInput, setCatatanSelesaiInput] = useState("");
  const [fotoSelesaiFiles, setFotoSelesaiFiles] = useState<File[]>([]);
  const fileInputSelesaiRef = useRef<HTMLInputElement>(null);

  // State Modal Preview Gambar
  const [activeImagePreview, setActiveImagePreview] = useState<string | null>(null);

  // State Modal Work Order Manual Baru
  const [showAddWOModal, setShowAddWOModal] = useState(false);
  const [newRtg, setNewRtg] = useState("");
  const [newBlok, setNewBlok] = useState("BLOK A-01");
  const [newKategori, setNewKategori] = useState("Sistem Hidrolik");
  const [newPrioritas, setNewPrioritas] = useState("CRITICAL P1");
  const [newDeskripsi, setNewDeskripsi] = useState("");

  // Membaca Data Murni dari LocalStorage
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

  // Filter Data
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

  // Pengelompokan Status Tiket
  const tiketMenunggu = filteredReports.filter(
    (r) => r.status === "MENUNGGU PENANGANAN" || r.status === "PERBAIKAN"
  );
  const tiketDikerjakan = filteredReports.filter((r) => r.status === "SEDANG DIKERJAKAN");
  const tiketSelesai = filteredReports.filter((r) => r.status === "SELESAI");

  // Ringkasan Statistik
  const totalTiketAktif = tiketMenunggu.length + tiketDikerjakan.length;

  const butuhTindakanCepat = reports.filter(
    (r) =>
      (r.status === "MENUNGGU PENANGANAN" || r.status === "PERBAIKAN" || r.status === "SEDANG DIKERJAKAN") &&
      (r.prioritas?.includes("CRITICAL") || r.prioritas?.includes("KRITIS") || r.prioritas?.includes("P1") || r.prioritas?.includes("EMERGENCY"))
  ).length;

  const completedReports = reports.filter((r) => r.status === "SELESAI" && r.durasiMenit);
  const totalDurasi = completedReports.reduce((acc, curr) => acc + (curr.durasiMenit || 0), 0);
  const rataRataMTTR = completedReports.length > 0 ? Math.round(totalDurasi / completedReports.length) : 0;

  const teknisiAktifSet = new Set(
    reports
      .filter((r) => r.status === "SEDANG DIKERJAKAN" && r.teknisi && r.teknisi !== "Belum Ditugaskan")
      .map((r) => r.teknisi)
  );
  const totalTeknisiOnDuty = teknisiAktifSet.size;

  // Aksi Penugasan Teknisi
  const handleTugaskanTeknisi = (reportId: number) => {
    if (!namaTeknisiInput.trim()) {
      alert("Masukkan nama teknisi penanggung jawab!");
      return;
    }
    const jamSekarang = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    const updated = reports.map((r) => {
      if (r.id === reportId) {
        return {
          ...r,
          status: "SEDANG DIKERJAKAN",
          teknisi: namaTeknisiInput.trim(),
          waktuMulai: jamSekarang,
          progres: 25,
        };
      }
      return r;
    });
    saveReports(updated);
    setNamaTeknisiInput("");
    setShowDetailModal(false);
  };

  // Handler Buka Modal Update Log
  const handleOpenUpdateLog = (report: Report) => {
    setSelectedReportForLog(report);
    setProgresVal(report.progres || 25);
    setCatatanInput(report.catatanPerbaikan || "");
    setShowUpdateLogModal(true);
  };

  // Handler Simpan Update Log
  const handleSaveUpdateLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReportForLog) return;

    const updated = reports.map((r) => {
      if (r.id === selectedReportForLog.id) {
        return {
          ...r,
          progres: progresVal,
          catatanPerbaikan: catatanInput,
        };
      }
      return r;
    });

    saveReports(updated);
    setShowUpdateLogModal(false);
    setSelectedReportForLog(null);
    setCatatanInput("");
  };

  // Handler Buka Modal Selesaikan Work Order
  const handleOpenSelesaikanModal = (report: Report) => {
    setSelectedReportForSelesai(report);
    setCatatanSelesaiInput(report.catatanSelesai || "");
    setFotoSelesaiFiles([]);
    setShowSelesaiModal(true);
  };

  // Handler File Upload Foto Selesai
  const handleFotoSelesaiChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArr = Array.from(e.target.files);
      setFotoSelesaiFiles((prev) => [...prev, ...filesArr].slice(0, 3));
    }
  };

  // Handler Simpan Penyelesaian Work Order
  const handleConfirmSelesaikan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReportForSelesai) return;

    try {
      // Process file conversion to Base64
      const fotoBase64Promises = fotoSelesaiFiles.map((file) => {
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (err) => reject(err);
          reader.readAsDataURL(file);
        });
      });

      const fotoBase64Array = await Promise.all(fotoBase64Promises);
      const jamSekarang = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB";

      const updated = reports.map((r) => {
        if (r.id === selectedReportForSelesai.id) {
          return {
            ...r,
            status: "SELESAI",
            waktuSelesai: jamSekarang,
            durasiMenit: r.durasiMenit || 30,
            progres: 100,
            catatanSelesai: catatanSelesaiInput,
            fotoSelesai: fotoBase64Array.length > 0 ? fotoBase64Array : r.fotoBukti,
          };
        }
        return r;
      });

      saveReports(updated);
      setShowSelesaiModal(false);
      setSelectedReportForSelesai(null);
      setCatatanSelesaiInput("");
      setFotoSelesaiFiles([]);
    } catch (err) {
      console.error("Gagal menyimpan foto bukti selesai:", err);
      alert("Terjadi kesalahan saat mengunggah foto bukti.");
    }
  };

  // Submit Work Order Manual
  const handleCreateWOManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRtg || !newDeskripsi) {
      alert("Isi nomor RTG dan deskripsi permasalahan!");
      return;
    }

    const jamSekarang = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB";
    const newReport: Report = {
      id: Date.now(),
      tanggal: new Date().toISOString().split("T")[0],
      jam: jamSekarang,
      rtg: newRtg.toUpperCase().startsWith("RTG") ? newRtg.toUpperCase() : `RTG-${newRtg}`,
      lokasi: newBlok,
      pelapor: "Supervisi Lapangan",
      praOperasi: newDeskripsi,
      pascaOperasi: "-",
      kategori: newKategori,
      prioritas: newPrioritas,
      status: "MENUNGGU PENANGANAN",
      queueTime: "Baru saja",
    };

    saveReports([newReport, ...reports]);
    setShowAddWOModal(false);
    setNewRtg("");
    setNewDeskripsi("");
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
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Monitoring & Penanganan Teknisi RTG</h2>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>LIVE TOS SYNC</span>
              </span>
            </div>
            <p className="text-slate-500 text-xs mt-0.5">
              Papan kendali work order penanganan kerusakan, inspeksi mekanikal-elektrikal, dan alokasi tim teknisi lapangan secara real-time.
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

            <button
              onClick={() => setShowAddWOModal(true)}
              className="bg-[#0e5c75] hover:bg-[#0b485c] text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition shadow-sm"
            >
              <Plus size={16} />
              <span>Tambah Work Order Manual</span>
            </button>
          </div>
        </div>

        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-start shadow-sm">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">TOTAL RTG AKTIF</p>
              <h3 className="text-2xl font-extrabold mt-1 text-slate-800">
                {totalTiketAktif} <span className="text-xs font-normal text-slate-500">UNIT</span>
              </h3>
            </div>
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl"><FileText size={20} /></div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-start shadow-sm border-l-4 border-l-red-500">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">RTG PERLU PERBAIKAN</p>
              <h3 className="text-2xl font-extrabold mt-1 text-red-600">
                {butuhTindakanCepat} <span className="text-xs font-normal text-slate-500">(P1/High)</span>
              </h3>
            </div>
            <div className="p-2.5 bg-red-50 text-red-500 rounded-xl"><AlertOctagon size={20} /></div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-start shadow-sm">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">WAKTU PENGERJAAN </p>
              <h3 className="text-2xl font-extrabold mt-1 text-slate-800">
                {rataRataMTTR} <span className="text-xs font-normal text-slate-500">Menit</span>
              </h3>
            </div>
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl"><Clock size={20} /></div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-start shadow-sm">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">TEKNISI ON-DUTY</p>
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
              placeholder="Cari tiket, ID RTG, atau teknisi..."
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
              <option value="HIGH">High P1</option>
              <option value="MEDIUM">Medium P2</option>
              <option value="NORMAL">Low P3</option>
            </select>

            <select
              value={selectedTimFilter}
              onChange={(e) => setSelectedTimFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="SEMUA">Semua Tim Penugasan</option>
              <option value="Hidrolik">Tim Hidrolik</option>
              <option value="Spreader">Tim Spreader</option>
              <option value="Mekanikal">Tim Mekanikal</option>
              <option value="Elektrikal">Tim Elektrikal/Genset</option>
            </select>

            <span className="bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-medium px-2.5 py-1.5 rounded-lg flex items-center space-x-1">
              <Clock size={12} />
              <span>Filter Aktif: Shift 1 Pagi</span>
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
          {/* KOLOM 1: MENUNGGU PENANGANAN */}
          <div className="bg-slate-200/50 p-4 rounded-xl border border-slate-200 flex flex-col min-h-[450px]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">MENUNGGU PENANGANAN</h3>
                <span className="bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded-full text-[11px]">
                  {tiketMenunggu.length}
                </span>
              </div>
            </div>

            <div className="space-y-3.5 flex-1 flex flex-col">
              {tiketMenunggu.length === 0 ? (
                <div className="bg-white/80 rounded-xl p-8 text-center text-xs text-slate-400 border border-dashed border-slate-300 my-auto flex flex-col items-center justify-center">
                  <FileText className="mb-2 text-slate-300" size={28} />
                  <span>Belum ada laporan menunggu penanganan.</span>
                  <span className="text-[10px] text-slate-400 mt-1">Data akan muncul setelah mengisi Form Pelaporan.</span>
                </div>
              ) : (
                tiketMenunggu.map((item) => {
                  const hasPhotos = item.fotoBukti && item.fotoBukti.length > 0;
                  const hasFiles = item.selectedFiles && item.selectedFiles.length > 0;

                  return (
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

                      {/* TAMPILAN GAMBAR BUKTI */}
                      {hasPhotos ? (
                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-bold text-slate-600">
                            <span className="flex items-center space-x-1">
                              <Camera size={12} className="text-emerald-600" />
                              <span>Bukti Foto Kerusakan ({item.fotoBukti?.length})</span>
                            </span>
                          </div>
                          <div className="flex gap-1.5 overflow-x-auto pt-1">
                            {item.fotoBukti?.map((imgSrc, imgIdx) => (
                              <div
                                key={imgIdx}
                                onClick={() => setActiveImagePreview(imgSrc)}
                                className="relative group w-12 h-12 rounded overflow-hidden border border-slate-200 cursor-pointer shrink-0 bg-slate-200"
                              >
                                <img src={imgSrc} alt="Bukti" className="w-full h-full object-cover group-hover:scale-105 transition" />
                                <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                                  <Maximize2 size={10} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : hasFiles ? (
                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 flex items-center space-x-2">
                          <ImageIcon size={16} className="text-slate-500 shrink-0" />
                          <span className="text-[10px] font-bold text-slate-600 truncate">{item.selectedFiles?.join(", ")}</span>
                        </div>
                      ) : null}

                      <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                        <span className="text-[10px] text-slate-500 font-semibold flex items-center space-x-1">
                          <span>📍 {item.lokasi}</span>
                        </span>
                        <button
                          onClick={() => {
                            setSelectedReport(item);
                            setShowDetailModal(true);
                          }}
                          className="px-3.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition"
                        >
                          Tugaskan
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* KOLOM 2: SEDANG DIKERJAKAN */}
          <div className="bg-slate-200/50 p-4 rounded-xl border border-slate-200 flex flex-col min-h-[450px]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">SEDANG DIKERJAKAN</h3>
                <span className="bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full text-[11px]">
                  {tiketDikerjakan.length}
                </span>
              </div>
            </div>

            <div className="space-y-3.5 flex-1 flex flex-col">
              {tiketDikerjakan.length === 0 ? (
                <div className="bg-white/80 rounded-xl p-8 text-center text-xs text-slate-400 border border-dashed border-slate-300 my-auto flex flex-col items-center justify-center">
                  <Clock className="mb-2 text-slate-300" size={28} />
                  <span>Tidak ada unit sedang dikerjakan.</span>
                </div>
              ) : (
                tiketDikerjakan.map((item) => {
                  const hasPhotos = item.fotoBukti && item.fotoBukti.length > 0;

                  return (
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

                      {/* Preview foto saat sedang dikerjakan */}
                      {hasPhotos && (
                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 flex items-center space-x-2">
                          <div className="w-10 h-10 rounded overflow-hidden border border-slate-200 shrink-0 bg-slate-200">
                            <img src={item.fotoBukti?.[0]} alt="Bukti" className="w-full h-full object-cover" />
                          </div>
                          <button
                            onClick={() => setActiveImagePreview(item.fotoBukti?.[0] || null)}
                            className="text-[10px] text-blue-600 underline font-semibold"
                          >
                            Lihat Foto Kerusakan ({item.fotoBukti?.length})
                          </button>
                        </div>
                      )}

                      {/* CATATAN LOG ACTION JIKA SUDAH DIISI */}
                      {item.catatanPerbaikan && (
                        <div className="bg-blue-50/70 p-2 rounded-lg border border-blue-200/60 text-[11px]">
                          <span className="font-bold text-blue-800 block mb-0.5">📝 Log Catatan Terbaru:</span>
                          <p className="text-blue-900">{item.catatanPerbaikan}</p>
                        </div>
                      )}

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
                          onClick={() => handleOpenUpdateLog(item)}
                          className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold transition flex items-center space-x-1"
                        >
                          <Edit3 size={13} />
                          <span>Update Log</span>
                        </button>

                        <button
                          onClick={() => handleOpenSelesaikanModal(item)}
                          className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition shadow-sm flex items-center space-x-1"
                        >
                          <CheckCircle2 size={13} />
                          <span>Selesaikan</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* KOLOM 3: SELESAI HARI INI */}
          <div className="bg-slate-200/50 p-4 rounded-xl border border-slate-200 flex flex-col min-h-[450px]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">SELESAI HARI INI</h3>
                <span className="bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full text-[11px]">
                  {tiketSelesai.length}
                </span>
              </div>
            </div>

            <div className="space-y-3.5 flex-1 flex flex-col">
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

                    {/* MENAMPILKAN CATATAN HASIL PERBAIKAN PADA TIKET SELESAI */}
                    {item.catatanSelesai && (
                      <div className="bg-emerald-50/80 p-2.5 rounded-lg border border-emerald-200/80 text-[11px]">
                        <span className="font-bold text-emerald-800 flex items-center space-x-1 mb-0.5">
                          <Wrench size={12} />
                          <span>Tindakan Perbaikan Teknis:</span>
                        </span>
                        <p className="text-emerald-900 leading-tight">{item.catatanSelesai}</p>
                      </div>
                    )}

                    {((item.fotoSelesai && item.fotoSelesai.length > 0) || (item.fotoBukti && item.fotoBukti.length > 0)) && (
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 flex items-center space-x-2">
                        <Camera size={16} className="text-slate-500 shrink-0" />
                        <div className="overflow-hidden">
                          <p className="text-[10px] font-bold text-slate-700 truncate">✓ Bukti Foto Terlampir</p>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-1 border-t border-slate-100 text-[11px]">
                      <span className="text-slate-500">Teknisi: <strong className="text-slate-800">{item.teknisi || "-"}</strong></span>
                      <button
                        onClick={() => {
                          setSelectedReport(item);
                          setShowDetailModal(true);
                        }}
                        className="text-blue-600 font-semibold hover:underline flex items-center space-x-0.5"
                      >
                        <span>Detail WO →</span>
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
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">
                  TIKET TKN-#{selectedReport.id.toString().slice(-4)}
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
                  <p className="text-slate-400">Prioritas:</p>
                  <p className="font-bold text-red-600">{selectedReport.prioritas || "MEDIUM P3"}</p>
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

              {/* FOTO BUKTI DI DALAM MODAL DETAIL */}
              {selectedReport.fotoBukti && selectedReport.fotoBukti.length > 0 && (
                <div>
                  <p className="font-bold text-slate-700 mb-1 flex items-center space-x-1">
                    <Camera size={14} className="text-emerald-600" />
                    <span>Lampiran Gambar Kerusakan ({selectedReport.fotoBukti.length}):</span>
                  </p>
                  <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
                    {selectedReport.fotoBukti.map((imgSrc, idx) => (
                      <div
                        key={idx}
                        onClick={() => setActiveImagePreview(imgSrc)}
                        className="relative group h-20 rounded-lg overflow-hidden border border-slate-300 cursor-pointer bg-slate-200"
                      >
                        <img src={imgSrc} alt={`Bukti ${idx}`} className="w-full h-full object-cover group-hover:scale-105 transition" />
                        <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                          <Maximize2 size={14} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedReport.catatanSelesai && (
                <div>
                  <p className="font-bold text-slate-700 mb-1">Catatan Akhir Perbaikan:</p>
                  <p className="p-3 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200">
                    {selectedReport.catatanSelesai}
                  </p>
                </div>
              )}

              {selectedReport.status !== "SELESAI" && (
                <div className="pt-2 border-t border-slate-100">
                  <label className="font-bold text-slate-700 block mb-1">Tugaskan Teknisi Penanggung Jawab:</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={namaTeknisiInput}
                      onChange={(e) => setNamaTeknisiInput(e.target.value)}
                      placeholder="Masukkan nama teknisi"
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      onClick={() => handleTugaskanTeknisi(selectedReport.id)}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition shrink-0"
                    >
                      Mulai Pengerjaan
                    </button>
                  </div>
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

      {/* MODAL 2: UPDATE LOG PENANGANAN (SESUAI GAMBAR RUJUKAN 1) */}
      {showUpdateLogModal && selectedReportForLog && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            {/* Header Modal */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                  <Wrench size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Update Log Penanganan</h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-100">
                      • {selectedReportForLog.rtg} • {selectedReportForLog.lokasi}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Teknisi: <strong className="text-slate-800">{selectedReportForLog.teknisi || "Belum Ditugaskan"}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowUpdateLogModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveUpdateLog} className="space-y-4 text-xs">
              {/* Progres Penanganan RTG */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="font-bold text-slate-700">Progres Penanganan RTG</label>
                  <span className="bg-blue-100 text-blue-800 font-extrabold px-2.5 py-0.5 rounded text-[11px]">
                    {progresVal}% Test
                  </span>
                </div>

                {/* Preset Options */}
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {[
                    { label: "25% Diagnosa", val: 25 },
                    { label: "50% Perbaikan", val: 50 },
                    { label: "75% Testing", val: 75 },
                    { label: "90% Final Check", val: 90 },
                  ].map((item) => (
                    <button
                      type="button"
                      key={item.val}
                      onClick={() => setProgresVal(item.val)}
                      className={`py-2 px-1 rounded-lg text-[11px] font-bold border transition ${
                        progresVal === item.val
                          ? "bg-blue-50 text-blue-700 border-blue-400 shadow-sm"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-600 h-full transition-all duration-300 rounded-full"
                    style={{ width: `${progresVal}%` }}
                  ></div>
                </div>
              </div>

              {/* Catatan Tindakan Teknisi */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-bold text-slate-700">
                    Catatan Tindakan Teknisi <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400">{catatanInput.length} / 500 karakter</span>
                </div>
                <textarea
                  rows={4}
                  maxLength={500}
                  value={catatanInput}
                  onChange={(e) => setCatatanInput(e.target.value)}
                  placeholder="Tambah Catatan."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 focus:outline-none focus:border-blue-500 text-xs text-slate-800 placeholder-slate-400"
                  required
                />
                <p className="text-[10px] text-slate-500 mt-1 flex items-center space-x-1">
                  <span>🛠</span>
                  <span>Pastikan parameter pengujian beban dicatat lengkap sebelum serah terima shift lapangan.</span>
                </p>
              </div>

              {/* Footer Modal Update Log */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center space-x-1 text-[10px] text-emerald-600 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>TOS Real-Time Telemetry Terhubung</span>
                </div>

                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowUpdateLogModal(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg font-semibold hover:bg-slate-200 transition"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#0e5c75] hover:bg-[#0b485c] text-white rounded-lg font-semibold transition shadow-sm flex items-center space-x-1"
                  >
                    <CheckCircle2 size={14} />
                    <span>Simpan Log</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: SELESAIKAN WORK ORDER (SESUAI GAMBAR RUJUKAN 2) */}
      {showSelesaiModal && selectedReportForSelesai && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            {/* Header Modal */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-emerald-600 text-white rounded-xl">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Selesaikan Work Order</h3>
                  <div className="flex items-center space-x-2 mt-0.5">
                    <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-100">
                      • {selectedReportForSelesai.rtg} • {selectedReportForSelesai.lokasi}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowSelesaiModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmSelesaikan} className="space-y-4 text-xs">
              {/* Upload Foto Bukti Perbaikan */}
              <div>
                <label className="font-bold text-slate-700 block mb-1.5">
                  Upload Foto Bukti Perbaikan <span className="text-red-500">*</span>
                </label>

                <input
                  type="file"
                  ref={fileInputSelesaiRef}
                  onChange={handleFotoSelesaiChange}
                  multiple
                  accept="image/png, image/jpeg"
                  className="hidden"
                />

                <div
                  onClick={() => fileInputSelesaiRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center bg-slate-50 hover:bg-slate-100/60 transition cursor-pointer flex flex-col items-center justify-center"
                >
                  <div className="p-2.5 bg-blue-50 text-blue-500 rounded-full mb-1.5">
                    <UploadCloud size={20} />
                  </div>
                  <p className="text-xs font-semibold text-slate-700">
                    Unggah Berkas Bukti (PNG/JPG)
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Tarik berkas atau klik untuk jelajah (Maksimal 5MB)
                  </p>
                </div>

                {fotoSelesaiFiles.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {fotoSelesaiFiles.map((f, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-slate-50 p-2 rounded-lg text-[11px] border border-slate-200">
                        <span className="truncate max-w-xs font-medium text-slate-700">{f.name}</span>
                        <button
                          type="button"
                          onClick={() => setFotoSelesaiFiles(prev => prev.filter((_, i) => i !== idx))}
                          className="text-slate-400 hover:text-red-500"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Catatan Akhir Penanganan */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-bold text-slate-700">Catatan Akhir Penanganan</label>
                  <span className="text-[10px] text-slate-400">Opsional</span>
                </div>
                <textarea
                  rows={3}
                  value={catatanSelesaiInput}
                  onChange={(e) => setCatatanSelesaiInput(e.target.value)}
                  placeholder="Tambah Catatan......"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 focus:outline-none focus:border-emerald-500 text-xs text-slate-800 placeholder-slate-400"
                />
                <p className="text-[10px] text-slate-500 mt-1 flex items-start space-x-1">
                  <Info size={12} className="shrink-0 mt-0.5 text-blue-500" />
                  <span>
                    Catatan ini akan otomatis masuk ke Berita Acara Perbaikan (BAP) digital dan log historis {selectedReportForSelesai.rtg} untuk audit keselamatan terminal.
                  </span>
                </p>
              </div>

              {/* Footer Modal Selesaikan */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center space-x-1 text-[10px] text-emerald-600 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>Siap ditutup ke BAP Digital</span>
                </div>

                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowSelesaiModal(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg font-semibold hover:bg-slate-200 transition"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#0b3c3c] hover:bg-[#082e2e] text-white rounded-lg font-semibold transition shadow-sm flex items-center space-x-1"
                  >
                    <ShieldCheck size={14} />
                    <span>Konfirmasi & Selesaikan</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PREVIEW FOTO BESAR */}
      {activeImagePreview && (
        <div
          onClick={() => setActiveImagePreview(null)}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 cursor-zoom-out"
        >
          <div className="relative max-w-3xl w-full max-h-[85vh] flex items-center justify-center">
            <button
              onClick={() => setActiveImagePreview(null)}
              className="absolute -top-10 right-0 text-white bg-slate-800/80 hover:bg-slate-700 p-2 rounded-full transition"
            >
              <X size={20} />
            </button>
            <img
              src={activeImagePreview}
              alt="Bukti Foto Besar"
              className="max-w-full max-h-[80vh] rounded-xl object-contain shadow-2xl border border-slate-700"
            />
          </div>
        </div>
      )}

      {/* MODAL 4: TAMBAH WORK ORDER MANUAL BARU */}
      {showAddWOModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800">Tambah Work Order Manual</h3>
              <button onClick={() => setShowAddWOModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateWOManual} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nomor RTG Crane *</label>
                <input
                  type="text"
                  placeholder="Contoh: RTG-12"
                  value={newRtg}
                  onChange={(e) => setNewRtg(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-emerald-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Lokasi Blok Yard</label>
                  <select
                    value={newBlok}
                    onChange={(e) => setNewBlok(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-none"
                  >
                    <option value="BLOK A-01">BLOK A-01</option>
                    <option value="BLOK B-02">BLOK B-02</option>
                    <option value="BLOK C-04">BLOK C-04</option>
                    <option value="BLOK D-03">BLOK D-03</option>
                    <option value="BLOK E-06">BLOK E-06</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Prioritas</label>
                  <select
                    value={newPrioritas}
                    onChange={(e) => setNewPrioritas(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-none"
                  >
                   
                    <option value="HIGH P2">HIGH P1</option>
                    <option value="MEDIUM P3">MEDIUM P2</option>
                    <option value="NORMAL P4">LOW P3</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Kategori Permasalahan</label>
                <input
                  type="text"
                  placeholder="Contoh: Kebocoran Oli Hidrolik"
                  value={newKategori}
                  onChange={(e) => setNewKategori(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Deskripsi Detail Permasalahan *</label>
                <textarea
                  rows={3}
                  placeholder="Catat kendala teknis yang ditemukan di lapangan..."
                  value={newDeskripsi}
                  onChange={(e) => setNewDeskripsi(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddWOModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg font-semibold hover:bg-slate-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0e5c75] text-white rounded-lg font-semibold hover:bg-[#0b485c] transition"
                >
                  Simpan Work Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 mt-6 flex justify-between items-center text-[10px] text-slate-400 border-t border-slate-200/60 pt-4">
        <p>© 2024 Pelabuhan Petikemas - Sistem Operasional Rubber-Tired Gantry (RTG). Hak Cipta Dilindungi.</p>
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