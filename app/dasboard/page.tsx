"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import * as XLSX from "xlsx-js-style";
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
  X
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

export default function DashboardPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [reports, setReports] = useState<Report[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedKategoriFilter, setSelectedKategoriFilter] = useState("SEMUA");
  const [showNotif, setShowNotif] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  // State untuk Modal Detail Tiket (ST)
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("rtg_reports");
    if (saved) {
      setReports(JSON.parse(saved));
    }
  }, []);

  // Filter gabungan berdasarkan input pencarian & tombol kategori
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

  const reportedRtgSet = new Set(reports.map((r) => r.rtg));

  const rtgUnits = Array.from({ length: 35 }, (_, i) => {
    const unitName = `RTG ${38 + i}`;
    const isReported = reportedRtgSet.has(unitName);
    const reportData = reports.find((r) => r.rtg === unitName);

    return {
      id: unitName,
      status: isReported ? "PERBAIKAN" : "NORMAL",
      prioritas: reportData?.prioritas || "MEDIUM P3",
      badge: isReported ? `A ${reportData?.prioritas || "Perlu tindakan"}` : undefined,
      sub: isReported ? `Tiket: ${reportData?.kategori || "Perlu Perbaikan"}` : "Tanpa laporan aktif",
    };
  });

  const totalPerbaikan = reportedRtgSet.size;
  const totalNormal = 35 - totalPerbaikan;

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
      "Temuan Pra-Operasi": r.praOperasi,
      "Temuan Pasca-Operasi": r.pascaOperasi,
      Status: r.status,
      "Nama PIC / Penanggung Jawab": r.teknisi?.trim() || "Belum Ditugaskan",
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const columnWidths = [
      6,  // No
      14, // Tanggal
      12, // Jam
      14, // Nomor RTG
      16, // Lokasi
      23, // Pelapor
      31, // Nama PIC / Penanggung Jawab
      18, // Prioritas
      25, // Kategori
      40, // Temuan Pra-Operasi
      40, // Temuan Pasca-Operasi
      22, // Status
    ];

    worksheet["!cols"] = columnWidths.map(
      (wch) => ({ wch })
    );

    // Mengatur Wrap Text dan tampilan setiap sel Excel
    const range = XLSX.utils.decode_range(
      worksheet["!ref"]!
    );

    for (let row = range.s.r; row <= range.e.r; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const address = XLSX.utils.encode_cell({
          r: row,
          c: col,
        });

        const cell = worksheet[address];
        if (!cell) continue;

        const header = row === 0;

        cell.s = {
          font: {
            name: "Calibri",
            sz: header ? 11 : 10,
            bold: header,
            color: {
              rgb: header ? "FFFFFF" : "243447",
            },
          },

          fill: {
            fgColor: {
              rgb: header
                ? "0B3C3C"
                : row % 2 === 0
                ? "F1F7F8"
                : "FFFFFF",
            },
          },

          alignment: {
            wrapText: true,
            vertical: header ? "center" : "top",
            horizontal:
              header || col === 0 ? "center" : "left",
          },

          border: {
            bottom: {
              style: "thin",
              color: { rgb: "DCE5E8" },
            },
          },
        };
      }
    }

    // Menghitung perkiraan tinggi baris berdasarkan isi
    worksheet["!rows"] = [
      { hpt: 36 }, // Tinggi header

      ...excelData.map((record) => {
        const values = Object.values(record);

        const neededLines = Math.max(
          1,
          ...values.map((value, col) => {
            const text = String(value ?? "");

            const estimatedCharsPerLine = Math.max(
              columnWidths[col] - 4,
              1
            );

            return text.split(/\r?\n/).reduce(
              (count, line) => {
                return count + Math.max(
                  1,
                  Math.ceil(
                    line.length / estimatedCharsPerLine
                  )
                );
              },
              0
            );
          })
        );

        return {
          hpt: Math.min(
            400,
            Math.max(27, neededLines * 17 + 9)
          ),
        };
      }),
    ];

    // aktifkan filter header Excel
    worksheet["!autofilter"] = {
      ref: worksheet["!ref"]!,
    };

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Rekap Laporan RTG");
    XLSX.writeFile(workbook, `Rekap_Evaluasi_RTG_${new Date().toISOString().split("T")[0]}.xlsx`, { cellStyles: true });
  };

  const clearData = () => {
    if (confirm("Apakah Anda yakin ingin mengosongkan semua data laporan?")) {
      localStorage.removeItem("rtg_reports");
      setReports([]);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans text-sm pb-10">
      {/* Header / Navbar Baru */}
      <header className="bg-[#0b3c3c] text-white px-8 py-4 flex items-center justify-between shadow-md relative z-50">
        <div className="flex items-center space-x-3.5">
          <div className="bg-emerald-600 p-2 rounded-lg shadow-sm">
            <span className="font-extrabold text-sm uppercase tracking-wider text-white">RTG</span>
          </div>
          <div>
            <h1 className="font-bold text-lg leading-none tracking-tight">PELAPORAN RTG</h1>
            <p className="text-[11px] text-emerald-200 mt-0.5">OPERASIONAL LAPANGAN TERMINAL PETIKEMAS SURABAYA</p>
          </div>
        </div>

        {/* Navigasi Terhubung ke Semua Halaman */}
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

        <div className="flex items-center space-x-4">
          <div className="relative">
            <button
              onClick={() => {
                setShowNotif(!showNotif);
                setShowProfile(false);
              }}
              className="p-2.5 text-slate-200 hover:text-white rounded-full hover:bg-[#134e4e] transition relative"
            >
              <Bell size={20} />
              {reports.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>
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
                        <p className="text-slate-600 text-[11px] line-clamp-2">{item.praOperasi !== "-" ? item.praOperasi : item.pascaOperasi}</p>
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
              className="flex items-center space-x-3 bg-[#134e4e] hover:bg-[#185d5d] px-4 py-2 rounded-full text-xs transition border border-emerald-700/50 cursor-pointer"
            >
              <div className="p-1 bg-emerald-500 rounded-full text-white">
                <User size={15} />
              </div>
              <div className="text-left leading-tight">
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 mt-6 space-y-6">
        <div className="bg-[#0f4c5c] text-white p-6 rounded-xl relative overflow-hidden shadow-sm">
          <div className="inline-flex items-center space-x-2 bg-[#175d70] px-3 py-1 rounded-full text-xs text-emerald-300 mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>LIVE MONITORING RTG • DERMAGA PETIKEMAS</span>
          </div>
          <div className="flex justify-between items-end">
            <div>
              <h2 className="text-2xl font-bold mb-1">Pelaporan Kendala Operasional</h2>
              <p className="text-slate-300 text-xs">
                Pemantauan status kondisi, kesiapan alat Rubber-Tired Gantry (RTG), dan tindak lanjut laporan kendala terminal secara real-time.
              </p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={exportToExcel}
                className="bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-2 rounded-lg font-medium text-xs flex items-center space-x-1.5 transition shadow"
              >
                <Download size={16} />
                <span>Rekap Excel</span>
              </button>
              <button 
                onClick={() => router.push("/form-pelaporan")}
                className="bg-[#0e5c75] hover:bg-[#0b485c] border border-emerald-400 text-white px-4 py-2 rounded-lg font-medium text-xs flex items-center space-x-1.5 transition shadow"
              >
                <Plus size={16} />
                <span>Buat Laporan Kendala</span>
              </button>
            </div>
          </div>
        </div>

        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-start shadow-sm">
            <div>
              <p className="text-xs text-slate-500 font-medium">RTG Beroperasi Normal</p>
              <h3 className="text-2xl font-bold mt-1 text-slate-800">{totalNormal} <span className="text-xs font-normal text-slate-500">dari 35 unit</span></h3>
              <p className="text-[11px] text-emerald-600 mt-2 font-medium">
                • {Math.round((totalNormal / 35) * 100)}% Kesiapan Operasi
              </p>
            </div>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><CheckCircle2 size={20} /></div>
          </div>


          <div className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-start shadow-sm">
            <div>
              <p className="text-xs text-slate-500 font-medium">RTG Perlu Perbaikan</p>
              <h3 className="text-2xl font-bold mt-1 text-red-600">{totalPerbaikan} <span className="text-xs font-normal text-slate-500">unit</span></h3>
              <p className="text-[11px] text-red-500 mt-2 font-medium">
                {totalPerbaikan > 0 ? `${reports.map(r => r.rtg).join(", ")} butuh tindak lanjut` : "Tidak ada unit rusak"}
              </p>
            </div>
            <div className="p-2 bg-red-50 text-red-500 rounded-lg"><AlertOctagon size={20} /></div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-start shadow-sm">
            <div>
              <p className="text-xs text-slate-500 font-medium">Laporan Hari Ini</p>
              <h3 className="text-2xl font-bold mt-1 text-slate-800">{reports.length} <span className="text-xs font-normal text-slate-500">laporan masuk</span></h3>
              <p className="text-[11px] text-blue-600 mt-2 font-medium">• Shift 1 & Shift 2 aktif</p>
            </div>
            <div className="p-2 bg-blue-50 text-blue-500 rounded-lg"><FileText size={20} /></div>
          </div>
        </div>

        {/* Status Unit RTG Grid */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-bold text-base text-slate-800">Status Unit RTG (Layout Area)</h3>
              <p className="text-xs text-slate-400">Pemetaan sebaran unit di blok Container Yard (RTG 38 s/d RTG 72)</p>
            </div>
            <div className="flex items-center space-x-4 text-xs font-medium">
              <span className="flex items-center space-x-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span><span className="text-slate-600">Normal/Ready</span> <span className="text-slate-400">{totalNormal} Unit</span></span>
              <span className="flex items-center space-x-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500"></span><span className="text-slate-600">Perlu Perbaikan</span> <span className="text-slate-400">{totalPerbaikan} Unit</span></span>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-3">
            {rtgUnits.map((item) => (
              <div 
                key={item.id} 
                className={`p-3 rounded-lg border transition ${
                  item.status === "PERBAIKAN" 
                    ? item.prioritas?.includes("P1")
                      ? "bg-red-100 border-red-500 text-red-900 animate-pulse"
                      : "bg-amber-50 border-amber-300 text-amber-900"
                    : "bg-slate-50 border-slate-200 hover:border-emerald-300"
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className="font-bold text-sm text-slate-800">{item.id}</span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                    item.status === "PERBAIKAN" 
                      ? item.prioritas?.includes("P1") ? "bg-red-600 text-white" : "bg-amber-200 text-amber-800"
                      : "bg-emerald-100 text-emerald-700"
                  }`}>
                    {item.status}
                  </span>
                </div>
                {item.badge && (
                  <p className="text-[10px] font-bold text-red-600 mt-2">{item.badge}</p>
                )}
                <p className={`text-[10px] mt-1 ${item.status === "PERBAIKAN" ? "text-slate-700 font-medium" : "text-slate-400"}`}>
                  {item.sub}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Section: Chart & Table */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-1">
                <h3 className="font-bold text-sm text-slate-800">Grafik Laporan Kendala</h3>
                <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-medium">
                  Sumbu X: Unit / Y: Jumlah
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-6">Distribusi frekuensi laporan per unit RTG terkini</p>

              <div className="relative pl-7 pr-2 pt-4 pb-6 h-48 border-b border-l border-slate-300">
                <div className="absolute left-0 top-0 bottom-6 flex flex-col justify-between text-[10px] font-semibold text-slate-400 pr-1.5 text-right w-6">
                  <span>{maxVal}</span>
                  <span>{Math.round(maxVal / 2)}</span>
                  <span>0</span>
                </div>

                <div className="absolute left-6 right-0 top-4 border-b border-dashed border-slate-200"></div>
                <div className="absolute left-6 right-0 top-1/2 border-b border-dashed border-slate-200"></div>

                <div className="flex items-end justify-around gap-3 h-full w-full relative z-10">
                  {chartData.length === 0 ? (
                    <div className="w-full text-center text-xs text-slate-400 my-auto">
                      Belum ada laporan kendala
                    </div>
                  ) : (
                    chartData.map((bar, idx) => {
                      const barHeightPercent = Math.max(20, Math.round((bar.value / maxVal) * 100));

                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end">
                          <span className="text-[10px] text-slate-700 font-bold mb-1">{bar.value}</span>
                          <div
                            style={{ height: `${barHeightPercent}%` }}
                            className="w-full max-w-9 bg-[#0e5c75] rounded-t-md hover:bg-emerald-500 transition-all duration-300 shadow-sm"
                          ></div>
                          <span className="absolute -bottom-5 text-[10px] text-slate-600 font-medium truncate max-w-12 text-center">
                            {bar.label}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="text-center text-[10px] font-semibold text-slate-400 mt-7">
                Unit RTG Crane (Sumbu X)
              </div>
            </div>

            <div className="flex justify-between items-center text-[11px] text-slate-500 pt-3 border-t border-slate-100 mt-2">
              <span>• Total: {reports.length} Laporan</span>
              <span className="font-medium text-slate-700">Terselesaikan: 0%</span>
            </div>
          </div>

          <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-sm text-slate-800">Laporan Kendala Terbaru</h3>
                <div className="flex space-x-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1.5 text-slate-400" size={14} />
                    <input 
                      type="text" 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Cari tiket RTG / Pelapor..." 
                      className="pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs focus:outline-none" 
                    />
                  </div>
                  {reports.length > 0 && (
                    <button onClick={clearData} title="Reset Data Laporan" className="p-1.5 border border-slate-200 rounded-md text-red-500 hover:bg-red-50">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Filter Tombol Kategori */}
              <div className="flex items-center space-x-1.5 mb-4 overflow-x-auto pb-1">
                <span className="text-[11px] font-bold text-slate-400 mr-1">Filter:</span>
                {["SEMUA", "Sistem Hidrolik", "Spreader & Twistlock", "Hoist & Motor", "Sistem Elektrikal / Genset", "Gantry & Ban"].map((kat) => (
                  <button
                    key={kat}
                    onClick={() => setSelectedKategoriFilter(kat)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition whitespace-nowrap ${
                      selectedKategoriFilter === kat
                        ? "bg-[#0b3c3c] text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {kat}
                  </button>
                ))}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 font-medium">
                      <th className="py-2 px-3">TANGGAL</th>
                      <th className="py-2 px-3">RTG</th>
                      <th className="py-2 px-3">PRIORITAS</th>
                      <th className="py-2 px-3">TEMUAN PRA-OPERASI</th>
                      <th className="py-2 px-3">TEMUAN PASCA-OPERASI</th>
                      <th className="py-2 px-3">ST</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredReports.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                          Belum ada laporan kendala yang dikirim.
                        </td>
                      </tr>
                    ) : (
                      filteredReports.map((item) => (
                        <tr key={item.id}>
                          <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                            {item.tanggal}<br />
                            <span className="text-[10px] text-slate-400">{item.jam}</span>
                          </td>
                          <td className="py-3 px-3 font-bold text-slate-800 whitespace-nowrap">
                            {item.rtg}<br />
                            <span className="font-normal text-[10px] text-slate-400">{item.lokasi}</span>
                          </td>
                          <td className="py-3 px-3">
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
                          <td className="py-3 px-3 text-red-600 bg-red-50/50 p-2 rounded">
                            {item.praOperasi}
                          </td>
                          <td className="py-3 px-3 text-slate-600">
                            {item.pascaOperasi}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <button
                              onClick={() => {
                                setSelectedReport(item);
                                setShowDetailModal(true);
                              }}
                              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-[#0e5c75] transition flex items-center space-x-1"
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

            <div className="flex justify-between items-center text-[11px] text-slate-400 pt-3 border-t border-slate-100 mt-2">
              <span>Menampilkan {filteredReports.length} tiket aktif terkini</span>
              <span>• Auto-refresh setiap 30 detik (TOS Direct Stream)</span>
            </div>
          </div>
        </div>
      </main>

      {/* Modal Detail Tiket & Aksi Penanganan Status (ST) */}
      {showDetailModal && selectedReport && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
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
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
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
                  <p className="font-bold text-slate-700">{selectedReport.tanggal} • {selectedReport.jam}</p>
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
                <p className="font-bold text-slate-700 mb-1">Temuan Pra-Operasi:</p>
                <p className="p-2.5 bg-red-50 text-red-700 rounded-lg text-xs">{selectedReport.praOperasi}</p>
              </div>

              <div>
                <p className="font-bold text-slate-700 mb-1">Temuan Pasca-Operasi:</p>
                <p className="p-2.5 bg-slate-50 text-slate-700 rounded-lg text-xs">{selectedReport.pascaOperasi}</p>
              </div>
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
      <footer className="max-w-7xl mx-auto px-6 mt-6 flex justify-between items-center text-[11px] text-slate-400">
        <p>© 2024 Pelabuhan Petikemas - Sistem Operasional Rubber-Tired Gantry (RTG)</p>
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