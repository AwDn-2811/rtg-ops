"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Bell,
  User,
  LogOut,
  RefreshCw,
  Search,
  ShieldCheck,
  Menu,
  X,
  Clock,
  Filter,
} from "lucide-react";

interface AuditLogItem {
  id: string;
  user_name: string;
  user_role: string;
  action: string;
  description: string;
  target_id: string;
  created_at: string;
}

export default function AuditLogPage() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const [role, setRole] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("SEMUA");

  // Cek Hak Akses User (Khusus Admin & MCC)
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

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role, is_active")
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

        if (isMounted) setRole(profile.role);
      } catch (error) {
        console.error("Gagal memeriksa akses:", error);
        router.replace("/");
      } finally {
        if (isMounted) setProfileLoading(false);
      }
    }

    checkAccess();
    return () => {
      isMounted = false;
    };
  }, [router, supabase]);

  // Fetch Audit Logs dari Supabase
  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Gagal mengambil audit log:", error.message);
      } else if (data) {
        setLogs(data);
      }
    } catch (err) {
      console.error("Error fetching logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();

    // Realtime Listener untuk Audit Log
    const channel = supabase
      .channel("audit_logs_realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "audit_logs" },
        () => fetchLogs()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  // Filter Data Log
  const filteredLogs = logs.filter((l) => {
    const matchesSearch =
      l.description.toLowerCase().includes(search.toLowerCase()) ||
      (l.user_name && l.user_name.toLowerCase().includes(search.toLowerCase())) ||
      l.action.toLowerCase().includes(search.toLowerCase());

    const matchesAction =
      actionFilter === "SEMUA" || l.action === actionFilter;

    return matchesSearch && matchesAction;
  });

  if (profileLoading || !role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <p className="text-xs text-slate-500">Memeriksa hak akses...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans text-xs pb-10">
      {/* Navbar Header */}
      <header className="bg-[#0b3c3c] text-white px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-md relative z-50">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 text-slate-200 hover:text-white lg:hidden rounded-lg hover:bg-[#134e4e] transition cursor-pointer"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center shrink-0">
            <img
              src="/images/logopelindo.png"
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

          {(role === "admin" || role === "mcc") && (
            <Link
              href="/verifikasi-mcc"
              className={`px-5 py-2 rounded-full transition font-semibold ${
                pathname === "/verifikasi-mcc" ? "bg-white text-[#0b3c3c] shadow" : "text-slate-300 hover:text-white"
              }`}
            >
              Approval MCC
            </Link>
          )}

          <Link
            href="/dasboard"
            className={`px-5 py-2 rounded-full transition font-semibold ${
              pathname === "/dasboard" ? "bg-white text-[#0b3c3c] shadow" : "text-slate-300 hover:text-white"
            }`}
          >
            Dashboard
          </Link>

          {(role === "admin" || role === "teknisi") && (
            <Link
              href="/penanganan-teknis"
              className={`px-5 py-2 rounded-full transition font-semibold ${
                pathname === "/penanganan-teknis" ? "bg-white text-[#0b3c3c] shadow" : "text-slate-300 hover:text-white"
              }`}
            >
              Penanganan Teknisi
            </Link>
          )}

          {(role === "admin" || role === "mcc") && (
            <Link
              href="/audit-log"
              className={`px-5 py-2 rounded-full transition font-semibold ${
                pathname === "/audit-log" ? "bg-white text-[#0b3c3c] shadow" : "text-slate-300 hover:text-white"
              }`}
            >
              Audit Log
            </Link>
          )}
        </nav>

        {/* User Info */}
        <div className="flex items-center space-x-2 sm:space-x-4 shrink-0">
          <div className="flex items-center space-x-2 bg-[#134e4e] px-3 py-1.5 rounded-full text-xs border border-emerald-700/50">
            <div className="p-1 bg-emerald-500 rounded-full text-white">
              <User size={14} />
            </div>
            <span className="font-semibold text-white hidden sm:inline">
              Audit & Control
            </span>
          </div>
        </div>
      </header>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#082e2e] text-white px-4 py-3 border-b border-emerald-800/40 space-y-2 shadow-lg">
          <Link href="/dasboard" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2 rounded-lg text-xs font-semibold text-slate-200">Dashboard Monitoring</Link>
          <Link href="/verifikasi-mcc" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2 rounded-lg text-xs font-semibold text-slate-200">Approval MCC</Link>
          <Link href="/penanganan-teknis" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2 rounded-lg text-xs font-semibold text-slate-200">Penanganan Teknisi</Link>
          <Link href="/audit-log" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2 rounded-lg text-xs font-semibold bg-white text-[#0b3c3c]">Audit Log</Link>
        </div>
      )}

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 mt-4 sm:mt-6 space-y-4 sm:space-y-5">
        {/* Banner Title */}
        <div className="bg-[#0f4c5c] text-white p-5 rounded-xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 bg-[#175d70] px-3 py-1 rounded-full text-xs text-emerald-300 mb-2">
              <ShieldCheck size={14} />
              <span>SECURITY & AUDIT LOG TRAIL</span>
            </div>
            <h2 className="text-xl font-bold">Riwayat Aktivitas & Log Perubahan System</h2>
            <p className="text-slate-300 text-xs mt-0.5">
              Jejak digital lengkap seluruh persetujuan tiket MCC, penanganan teknisi, dan pemindahan status Waiting Pack.
            </p>
          </div>
          <button
            onClick={fetchLogs}
            className="bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow"
          >
            <RefreshCw size={14} />
            <span>Refresh Audit Log</span>
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 justify-between items-center">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari kata kunci, deskripsi, atau user..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full sm:w-auto bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="SEMUA">Semua Jenis Aksi</option>
              <option value="MCC_APPROVE">MCC Approve</option>
              <option value="MCC_REJECT">MCC Reject</option>
              <option value="HOLD_WAITING_PACK">Hold Waiting Pack</option>
              <option value="COMPLETE_REPAIR">Perbaikan Selesai</option>
            </select>
          </div>
        </div>

        {/* Tabel Data Audit Log */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <th className="p-3.5">Waktu Kejadian</th>
                  <th className="p-3.5">User Executed</th>
                  <th className="p-3.5">Aksi / Action</th>
                  <th className="p-3.5">Deskripsi Perubahan System</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-400">
                      Memuat data audit log...
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-400">
                      Belum ada log aktivitas yang sesuai.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3.5 text-slate-500 whitespace-nowrap">
                        <div className="flex items-center space-x-1.5">
                          <Clock size={13} className="text-slate-400" />
                          <span>{new Date(log.created_at).toLocaleString("id-ID")}</span>
                        </div>
                      </td>
                      <td className="p-3.5 font-semibold text-slate-800">
                        <div>
                          <span>{log.user_name || "Sistem Automated"}</span>
                          <span className="ml-2 text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold uppercase">
                            {log.user_role || "ADMIN"}
                          </span>
                        </div>
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 rounded-full font-extrabold text-[9px] ${
                            log.action === "MCC_APPROVE"
                              ? "bg-emerald-100 text-emerald-700"
                              : log.action === "MCC_REJECT"
                              ? "bg-red-100 text-red-700"
                              : log.action === "HOLD_WAITING_PACK"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-600 leading-relaxed">
                        {log.description}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 mt-6 flex justify-between items-center text-[10px] text-slate-400 border-t border-slate-200/60 pt-4">
        <p>© 2026 Terminal Petikemas Surabaya - Sistem Operasional Rubber-Tired Gantry (RTG).</p>
        <div>Audit Log Engine • TOS Connected</div>
      </footer>
    </div>
  );
}