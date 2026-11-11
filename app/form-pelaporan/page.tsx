"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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
  Menu,
} from "lucide-react";

export default function FormPelaporanPage() {
  const router = useRouter();
  const pathname = usePathname();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State Hamburger Menu Mobile
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Supabase Client
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

        if (profileError || !profile || !profile.is_active) {
          await supabase.auth.signOut();
          router.replace("/");
          return;
        }

        // Halaman Form Pelaporan hanya untuk admin dan operator
        const allowedRoles = ["admin", "operator"];

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

  // Tanggal Realtime / Read-Only
  const [tanggal, setTanggal] = useState("");

  useEffect(() => {
    setTanggal(new Date().toISOString().split("T")[0]);
  }, []);

  const [nomorRtg, setNomorRtg] = useState("");
  const [lokasiBlok, setLokasiBlok] = useState("");
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
      try {
        const parsed = JSON.parse(saved);
        setReportsCount(parsed.length);
        setRecentReports(parsed.slice(0, 4));
      } catch (e) {
        console.error("Gagal membaca local storage", e);
      }
    }
  }, []);

  const rtgBlockMap: Record<string, string> = {
    "RTG 38": "Block A - Bay 04",
    "RTG 52": "Block C - Bay 02",
    "RTG 40": "Block B - Bay 01",
    "RTG 60": "Block D - Bay 05",
  };

  const rtgOptions = Array.from({ length: 35 }, (_, i) => 38 + i);

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
      setLokasiBlok("Block A - Bay Standard");
    } else {
      setLokasiBlok("");
    }
  };

  const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/quicktime",
  "video/webm",
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      
      // Filter file hanya yang sesuai format gambar atau video
      const validFiles = filesArray.filter((file) => {
        const isValidType = ALLOWED_MIME_TYPES.includes(file.type);
        if (!isValidType) {
          alert(`File "${file.name}" ditolak. Format file tidak diizinkan! Hanya foto (JPG, PNG, WEBP) dan video (MP4, MOV, WEBM) yang diperbolehkan.`);
        }
        return isValidType;
      });

      if (validFiles.length === 0) {
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      const newFiles = [...selectedFiles, ...validFiles].slice(0, 3);
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
    const totalDuration = 5000;
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
        // 1. Dapatkan data User yang sedang Login
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError || !user) {
          throw new Error("Pengguna tidak terautentikasi.");
        }

        // 2. Pastikan format unit_code sesuai dengan isi database (misal "RTG 38")
        const formattedUnitCode = nomorRtg.startsWith("RTG")
          ? nomorRtg
          : `RTG ${nomorRtg}`;

        // 3. Ambil ID dari unit RTG di tabel `rtg_statuses`
        const { data: rtgUnitData, error: rtgFetchError } = await supabase
          .from("rtg_statuses")
          .select("id")
          .ilike("unit_code", formattedUnitCode)
          .maybeSingle();

        if (rtgFetchError || !rtgUnitData) {
          console.error(
            "Gagal menemukan unit RTG di database:",
            rtgFetchError?.message
          );
          alert(`Unit ${formattedUnitCode} tidak ditemukan di database rtg_statuses.`);
          setIsSubmitting(false);
          return;
        }

        // =========================================================================
        // PERBAIKAN UTAMA: UPLOAD FILE KE SUPABASE STORAGE SEBELUM INSERT
        // =========================================================================
        let uploadedUrls: string[] = [];

        if (selectedFiles && selectedFiles.length > 0) {
          for (const file of selectedFiles) {
            const fileExt = file.name.split(".").pop();
            const fileName = `${Date.now()}_${Math.random()
              .toString(36)
              .substring(2, 7)}.${fileExt}`;
            const filePath = `reports/${fileName}`;

            // Upload ke Supabase Storage (Pastikan nama bucket "rtg_media" sudah dibuat & status PUBLIC)
            const { error: uploadError } = await supabase.storage
              .from("rtg_media")
              .upload(filePath, file);

            if (uploadError) {
              console.error(`Gagal upload ${file.name}:`, uploadError.message);
            } else {
              // Dapatkan Public URL setelah file berhasil terunggah
              const { data: publicUrlData } = supabase.storage
                .from("rtg_media")
                .getPublicUrl(filePath);

              if (publicUrlData?.publicUrl) {
                uploadedUrls.push(publicUrlData.publicUrl);
              }
            }
          }
        }

        // 4. Simpan ke Tabel Supabase `rtg_reports` dengan URL media yang valid
        const { error: insertReportError } = await supabase
          .from("rtg_reports")
          .insert([
            {
              rtg_id: rtgUnitData.id,
              pelapor_id: user.id,
              report_date: new Date().toISOString(),
              findings: deskripsiKendala,
              verification_status: "PENDING",
              priority: 3, // Diisi tipe number 3 (bukan string "3" jika tipe kolom int4)
              evidence_url: uploadedUrls, // <--- SUDAH TERISI ARRAY URL PUBLIC
            },
          ]);

        if (insertReportError) {
          console.error("Gagal simpan ke rtg_reports:", insertReportError.message);
          alert(`Gagal menyimpan laporan: ${insertReportError.message}`);
        } else {
          console.log("Berhasil menyimpan laporan ke rtg_reports!");
        }

        // 5. Update Status di tabel `rtg_statuses` dari READY -> NEED_REPAIR
        const { error: updateRtgStatusError } = await supabase
          .from("rtg_statuses")
          .update({
            status: "NEED_REPAIR",
            block: lokasiBlok || "BLOK A",
            last_updated: new Date().toISOString(),
          })
          .eq("id", rtgUnitData.id);

        if (updateRtgStatusError) {
          console.error(
            "Gagal update status RTG:",
            updateRtgStatusError.message
          );
        }

        // 6. Simpan ke localStorage (Untuk cadangan / sync temporary frontend)
        const mediaBase64Promises = selectedFiles.map((file) => {
          return new Promise<{ type: string; url: string; name: string }> (
            (resolve) => {
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
            }
          );
        });

        const mediaArray = await Promise.all(mediaBase64Promises);

        const newReport = {
          id: Date.now(),
          tanggal,
          jam:
            new Date().toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
            }) + " WIB",
          rtg: formattedUnitCode,
          lokasi: lokasiBlok || "BLOK A",
          pelapor: "Supervisi Lapangan",
          praOperasi: deskripsiKendala,
          pascaOperasi: "-",
          prioritas: "MENUNGGU MCC",
          status: "MENUNGGU VERIFIKASI MCC",
          teknisi: "Belum Ditugaskan",
          lampiranMedia: mediaArray,
          fotoBukti: mediaArray
            .filter((m) => m.type === "image" && m.url !== "")
            .map((m) => m.url),
          selectedFiles: selectedFiles.map((f) => f.name),
        };

        const existingReports = JSON.parse(
          localStorage.getItem("rtg_reports") || "[]"
        );
        try {
          localStorage.setItem(
            "rtg_reports",
            JSON.stringify([newReport, ...existingReports])
          );
        } catch (storageError) {
          localStorage.setItem("rtg_reports", JSON.stringify([newReport]));
        }

        setIsSubmitting(false);
        setIsSuccess(true);
      } catch (error) {
        console.error("Gagal memproses laporan:", error);
        setIsSubmitting(false);
        alert("Terjadi kesalahan saat memproses laporan.");
      }
    }, totalDuration);
  };

  const handleCloseModalAndNavigate = () => {
    setIsSuccess(false);
    setNomorRtg("");
    setLokasiBlok("");
    setDeskripsiKendala("");
    setSelectedFiles([]);
    setFilePreviews([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    router.push("/dasboard");
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
      <header className="bg-[#0b3c3c] text-white px-4 sm:px-8 py-4 flex items-center justify-between shadow-md relative z-50">
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
            <h1 className="font-bold text-sm sm:text-lg leading-none tracking-tight">PELAPORAN RTG</h1>
            <p className="text-[9px] sm:text-[11px] text-emerald-200 mt-0.5 hidden sm:block">
              OPERASIONAL LAPANGAN TERMINAL PETIKEMAS SURABAYA
            </p>
          </div>
        </div>

        {/* Navigasi Desktop */}
        <nav className="hidden lg:flex items-center space-x-1.5 bg-[#082e2e] p-1.5 rounded-full text-xs shadow-inner">
          {(role === "admin" || role === "operator") && (
            <Link
              href="/form-pelaporan"
              className={`px-3.5 sm:px-5 py-2 rounded-full transition font-semibold ${
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
              className={`px-3.5 sm:px-5 py-2 rounded-full transition font-semibold ${
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
              className={`px-3.5 sm:px-5 py-2 rounded-full transition font-semibold ${
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

        {/* Profile Pop-up */}
        <div className="flex items-center space-x-2 sm:space-x-4 shrink-0">

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

      {/* Main Form */}
      <main className="max-w-5xl mx-auto mt-6 px-4">
        <div className="bg-white rounded-2xl p-4 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-5 gap-3">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <FilePlus size={24} />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-800">Form Pelaporan Kondisi Alat RTG</h2>
                <p className="text-xs text-slate-400">Isi formulir berikut untuk melaporkan kendala ke Verifikasi MCC.</p>
              </div>
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
                          <span className="truncate max-w-[100px]">{item.name}</span>
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

      {/* POP-UP MODAL SEAMLESS */}
      {(isSubmitting || isSuccess) && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full text-center shadow-2xl relative overflow-hidden space-y-5 text-white">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400"></div>

            {/* STATUS LOADING */}
            {isSubmitting && (
              <div className="space-y-5 pt-2">
                <div className="flex justify-between items-center text-xs px-1">
                  <span className="text-slate-400 font-semibold flex items-center space-x-1.5">
                    <Radio size={14} className="animate-pulse text-emerald-400" />
                    <span>Transmisi Laporan...</span>
                  </span>
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-extrabold px-2.5 py-0.5 rounded-full text-[11px]">
                    {nomorRtg || "RTG CRANE"}
                  </span>
                </div>

                <div className="relative w-full h-20 bg-slate-950/80 rounded-2xl p-2 overflow-hidden border border-slate-800 flex flex-col justify-end">
                  <div
                    className="absolute top-2 transition-all duration-300 ease-linear flex flex-col items-center"
                    style={{ left: `calc(${progressPercent}% * 0.74)` }}
                  >
                    <div className="w-16 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                    <div className="w-0.5 bg-slate-300 h-4 my-0.5"></div>
                    <div className="w-10 h-5 bg-amber-500 rounded border border-amber-600 flex items-center justify-center text-[7px] font-black text-slate-950 shadow">
                      TPS
                    </div>
                    <div className="w-16 flex justify-between mt-0.5">
                      <div className="w-2.5 h-2.5 bg-slate-800 rounded-full animate-spin border border-slate-500"></div>
                      <div className="w-2.5 h-2.5 bg-slate-800 rounded-full animate-spin border border-slate-500"></div>
                    </div>
                  </div>
                  <div className="w-full h-1 bg-slate-800 rounded-full mb-1"></div>
                </div>

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
                    Data kerusakan unit <strong className="text-white">{nomorRtg}</strong> telah berhasil diteruskan ke antrean <span className="text-emerald-400 font-bold">Verifikasi MCC</span>.
                  </p>
                </div>

                <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 text-left text-xs space-y-2">
                  <div className="flex justify-between items-center text-slate-400 pb-1.5 border-b border-slate-800">
                    <span>Nomor Unit RTG:</span>
                    <span className="font-extrabold text-white bg-slate-800 px-2 py-0.5 rounded">{nomorRtg}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400 pb-1.5 border-b border-slate-800">
                    <span>Lokasi Terdeteksi:</span>
                    <span className="font-bold text-slate-200">{lokasiBlok || "Block A"}</span>
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
      <footer className="max-w-5xl mx-auto mt-6 flex flex-col sm:flex-row justify-between items-center text-[11px] text-slate-400 px-4 gap-2 text-center sm:text-left">
        <p>© 2026 Pelabuhan Petikemas - Sistem Operasional Rubber-Tired Gantry (RTG)</p>
        <div className="flex items-center space-x-3">
        </div>
      </footer>
    </div>
  );
}