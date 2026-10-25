"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Bell,
  User,
  FilePlus,
  ShieldCheck,
  ChevronDown,
  UploadCloud,
  Info,
  Send,
  X,
  MapPin,
  Wrench,
  LogOut,
} from "lucide-react";

export default function FormPelaporanPage() {
  const router = useRouter();
  const pathname = usePathname();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const today = new Date().toISOString().split("T")[0];

  const [tanggal, setTanggal] = useState(today);
  const [nomorRtg, setNomorRtg] = useState("");
  const [lokasiBlok, setLokasiBlok] = useState("");
  const [kategori, setKategori] = useState("");
  const [praOperasi, setPraOperasi] = useState("");
  const [pascaOperasi, setPascaOperasi] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showNotif, setShowNotif] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [reportsCount, setReportsCount] = useState(0);
  const [recentReports, setRecentReports] = useState<any[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("rtg_reports");
    if (saved) {
      const parsed = JSON.parse(saved);
      setReportsCount(parsed.length);
      setRecentReports(parsed.slice(0, 4));
    }
  }, []);

  const rtgBlockMap: Record<string, string> = {
    "RTG 38": "Blok A - Bay 04",
    "RTG 52": "Blok C - Bay 02",
    "RTG 40": "Blok B - Bay 01",
    "RTG 60": "Blok D - Bay 05",
  };

  const rtgOptions = Array.from({ length: 35 }, (_, i) => 38 + i);

  const kategoriList = [
    "Sistem Hidrolik",
    "Spreader & Twistlock",
    "Hoist & Motor",
    "Sistem Elektrikal / Genset",
    "Gantry & Ban",
  ];

  const handleRtgChange = (val: string) => {
    setNomorRtg(val);
    if (rtgBlockMap[val]) {
      setLokasiBlok(rtgBlockMap[val]);
    } else if (val !== "") {
      setLokasiBlok("Blok Ready - Bay Standard");
    } else {
      setLokasiBlok("");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...filesArray].slice(0, 3));
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomorRtg || (!praOperasi && !pascaOperasi)) {
      alert("Mohon pilih Nomor RTG dan isi minimal salah satu catatan kendala.");
      return;
    }

    const newReport = {
      id: Date.now(),
      tanggal,
      jam: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB",
      rtg: nomorRtg,
      lokasi: lokasiBlok || "Blok Yard",
      pelapor: "Supervisi Lapangan",
      praOperasi: praOperasi || "-",
      pascaOperasi: pascaOperasi || "-",
      kategori: kategori || "Kendala Umum",
      status: "PERBAIKAN",
    };

    const existingReports = JSON.parse(localStorage.getItem("rtg_reports") || "[]");
    localStorage.setItem("rtg_reports", JSON.stringify([newReport, ...existingReports]));

    alert(`Laporan unit ${nomorRtg} berhasil dikirim!`);
    router.push("/dasboard");
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
          <button className="px-5 py-2 text-slate-300 hover:text-white transition font-medium">
            Penanganan Teknis
          </button>
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
              {reportsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>
              )}
            </button>

            {showNotif && (
              <div className="absolute right-0 mt-3 w-80 bg-white text-slate-800 rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50">
                <div className="p-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                  <span className="font-bold text-xs text-slate-700">Notifikasi Kendala</span>
                  <span className="text-[10px] bg-red-100 text-red-600 font-semibold px-2 py-0.5 rounded-full">
                    {reportsCount} Baru
                  </span>
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                  {recentReports.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">Tidak ada notifikasi baru</div>
                  ) : (
                    recentReports.map((item, idx) => (
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
                  onClick={() => alert("Ganti shift atau logout supervisi")}
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
      <main className="max-w-5xl mx-auto mt-6 px-4">
        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex justify-between items-start border-b border-slate-100 pb-5">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <FilePlus size={24} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">Detail Pelaporan & Kondisi Alat RTG</h2>
                <p className="text-xs text-slate-400">Pastikan kode unit terverifikasi sebelum memasukkan laporan kendala operasional.</p>
              </div>
            </div>
            <div className="flex items-center space-x-1.5 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-medium">
              <ShieldCheck size={16} className="text-emerald-600" />
              <span>TRANSMISI AMAN TOS V2.4</span>
            </div>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-slate-700">Tanggal Pelaporan *</label>
                  <span className="text-[11px] text-emerald-600 font-medium flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                    <span>Waktu Otomatis Sinkron</span>
                  </span>
                </div>
                <input
                  type="date"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-emerald-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-slate-700">Nomor RTG *</label>
                  <span className="text-[11px] text-slate-400">Kamera Yard Aktif</span>
                </div>
                <div className="relative">
                  <select
                    value={nomorRtg}
                    onChange={(e) => handleRtgChange(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-xs text-slate-700 font-medium appearance-none focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="">PILIH UNIT RTG CRANE...</option>
                    {rtgOptions.map((num) => (
                      <option key={num} value={`RTG ${num}`}>RTG {num}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-3 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {lokasiBlok && (
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg flex items-center space-x-2 text-xs text-emerald-800">
                <MapPin size={16} className="text-emerald-600 shrink-0" />
                <span>Lokasi Terdeteksi di Yard: <strong>{lokasiBlok}</strong></span>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-slate-700 flex items-center space-x-1.5 mb-2">
                <Wrench size={14} className="text-slate-500" />
                <span>Kategori Utama Kendala</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {kategoriList.map((kat) => (
                  <button
                    type="button"
                    key={kat}
                    onClick={() => setKategori(kat === kategori ? "" : kat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                      kategori === kat ? "bg-[#0b3c3c] text-white border-[#0b3c3c]" : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {kat}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-slate-700">Temuan/Kendala Pra-Pengoperasian Alat *</label>
                <span className="text-[11px] text-slate-400">{praOperasi.length} / 500 karakter</span>
              </div>
              <textarea
                maxLength={500}
                rows={3}
                value={praOperasi}
                onChange={(e) => setPraOperasi(e.target.value)}
                placeholder="Catat anomali saat inspeksi harian sebelum shift dimulai..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-slate-700">Temuan/Kendala Pasca-Pengoperasian Alat *</label>
                <span className="text-[11px] text-slate-400">{pascaOperasi.length} / 500 karakter</span>
              </div>
              <textarea
                maxLength={500}
                rows={3}
                value={pascaOperasi}
                onChange={(e) => setPascaOperasi(e.target.value)}
                placeholder="Catat penurunan performa atau insiden teknis..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-slate-700">
                  Lampiran Bukti Foto Kerusakan / Log Error <span className="text-slate-400 font-normal">(Opsional)</span>
                </label>
                <span className="text-[11px] text-slate-400">Maks 3 File (PNG, JPG, PDF)</span>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                multiple
                accept="image/png, image/jpeg, application/pdf"
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center bg-slate-50 hover:bg-slate-100/50 transition cursor-pointer flex flex-col items-center justify-center"
              >
                <div className="p-3 bg-blue-50 text-blue-500 rounded-full mb-2">
                  <UploadCloud size={24} />
                </div>
                <p className="text-xs font-semibold text-slate-700">
                  Tarik & lepas foto komponen RTG, atau <span className="text-blue-600 underline">pilih dari perangkat</span>
                </p>
                <p className="text-[11px] text-slate-400 mt-1">Format yang didukung: JPG, PNG, atau tangkapan layar panel diagnosis (Maks. 5MB per file)</p>
              </div>

              {selectedFiles.length > 0 && (
                <div className="mt-3 space-y-2">
                  {selectedFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                      <span className="truncate font-medium text-slate-700 max-w-xs">{file.name}</span>
                      <button type="button" onClick={() => removeFile(idx)} className="text-slate-400 hover:text-red-500 transition">
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center pt-4 gap-4">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-start space-x-2.5 max-w-xl text-xs text-slate-600">
                <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
                <p>
                  <strong className="text-slate-800">Catatan Otomatis:</strong> Laporan yang disubmit akan langsung menerbitkan Tiket Perbaikan ke Departemen Teknik.
                </p>
              </div>

              <div className="flex items-center space-x-3 w-full md:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => router.push("/dasboard")}
                  className="px-5 py-2.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-200 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#0e5c75] text-white rounded-lg text-xs font-medium hover:bg-[#0b485c] transition flex items-center space-x-2 shadow-sm"
                >
                  <span>Submit Laporan</span>
                  <Send size={14} />
                </button>
              </div>
            </div>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto mt-6 flex justify-between items-center text-[11px] text-slate-400 px-4">
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