import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Loader2, Mail, Lock, User } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { AuthShell, Field, ErrorBanner } from "./LoginPage";
import { api, setSession } from "../lib/api";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { register, setUser } = useAuth();
  const navigate = useNavigate();

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
          navigate(userData.role === "admin" ? "/admin" : "/dashboard");
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
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (!agreeTerms) return setError("You must agree to the Terms and Conditions.");
    setLoading(true);
    try {
      await register({ name: name.trim(), email: email.trim(), password });
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.detail || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Create your account" subtitle="Start with SpikeBulls in under a minute.">
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <ErrorBanner message={error} />}
        <Field icon={User} label="Full name" value={name} onChange={setName} placeholder="Your name" required autoComplete="name" />
        <Field icon={Mail} label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" required autoComplete="email" />
        <Field icon={Lock} label="Password" type="password" value={password} onChange={setPassword} placeholder="At least 8 characters" required autoComplete="new-password" />
        
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="agreeTerms"
            checked={agreeTerms}
            onChange={(e) => setAgreeTerms(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            required
          />
          <label htmlFor="agreeTerms" className="text-[13px] text-slate-600 leading-relaxed">
            I agree to the <Link to="/terms" className="text-blue-600 hover:text-blue-700 font-medium">Terms and Conditions</Link>
          </label>
        </div>
        
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Create account <ArrowRight className="h-4 w-4" /></>}
        </button>
        
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
              {googleLoading ? "Signing in..." : "Continue with Google"}
            </button>
        
        <p className="text-center text-[13px] text-slate-500">
          Already have an account? <Link to="/login" className="text-blue-600 hover:text-blue-700">Sign in</Link>
        </p>
      </form>
    </AuthShell>
  );
}
