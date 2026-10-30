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
  Info,
  Send,
  X,
  MapPin,
  Wrench,
  LogOut,
  Zap,
  Camera,
  Film,
  PlayCircle,
  CheckCircle2,
  ArrowRight,
  Radio,
} from "lucide-react";

export default function FormPelaporanPage() {
  const router = useRouter();
  const pathname = usePathname();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tanggal Realtime / Read-Only
  const [tanggal, setTanggal] = useState("");

  useEffect(() => {
    setTanggal(new Date().toISOString().split("T")[0]);
  }, []);

  const [nomorRtg, setNomorRtg] = useState("");
  const [lokasiBlok, setLokasiBlok] = useState("");
  const [kategori, setKategori] = useState("");
  const [deskripsiKendala, setDeskripsiKendala] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<{ name: string; type: string; url: string }[]>([]);
  
  const [showNotif, setShowNotif] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [reportsCount, setReportsCount] = useState(0);
  const [recentReports, setRecentReports] = useState<any[]>([]);

  // State Pop-Up Loading & Sukses Modal
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [progressPercent, setProgressPercent] = useState(0);

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

  const quickTexts = [
    "Kebocoran oli hidrolik pada sling hoist",
    "Spreader twistlock tidak melaku terkunci (Jammed)",
    "Tekanan angin ban gantry drop / kempes",
    "Genset overheat & indikator suhu naik",
    "Rem hoist tidak merespons presisi",
  ];

  const handleRtgChange = (val: string) => {
    setNomorRtg(val);
    if (rtgBlockMap[val]) {
      setLokasiBlok(rtgBlockMap[val]);
    } else if (val !== "") {
      setLokasiBlok("BLOK A - Bay Standard");
    } else {
      setLokasiBlok("");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      const newFiles = [...selectedFiles, ...filesArray].slice(0, 3);
      setSelectedFiles(newFiles);

      const previews = newFiles.map((file) => ({
        name: file.name,
        type: file.type.startsWith("video/") ? "video" : "image",
        url: URL.createObjectURL(file),
      }));
      setFilePreviews(previews);
    }
  };

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);

    const previews = newFiles.map((file) => ({
      name: file.name,
      type: file.type.startsWith("video/") ? "video" : "image",
      url: URL.createObjectURL(file),
    }));
    setFilePreviews(previews);
  };

  // HANDLER SUBMIT DENGAN ANIMASI CRANE JALAN 10 DETIK
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomorRtg || !deskripsiKendala) {
      alert("Mohon pilih Nomor RTG dan isi deskripsi temuan kendala.");
      return;
    }

    setIsSubmitting(true);
    setCurrentStep(1);
    setProgressPercent(0);

    const startTime = Date.now();
    const totalDuration = 10000; // 10 Detik
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(Math.round((elapsed / totalDuration) * 100), 100);
      setProgressPercent(pct);

      if (pct >= 35 && pct < 70) {
        setCurrentStep(2);
      } else if (pct >= 70) {
        setCurrentStep(3);
      }

      if (elapsed >= totalDuration) {
        clearInterval(progressInterval);
      }
    }, 100);

    setTimeout(async () => {
      try {
        const mediaBase64Promises = selectedFiles.map((file) => {
          return new Promise<{ type: string; url: string; name: string }>((resolve) => {
            const isVideo = file.type.startsWith("video/");

            if (file.size > 1.5 * 1024 * 1024) {
              resolve({
                type: isVideo ? "video" : "image",
                url: "",
                name: file.name,
              });
              return;
            }

            const reader = new FileReader();
            reader.onload = () =>
              resolve({
                type: isVideo ? "video" : "image",
                url: reader.result as string,
                name: file.name,
              });
            reader.onerror = () =>
              resolve({
                type: isVideo ? "video" : "image",
                url: "",
                name: file.name,
              });
            reader.readAsDataURL(file);
          });
        });

        const mediaArray = await Promise.all(mediaBase64Promises);

        const newReport = {
          id: Date.now(),
          tanggal,
          jam: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB",
          rtg: nomorRtg,
          lokasi: lokasiBlok || "BLOK A",
          pelapor: "Supervisi Lapangan",
          praOperasi: deskripsiKendala,
          pascaOperasi: "-",
          kategori: kategori || "Kendala Umum",
          prioritas: "MENUNGGU MCC",
          status: "MENUNGGU VERIFIKASI MCC",
          teknisi: "Belum Ditugaskan",
          lampiranMedia: mediaArray,
          fotoBukti: mediaArray.filter((m) => m.type === "image" && m.url !== "").map((m) => m.url),
          selectedFiles: selectedFiles.map((f) => f.name),
        };

        const existingReports = JSON.parse(localStorage.getItem("rtg_reports") || "[]");

        try {
          localStorage.setItem("rtg_reports", JSON.stringify([newReport, ...existingReports]));
        } catch (storageError) {
          localStorage.setItem("rtg_reports", JSON.stringify([newReport]));
        }

        setIsSubmitting(false);
        setIsSuccess(true);
      } catch (error) {
        console.error("Gagal mengunggah berkas:", error);
        setIsSubmitting(false);
        alert("Terjadi kesalahan saat memproses laporan.");
      }
    }, totalDuration);
  };

  const handleCloseModalAndNavigate = () => {
    setIsSuccess(false);
    setNomorRtg("");
    setLokasiBlok("");
    setKategori("");
    setDeskripsiKendala("");
    setSelectedFiles([]);
    setFilePreviews([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    router.push("/dasboard");
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans text-sm pb-10">
      {/* Header / Navbar */}
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

        {/* Navigasi Header */}
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
                        <p className="text-slate-600 text-[11px] line-clamp-2">{item.praOperasi}</p>
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

      {/* Main Form */}
      <main className="max-w-5xl mx-auto mt-6 px-4">
        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex justify-between items-start border-b border-slate-100 pb-5">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <FilePlus size={24} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">Form Pelaporan Kondisi Alat RTG</h2>
                <p className="text-xs text-slate-400">Isi formulir berikut untuk melaporkan kendala ke Verifikasi MCC.</p>
              </div>
            </div>
            <div className="flex items-center space-x-1.5 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-medium">
              <ShieldCheck size={16} className="text-emerald-600" />
              <span>TRANSMISI AMAN TOS V2.4</span>
            </div>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Tanggal Realtime */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-slate-700">Tanggal Pelaporan (Realtime)</label>
                  <span className="text-[11px] text-emerald-600 font-medium flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                    <span>Waktu Terkunci</span>
                  </span>
                </div>
                <input
                  type="date"
                  value={tanggal}
                  readOnly
                  className="w-full bg-slate-100 border border-slate-200 rounded-lg px-4 py-2.5 text-xs text-slate-600 font-bold cursor-not-allowed select-none"
                />
              </div>

              {/* Nomor RTG */}
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

            {/* Kategori Utama */}
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

            {/* Template Teks Cepat */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
              <label className="text-[11px] font-bold text-slate-600 flex items-center space-x-1">
                <Zap size={13} className="text-amber-500" />
                <span>Klik Template Teks Cepat (Auto-Fill Text):</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {quickTexts.map((text, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setDeskripsiKendala((prev) => (prev ? `${prev}. ${text}` : text))}
                    className="text-[10px] bg-white border border-slate-300 hover:border-emerald-500 text-slate-700 px-2.5 py-1 rounded-md transition"
                  >
                    + {text}
                  </button>
                ))}
              </div>
            </div>

            {/* Deskripsi Kendala */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-slate-700">Deskripsi Temuan / Kendala Alat *</label>
                <span className="text-[11px] text-slate-400">{deskripsiKendala.length} / 500 karakter</span>
              </div>
              <textarea
                maxLength={500}
                rows={4}
                value={deskripsiKendala}
                onChange={(e) => setDeskripsiKendala(e.target.value)}
                placeholder="Tuliskan temuan atau anomali kerusakan alat (pra-operasi maupun saat pengoperasian berlangsung)..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            {/* Lampiran Foto & Video */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-slate-700">
                  Lampiran Bukti Foto & Video Kerusakan <span className="text-slate-400 font-normal">(Opsional)</span>
                </label>
                <span className="text-[11px] text-slate-400">Maks 3 File (PNG, JPG, MP4, MOV)</span>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                multiple
                accept="image/png, image/jpeg, video/mp4, video/quicktime, video/webm"
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center bg-slate-50 hover:bg-slate-100/50 transition cursor-pointer flex flex-col items-center justify-center"
              >
                <div className="p-3 bg-blue-50 text-blue-500 rounded-full mb-2 flex items-center space-x-1">
                  <Camera size={20} />
                  <Film size={20} />
                </div>
                <p className="text-xs font-semibold text-slate-700">
                  Unggah Foto atau Rekaman Video Kerusakan, atau <span className="text-blue-600 underline">pilih dari perangkat</span>
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Format yang didukung: JPG, PNG, MP4, MOV (Maks. 10MB per file)
                </p>
              </div>

              {/* Display Preview */}
              {filePreviews.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-bold text-slate-700">Display Lampiran Terpilih ({filePreviews.length}/3):</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {filePreviews.map((item, idx) => (
                      <div key={idx} className="relative group bg-slate-900 rounded-xl overflow-hidden border border-slate-300 shadow-sm aspect-video flex items-center justify-center">
                        {item.type === "image" ? (
                          <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full relative flex items-center justify-center bg-slate-950">
                            <video src={item.url} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center text-white">
                              <PlayCircle size={32} className="text-white/80" />
                            </div>
                          </div>
                        )}

                        <div className="absolute top-2 left-2 bg-slate-900/80 text-white text-[9px] px-2 py-0.5 rounded-md font-semibold backdrop-blur-sm flex items-center space-x-1">
                          {item.type === "video" ? <Film size={10} /> : <Camera size={10} />}
                          <span className="truncate max-w-100px">{item.name}</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeFile(idx)}
                          className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-1 rounded-full shadow transition"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center pt-4 gap-4">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-start space-x-2.5 max-w-xl text-xs text-slate-600">
                <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
                <p>
                  <strong className="text-slate-800">Catatan Otomatis:</strong> Laporan yang disubmit akan masuk ke Verifikasi MCC (Maintenance Control Center) terlebih dahulu.
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
                  className="px-5 py-2.5 bg-[#0e5c75] text-white rounded-lg text-xs font-medium hover:bg-[#0b485c] transition flex items-center space-x-2 shadow-sm cursor-pointer"
                >
                  <span>Submit Laporan</span>
                  <Send size={14} />
                </button>
              </div>
            </div>
          </form>
        </div>
      </main>

      {/* POP-UP MODAL SEAMLESS: DESAIN RINGKAS MODERN TANPA BORDER BERTUMPUK */}
      {(isSubmitting || isSuccess) && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md z-100 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full text-center shadow-2xl relative overflow-hidden space-y-5 text-white">
            
            {/* Header Line Akses Pelabuhan */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-linear-to-r from-emerald-500 via-teal-500 to-emerald-400"></div>

            {/* STATUS LOADING (CRANE BERJALAN HORIZONTAL SEAMLESS 10 DETIK) */}
            {isSubmitting && (
              <div className="space-y-5 pt-2">
                {/* ID Unit RTG Badge Top */}
                <div className="flex justify-between items-center text-xs px-1">
                  <span className="text-slate-400 font-semibold flex items-center space-x-1.5">
                    <Radio size={14} className="animate-pulse text-emerald-400" />
                    <span>Transmisi Laporan...</span>
                  </span>
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-extrabold px-2.5 py-0.5 rounded-full text-[11px]">
                    {nomorRtg || "RTG CRANE"}
                  </span>
                </div>

                {/* ARENA LINTASAN CRANE TANPA BORDER DALAM BERTUMPUK */}
                <div className="relative w-full h-20 bg-slate-950/80 rounded-2xl p-2 overflow-hidden border border-slate-800 flex flex-col justify-end">
                  
                  {/* Crane Komponen Bergerak dari Kiri ke Kanan Berdasarkan Persentase */}
                  <div 
                    className="absolute top-2 transition-all duration-300 ease-linear flex flex-col items-center"
                    style={{ left: `calc(${progressPercent}% * 0.74)` }} 
                  >
                    {/* Rangka Atas Crane */}
                    <div className="w-16 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                    
                    {/* Tali Sling / Hoist */}
                    <div className="w-0.5 bg-slate-300 h-4 my-0.5"></div>

                    {/* Container Peti Kemas */}
                    <div className="w-10 h-5 bg-amber-500 rounded border border-amber-600 flex items-center justify-center text-[7px] font-black text-slate-950 shadow">
                      TPS
                    </div>

                    {/* Roda Gantry Crane */}
                    <div className="w-16 flex justify-between mt-0.5">
                      <div className="w-2.5 h-2.5 bg-slate-800 rounded-full animate-spin border border-slate-500"></div>
                      <div className="w-2.5 h-2.5 bg-slate-800 rounded-full animate-spin border border-slate-500"></div>
                    </div>
                  </div>

                  {/* Rel Lintasan Crane di Dasar */}
                  <div className="w-full h-1 bg-slate-800 rounded-full mb-1"></div>
                </div>

                {/* Progress Bar & Steps Dinamis */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 text-[11px]">Progres Transmisi</span>
                    <span className="text-emerald-400 font-extrabold">{progressPercent}%</span>
                  </div>

                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full transition-all duration-300 ease-out rounded-full" 
                      style={{ width: `${progressPercent}%` }}
                    ></div>
                  </div>

                  {/* Ringkasan Step Ringkas */}
                  <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80 text-left text-xs space-y-1.5">
                    <div className={`flex items-center space-x-2 transition ${currentStep >= 1 ? "text-emerald-400 font-bold" : "text-slate-500"}`}>
                      <span className={`w-2 h-2 rounded-full ${currentStep >= 1 ? "bg-emerald-400 animate-pulse" : "bg-slate-700"}`}></span>
                      <span>1. Identifikasi Unit {nomorRtg || "RTG Crane"}</span>
                    </div>
                    <div className={`flex items-center space-x-2 transition ${currentStep >= 2 ? "text-emerald-400 font-bold" : "text-slate-500"}`}>
                      <span className={`w-2 h-2 rounded-full ${currentStep >= 2 ? "bg-emerald-400 animate-pulse" : "bg-slate-700"}`}></span>
                      <span>2. Mengunci Posisi Yard ({lokasiBlok || "Blok Standard"})</span>
                    </div>
                    <div className={`flex items-center space-x-2 transition ${currentStep >= 3 ? "text-emerald-400 font-bold" : "text-slate-500"}`}>
                      <span className={`w-2 h-2 rounded-full ${currentStep >= 3 ? "bg-emerald-400 animate-pulse" : "bg-slate-700"}`}></span>
                      <span>3. Transmisi Berkas ke Verifikasi MCC</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STATUS SUKSES */}
            {isSuccess && (
              <div className="space-y-4 py-1 animate-in fade-in zoom-in duration-300">
                <div className="w-14 h-14 bg-emerald-500/10 text-emerald-400 rounded-2xl mx-auto flex items-center justify-center border border-emerald-500/20 shadow-inner">
                  <CheckCircle2 size={32} className="text-emerald-400" />
                </div>

                <div>
                  <h3 className="font-extrabold text-base text-white">Laporan Berhasil Terkirim!</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Data kerusakan unit <strong className="text-white">{nomorRtg}</strong> telah berhasil ditransmisikan ke antrean <span className="text-emerald-400 font-bold">Verifikasi MCC</span>.
                  </p>
                </div>

                {/* Card Summary Ringkas */}
                <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 text-left text-xs space-y-2">
                  <div className="flex justify-between items-center text-slate-400 pb-1.5 border-b border-slate-800">
                    <span>Nomor Unit RTG:</span>
                    <span className="font-extrabold text-white bg-slate-800 px-2 py-0.5 rounded">{nomorRtg}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400 pb-1.5 border-b border-slate-800">
                    <span>Lokasi Terdeteksi:</span>
                    <span className="font-bold text-slate-200">{lokasiBlok || "Blok A"}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Status Tiket:</span>
                    <span className="text-amber-400 font-extrabold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse"></span>
                      <span>MENUNGGU VERIFIKASI MCC</span>
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleCloseModalAndNavigate}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-md flex items-center justify-center space-x-2 cursor-pointer group"
                >
                  <span>Pantau di Dashboard Monitoring</span>
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

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