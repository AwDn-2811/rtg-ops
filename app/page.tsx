
"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import "./login.css";
import {
  UserRound,
  LockKeyhole,
  Eye,
  EyeOff,
} from "lucide-react";
import "./globals.css";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  //footer year
  const [year, setYear] = useState<number | null>(null);

  //menggunakan useRouter untuk navigasi fungsi login
  const router = useRouter();

useEffect(() => {
  setYear(new Date().getFullYear());
}, []);

  function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // Tampilan frontend saja.
    // Hubungkan ke API autentikasi di sini.
    console.log({
      username,
      rememberMe,
    });
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
            <UserRound size={18} className="input-icon" />

            <input
              type="text"
              placeholder="Username or Email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              aria-label="Username or Email"
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
              required
            />

            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={
                showPassword ? "Hide password" : "Show password"
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
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span>Remember me</span>
            </label>

            <a href="/forgot-password" className="forgot-link">
              Forgot password?
            </a>
          </div>

          <button
            type="button"
            className="login-button"
            onClick={() => router.push("/dasboard")}
          >
            Log In
          </button>
        </form>

        <p className="register-text">
          Don't have an account?{" "}
          <a href="mailto:admin@portway.com">
            Contact Administrator
          </a>
        </p>
      </section>

      <footer className="page-footer">
        PORTWAY © {year ?? "2026"} · PORT OPERATIONS
      </footer>
    </main>
  );
}