import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Lock, ArrowRight, Loader2, AlertCircle, Activity } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api, setSession } from "../lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [needs2FA, setNeeds2FA] = useState(false);
  const { login, loginWithGoogle, setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const nextParam = new URLSearchParams(location.search).get("next") || "/dashboard";

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError("");
    try {
      // Get Google auth URL
      const res = await api.get("/auth/google/url");
      const authUrl = res.data.auth_url;
      
      // Open popup
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      const popup = window.open(
        authUrl,
        "google-auth",
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
      );
      
      // Listen for messages from popup
      const handleMessage = async (event) => {
        if (event.data?.access_token) {
          const { access_token, refresh_token, user: userData } = event.data;
          setSession({ access_token, refresh_token, user: userData });
          setUser(userData);
          navigate(userData.role === "admin" ? "/admin" : nextParam);
          setGoogleLoading(false);
        } else if (event.data?.error) {
          setError(event.data.error);
          setGoogleLoading(false);
        }
      };
      
      window.addEventListener("message", handleMessage);
      
      // Check if popup is closed
      const checkPopup = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(checkPopup);
          window.removeEventListener("message", handleMessage);
          setGoogleLoading(false);
        }
      }, 500);
      
    } catch (err) {
      setError(err.response?.data?.detail || "Google login failed.");
      setGoogleLoading(false);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(email.trim(), password, needs2FA ? twoFactorCode : null);
      navigate(user.role === "admin" ? "/admin" : nextParam);
    } catch (err) {
      if (err.response?.status === 401 && err.response?.headers?.["www-authenticate"] === "TwoFactor") {
        setNeeds2FA(true);
      } else {
        setError(err.response?.data?.detail || "Login failed. Check your credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  return <AuthShell title="Welcome back" subtitle="Sign in to access your dashboard and licenses.">
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <ErrorBanner message={error} />}
      {!needs2FA && (
        <>
          <Field icon={Mail} label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" required />
          <Field icon={Lock} label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••" required />
          <div className="flex items-center justify-between text-[12.5px]">
            <Link to="/forgot-password" className="text-slate-600 hover:text-slate-900 transition-colors">Forgot password?</Link>
          </div>
        </>
      )}
      {needs2FA && (
        <div className="space-y-4">
          <p className="text-[14px] text-slate-700">
            Two-factor authentication is enabled. Enter the 6-digit code from your authenticator app.
          </p>
          <Field icon={Lock} label="2FA Code" type="text" value={twoFactorCode} onChange={(v) => setTwoFactorCode(v.replace(/\D/g, ""))} placeholder="000000" maxLength={6} required />
          <button type="button" onClick={() => setNeeds2FA(false)} className="text-[13px] text-slate-600 hover:text-slate-900">
            Back
          </button>
        </div>
      )}
      <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Sign in <ArrowRight className="h-4 w-4" /></>}
        </button>
        
        {!needs2FA && (
          <>
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-500">
                  Or continue with
                </span>
              </div>
            </div>
            
            <button 
              type="button"
              disabled={googleLoading} 
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-[14px] text-slate-900 hover:bg-slate-50 transition-colors"
            >
              {googleLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
              )}
              {googleLoading ? "Signing in..." : "Sign in with Google"}
            </button>
            
            <p className="text-center text-[13px] text-slate-500">
              New here? <Link to="/register" className="text-blue-600 hover:text-blue-700">Create an account</Link>
            </p>
          </>
        )}
    </form>
  </AuthShell>;
}

export function AuthShell({ title, subtitle, children }) {
  return (
    <main className="bg-app min-h-screen">
      <section className="relative pt-32 pb-20 sm:pt-40 overflow-hidden">
        <div className="absolute inset-0 grid-overlay" />
        <div className="relative mx-auto max-w-md px-5">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="flex justify-center mb-6">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center shadow-[0_0_28px_-4px_rgba(96,165,250,0.6)]">
                <Activity className="h-5 w-5 text-slate-900" strokeWidth={2.5} />
              </div>
            </div>
            <h1 className="font-display text-[34px] text-slate-900 font-semibold tracking-tight text-center">{title}</h1>
            {subtitle && <p className="mt-2 text-slate-600 text-[15px] text-center">{subtitle}</p>}
            <div className="mt-8 glass-strong rounded-2xl p-7">{children}</div>
          </motion.div>
        </div>
      </section>
    </main>
  );
}

export function Field({ icon: Icon, label, value, onChange, type = "text", placeholder, required, autoComplete }) {
  return (
    <div>
      <label className="text-[12px] text-slate-600">{label}</label>
      <div className="mt-2 relative">
        {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          className={`w-full bg-white border border-slate-200 rounded-lg ${Icon ? "pl-10" : "pl-3"} pr-3 py-2.5 text-[14px] text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-blue-400/50 transition-colors`}
        />
      </div>
    </div>
  );
}

export function ErrorBanner({ message }) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-rose-500/10 border border-rose-500/30 px-3 py-2.5 text-[13px] text-rose-700">
      <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export function SuccessBanner({ message }) {
  return (
    <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-2.5 text-[13px] text-emerald-700">
      {message}
    </div>
  );
}
