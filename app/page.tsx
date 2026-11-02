
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
} from "lucide-react";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Footer year
  const [year, setYear] = useState<number | null>(null);

  const router = useRouter();

  const supabase = createClient();

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  async function handleLogin(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

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
        setErrorMessage(
          "Email atau password yang Anda masukkan salah."
        );
        return;
      }

      const user = authData.user;

      if (!user) {
        setErrorMessage(
          "User tidak ditemukan."
        );
        return;
      }

      // 2. Ambil role dan status akun dari tabel profiles
      const { data: profile, error: profileError } =
        await supabase
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

        setErrorMessage(
          "Akun Anda sedang dinonaktifkan."
        );

        return;
      }

      // 4. Redirect berdasarkan role
      switch (profile.role) {
        case "admin":
          router.replace("/dasboard");
          break;

        case "operator":
          router.replace("/dasboard");
          break;

        case "mcc":
          router.replace("/dasboard");
          break;

        case "teknisi":
          router.replace("/dasboard");
          break;

        default:
          await supabase.auth.signOut();

          setErrorMessage(
            "Role user tidak valid. Hubungi administrator."
          );
      }

    } catch (error) {
      console.error("Login error:", error);

      setErrorMessage(
        "Terjadi kesalahan saat login. Silakan coba kembali."
      );

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
              src="/images/TPS.png"
              alt="Logo Terminal Petikemas Surabaya"
            />
          </div>

          <div className="brand-info">
            <h1>RTG-ops</h1>

            <p className="brand-subtitle">
              PORT OPERATIONS MANAGEMENT
            </p>
          </div>
        </div>

        <form onSubmit={handleLogin}>
          <div className="input-group">
            <UserRound
              size={18}
              className="input-icon"
            />

            <input
              type="email"
              placeholder="Email"
              value={username}
              onChange={(e) =>
                setUsername(e.target.value)
              }
              autoComplete="username"
              aria-label="Email"
              required
            />
          </div>

          <div className="input-group">
            <LockKeyhole
              size={18}
              className="input-icon"
            />

            <input
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              placeholder="Password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              autoComplete="current-password"
              aria-label="Password"
              required
            />

            <button
              type="button"
              className="password-toggle"
              onClick={() =>
                setShowPassword(!showPassword)
              }
              aria-label={
                showPassword
                  ? "Hide password"
                  : "Show password"
              }
            >
              {showPassword ? (
                <EyeOff size={18} />
              ) : (
                <Eye size={18} />
              )}
            </button>
          </div>

          <div className="form-options">
            <label className="remember-option">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) =>
                  setRememberMe(e.target.checked)
                }
              />

              <span>Remember me</span>
            </label>

            <a
              href="/forgot-password"
              className="forgot-link"
            >
              Forgot password?
            </a>
          </div>

          {errorMessage && (
            <p className="login-error">
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading ? "Logging In..." : "Log In"}
          </button>
        </form>

        <p className="register-text">
          Don&apos;t have an account?{" "}
          <a href="mailto:admin@portway.com">
            Contact Administrator
          </a>
        </p>
      </section>

      <footer className="page-footer">
        PORTWAY © {year ?? ""} · PORT OPERATIONS
      </footer>
    </main>
  );
}
