"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import "./login.css";

import {
  UserRound,
  LockKeyhole,
  Eye,
  EyeOff,
  ArrowLeft,
  HelpCircle,
  MessageSquare,
  X,
  CheckCircle2,
} from "lucide-react";

export default function LoginPage() {
  // Mode tampilan: 'login' | 'forgot'
  const [viewMode, setViewMode] = useState<"login" | "forgot">("login");

  // State Login Form
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // State Forgot Password Form
  const [forgotEmail, setForgotEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);

  // State Modal Contact Administrator
  const [showContactModal, setShowContactModal] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Footer year
  const [year, setYear] = useState<number | null>(null);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  // State untuk pembatasan login
  const MAX_ATTEMPTS = 3; // Maksimal 3 kali salah
  const LOCKOUT_TIME = 60; // Waktu kunci dalam detik (1 menit)

  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTimer, setLockoutTimer] = useState(0);

  // Timer Hitung Mundur saat Akun Terkunci
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (lockoutTimer > 0) {
      timer = setInterval(() => {
        setLockoutTimer((prev) => prev - 1);
      }, 1000);
    } else if (lockoutTimer === 0 && failedAttempts >= MAX_ATTEMPTS) {
      // Reset percobaan setelah waktu kunci selesai
      setFailedAttempts(0);
      setErrorMessage("");
    }
    return () => clearInterval(timer);
  }, [lockoutTimer, failedAttempts]);

  // Fungsi untuk beralih ke Form Forgot Password (otomatis membawa email jika sudah diketik di login)
  const handleGoToForgot = () => {
    setErrorMessage("");
    if (username.trim()) {
      setForgotEmail(username.trim());
    }
    setViewMode("forgot");
  };

  // Handler Login dengan Supabase Auth
  async function handleLogin(e: FormEvent<HTMLFormElement>) {
  e.preventDefault();
  // ...
  // Jika sedang terkunci, batalkan login
  if (lockoutTimer > 0) {
    return;
  }

  setLoading(true);
  setErrorMessage("");

  try {
    // 1. Login menggunakan Supabase Auth
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email: username.trim(),
        password: password,
      });

    if (authError) {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);

      if (newAttempts >= MAX_ATTEMPTS) {
        setLockoutTimer(LOCKOUT_TIME);
        setErrorMessage(
          `Anda telah salah memasukkan password ${MAX_ATTEMPTS} kali. Akses dikunci sementara selama ${LOCKOUT_TIME} detik.`
        );
      } else {
        const remaining = MAX_ATTEMPTS - newAttempts;
        setErrorMessage(
          `Email atau password salah. Sisa percobaan: ${remaining} kali.`
        );
      }
      return;
    }

    const user = authData.user;

    if (!user) {
      setErrorMessage("User tidak ditemukan.");
      return;
    }

    // Reset percobaan jika berhasil login
    setFailedAttempts(0);

    // 2. Ambil role dan status akun dari tabel profiles
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, role, is_active")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      await supabase.auth.signOut();
      setErrorMessage(
        "Profil user tidak ditemukan. Hubungi administrator."
      );
      return;
    }

    // 3. Periksa apakah akun aktif
    if (!profile.is_active) {
      await supabase.auth.signOut();
      setErrorMessage("Akun Anda sedang dinonaktifkan.");
      return;
    }

    // 4. Redirect berdasarkan role
    switch (profile.role) {
      case "admin":
      case "operator":
      case "mcc":
      case "teknisi":
        router.replace("/dasboard");
        break;

      default:
        await supabase.auth.signOut();
        setErrorMessage("Role user tidak valid. Hubungi administrator.");
    }
  } catch (error) {
    console.error("Login error:", error);
    setErrorMessage("Terjadi kesalahan saat login. Silakan coba kembali.");
  } finally {
    setLoading(false);
  }
}

  // Handler Reset / Ganti Password (DILENGKAPI VALIDASI MINIMAL 6 KARAKTER)
  async function handleResetPassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage("");

    // Validasi minimal 6 karakter untuk password baru
    if (newPassword.length < 6) {
      setErrorMessage("Password baru minimal harus 6 karakter.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Konfirmasi password baru tidak cocok.");
      return;
    }

    setLoading(true);

    try {
      // Mengirim email reset password dari Supabase Auth
      const { error } = await supabase.auth.resetPasswordForEmail(
        forgotEmail.trim(),
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      );

      if (error) {
        setErrorMessage(error.message || "Gagal memproses ganti password.");
        return;
      }

      setForgotSuccess(true);
      setTimeout(() => {
        setForgotSuccess(false);
        setViewMode("login");
        setForgotEmail("");
        setNewPassword("");
        setConfirmPassword("");
      }, 2500);
    } catch (err) {
      console.error("Forgot password error:", err);
      setErrorMessage("Gagal memproses permohonan ganti password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <div className="background-overlay" />

      <section className="login-card">
        <div className="brand">
          <div className="brand-logo">
            <img
              src="/images/TPS.webp"
              alt="Logo Terminal Petikemas Surabaya"
            />
          </div>

          <div className="brand-info">
            <h1>RTG-ops</h1>
            <p className="brand-subtitle">PORT OPERATIONS MANAGEMENT</p>
          </div>
        </div>

        {/* ================= VIEW 1: FORM LOGIN ================= */}
        {viewMode === "login" && (
          <form onSubmit={handleLogin}>
            <div className="input-group">
              <UserRound size={18} className="input-icon" />
              <input
                type="email"
                placeholder="Email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                aria-label="Email"
                required
              />
            </div>

            <div className="input-group">
              <LockKeyhole size={18} className="input-icon" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                aria-label="Password"
                minLength={6}
                required
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="form-options">
              <label className="remember-option">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Remember me</span>
              </label>

              <button
                type="button"
                className="forgot-button-link"
                onClick={handleGoToForgot}
              >
                Forgot password?
              </button>
            </div>

            {errorMessage && <p className="login-error">{errorMessage}</p>}

            <button
              type="submit"
              className="login-button"
              disabled={loading|| lockoutTimer > 0}
            >
              {lockoutTimer > 0
              ? `Coba lagi dalam ${lockoutTimer}s`
              : loading
              ? "Logging In..."
              : "Log In"}
          </button>
          </form>
        )}

        {/* ================= VIEW 2: FORM FORGOT PASSWORD ================= */}
        {viewMode === "forgot" && (
          <form onSubmit={handleResetPassword} className="forgot-form">
            <div className="forgot-header">
              <button
                type="button"
                className="back-to-login"
                onClick={() => {
                  setErrorMessage("");
                  setViewMode("login");
                }}
              >
                <ArrowLeft size={16} /> Kembali
              </button>
              <span className="forgot-title">Ganti Password</span>
            </div>

            {forgotSuccess ? (
              <div className="forgot-success-box">
                <CheckCircle2 size={32} className="success-icon" />
                <p className="success-title">Permohonan Terkirim!</p>
                <p className="success-desc">
                  Instruksi pemulihan telah dikirim ke email Anda. Mengalihkan...
                </p>
              </div>
            ) : (
              <>
                <div className="input-group">
                  <UserRound size={18} className="input-icon" />
                  <input
                    type="email"
                    placeholder="Email Terdaftar"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="input-group">
                  <LockKeyhole size={18} className="input-icon" />
                  <input
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Password Baru (min. 6 karakter)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <div className="input-group">
                  <LockKeyhole size={18} className="input-icon" />
                  <input
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Konfirmasi Password Baru"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    minLength={6}
                    required
                  />
                </div>

                {errorMessage && <p className="login-error">{errorMessage}</p>}

                <button
                  type="submit"
                  className="login-button"
                  disabled={loading}
                >
                  {loading ? "Memproses..." : "Simpan Password Baru"}
                </button>
              </>
            )}
          </form>
        )}

        {/* ================= REGISTER / CONTACT ADMIN ================= */}
        <p className="register-text">
          Don&apos;t have an account?{" "}
          <button
            type="button"
            className="contact-admin-btn"
            onClick={() => setShowContactModal(true)}
          >
            Contact Administrator
          </button>
        </p>
      </section>

      {/* ================= MODAL CONTACT ADMINISTRATOR ================= */}
      {showContactModal && (
        <div className="modal-overlay">
          <div className="contact-modal">
            <div className="modal-header">
              <div className="modal-header-info">
                <div className="modal-icon-bg">
                  <HelpCircle size={20} />
                </div>
                <div>
                  <h3>Contact Administrator</h3>
                  <p>Bantuan Akses & Akun RTG-ops</p>
                </div>
              </div>
              <button
                type="button"
                className="close-modal-btn"
                onClick={() => setShowContactModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <p className="modal-desc">
                Silakan hubungi Tim Admin IT & Operasional TPS untuk pendaftaran akun baru atau pemulihan akses khusus:
              </p>

              <div className="contact-info-card">
                <div className="info-row">
                  <span className="info-label">Layanan Helpdesk:</span>
                  <span className="info-value">Shift A/B Operasional</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Ext. Telepon:</span>
                  <span className="info-value">#4402 (Internal TPS)</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Email Support:</span>
                  <span className="info-value highlight">it.support@tps.co.id</span>
                </div>
              </div>

              <a
                href="https://wa.me/6281234567890?text=Halo%20Admin%20RTG-ops,%20saya%20ingin%20mengajukan%20akses/akun%20baru."
                target="_blank"
                rel="noopener noreferrer"
                className="whatsapp-btn"
              >
                <MessageSquare size={16} />
                <span>Chat Admin via WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      )}

      <footer className="page-footer">
        PORTWAY © {year ?? ""} · PORT OPERATIONS
      </footer>
    </main>
  );
}