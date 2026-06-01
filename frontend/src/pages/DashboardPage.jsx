import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Package,
  Key,
  Receipt,
  User as UserIcon,
  Copy,
  CheckCircle2,
  Loader2,
  Download,
  Calendar,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";

const TABS = [
  { id: "overview", label: "Overview", icon: Package },
  { id: "downloads", label: "Downloads", icon: Download },
  { id: "licenses", label: "Licenses", icon: Key },
  { id: "orders", label: "Orders", icon: Receipt },
  { id: "account", label: "Account", icon: UserIcon },
];

export default function DashboardPage() {
  const { user, updateProfile, logout } = useAuth();
  const [params, setParams] = useSearchParams();
  const initialTab = TABS.find((t) => t.id === params.get("tab"))?.id || "overview";
  const [tab, setTab] = useState(initialTab);
  const [summary, setSummary] = useState(null);
  const [orders, setOrders] = useState([]);
  const [licenses, setLicenses] = useState([]);
  const [downloads, setDownloads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setParams(tab === "overview" ? {} : { tab }, { replace: true });
  }, [tab, setParams]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      api.get("/me/summary"),
      api.get("/me/orders"),
      api.get("/me/licenses"),
      api.get("/downloads/me"),
    ])
      .then(([s, o, l, d]) => {
        if (cancelled) return;
        setSummary(s.data);
        setOrders(o.data);
        setLicenses(l.data);
        setDownloads(d.data);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="bg-app min-h-screen">
      <section className="relative pt-32 pb-20">
        <div className="absolute inset-0 grid-overlay" />
        <div className="relative mx-auto max-w-7xl px-5">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="inline-flex glass rounded-full px-3 py-1 text-[11.5px] uppercase tracking-[0.18em] text-slate-700">Dashboard</div>
                <h1 className="mt-3 font-display text-[34px] sm:text-[42px] text-slate-900 font-semibold tracking-tight">
                  Welcome back, {user?.name?.split(" ")[0]}.
                </h1>
                <p className="mt-1 text-slate-600 text-[14.5px]">
                  Manage your licenses, downloads, and orders.
                </p>
              </div>
            </div>

            <div className="mt-8">
              <div className="flex gap-1 overflow-x-auto pb-3 border-b border-slate-200 -mx-1 px-1">
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-[13.5px] transition-colors whitespace-nowrap border border-transparent ${
                      tab === t.id
                        ? "bg-slate-200 text-slate-900 border-slate-200"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-900/[0.025]"
                    }`}
                  >
                    <t.icon className="h-4 w-4 flex-shrink-0" />
                    <span className="hidden sm:inline">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-8">
              {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-slate-500" /></div>
              ) : tab === "overview" ? (
                <Overview summary={summary} licenses={licenses} />
              ) : tab === "downloads" ? (
                <Downloads downloads={downloads} />
              ) : tab === "licenses" ? (
                <Licenses licenses={licenses} />
              ) : tab === "orders" ? (
                <Orders orders={orders} />
              ) : (
                <Account user={user} updateProfile={updateProfile} onLogout={logout} />
              )}
            </div>
          </motion.div>
        </div>
      </section>
    </main>
  );
}

function StatCard({ label, value, icon: Icon }) {
  return (
    <div className="glass rounded-2xl p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <span className="text-[11.5px] sm:text-[12px] text-slate-500">{label}</span>
        {Icon && (
          <div className="h-7 w-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-blue-600 flex-shrink-0">
            <Icon className="h-3.5 w-3.5" />
          </div>
        )}
      </div>
      <div className="mt-2 font-display text-[24px] sm:text-[28px] text-slate-900 font-semibold tracking-tight break-all">{value}</div>
    </div>
  );
}

function Overview({ summary, licenses }) {
  const recent = licenses.slice(0, 3);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard label="Active licenses" value={summary?.active_licenses ?? 0} icon={Key} />
        <StatCard label="Paid orders" value={summary?.orders ?? 0} icon={Receipt} />
        <StatCard label="Account" value={"Active"} icon={ShieldCheck} />
      </div>

      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-[20px] text-slate-900 font-medium">Recent licenses</h2>
          <Link to="?tab=licenses" className="text-[13px] text-blue-600 hover:text-blue-700">View all</Link>
        </div>
        {recent.length === 0 ? (
          <EmptyState message="You don't have any licenses yet." cta={{ to: "/products", label: "Browse products" }} />
        ) : (
          <ul className="space-y-2">
            {recent.map((l) => <LicenseRow key={l.id} lic={l} compact />)}
          </ul>
        )}
      </div>
    </div>
  );
}

function Licenses({ licenses }) {
  if (licenses.length === 0) {
    return <EmptyState message="No licenses yet. Pick up a product to get started." cta={{ to: "/products", label: "Browse products" }} />;
  }
  return (
    <ul className="space-y-2">
      {licenses.map((l) => <LicenseRow key={l.id} lic={l} />)}
    </ul>
  );
}

function LicenseRow({ lic, compact }) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(lic.key);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  
  const handleDownload = async () => {
    try {
      setDownloading(true);
      const res = await api.get(`/downloads/license/${lic.id}/token`);
      window.location.href = `/api/downloads/license/${res.data.download_token}`;
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Download failed");
    } finally {
      setDownloading(false);
    }
  };
  
  const expired = lic.status !== "active";
  const expires = lic.expires_at ? new Date(lic.expires_at).toLocaleDateString() : "Lifetime";
  return (
    <li className="glass rounded-xl p-4">
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-4 justify-between">
        <div className="min-w-0 flex-1">
          <div className="text-[14.5px] text-slate-900 font-medium truncate">{lic.product_name}</div>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <code className="text-[11px] sm:text-[12px] text-blue-700 bg-slate-100 border border-slate-200 px-2 py-1 rounded-md break-all">{lic.key}</code>
            <button onClick={copy} className="h-7 w-7 flex-shrink-0 rounded-md glass flex items-center justify-center text-slate-600 hover:text-slate-900">
              {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            {lic.file_path && (
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="btn-primary !py-1.5 !px-3 !text-[12px] flex items-center gap-1.5"
              >
                {downloading ? (
                  <><Loader2 className="h-3 w-3 animate-spin" /> Downloading...</>
                ) : (
                  <><Download className="h-3.5 w-3.5" /> Download File</>
                )}
              </button>
            )}
          </div>
        </div>
        {!compact && (
          <div className="flex flex-wrap items-center gap-3 text-[11.5px] sm:text-[12px] text-slate-600">
            <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5 flex-shrink-0" /> {expires}</span>
            <span className={`px-2 py-0.5 rounded-md flex-shrink-0 ${expired ? "bg-rose-500/10 text-rose-600" : "bg-emerald-500/10 text-emerald-600"}`}>
              {lic.status}
            </span>
          </div>
        )}
      </div>
    </li>
  );
}

function Orders({ orders }) {
  if (orders.length === 0) {
    return <EmptyState message="You haven't placed any orders yet." cta={{ to: "/products", label: "Browse products" }} />;
  }
  
  const getStatusColor = (status) => {
    switch(status) {
      case "active":
      case "paid":
      case "fulfilled":
        return "bg-emerald-500/10 text-emerald-600";
      case "pending":
        return "bg-amber-500/10 text-amber-600";
      case "rejected":
      case "failed":
      case "refunded":
      case "cancelled":
        return "bg-rose-500/10 text-rose-600";
      case "expired":
        return "bg-slate-500/10 text-slate-600";
      default:
        return "bg-slate-500/10 text-slate-600";
    }
  };
  
  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[13.5px] min-w-[800px]">
          <thead>
            <tr className="text-left text-slate-500 text-[11.5px] uppercase tracking-wider border-b border-slate-200">
              <th className="px-4 sm:px-5 py-3">Order</th>
              <th className="px-4 sm:px-5 py-3">Items</th>
              <th className="px-4 sm:px-5 py-3">Total</th>
              <th className="px-4 sm:px-5 py-3">Status</th>
              <th className="px-4 sm:px-5 py-3">Activated</th>
              <th className="px-4 sm:px-5 py-3">Expires</th>
              <th className="px-4 sm:px-5 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 sm:px-5 py-3 text-slate-700 font-mono text-[12px]">{o.id.slice(0, 8)}</td>
                <td className="px-4 sm:px-5 py-3 text-slate-800 break-words max-w-[200px]">{o.items.map((i) => i.name).join(", ")}</td>
                <td className="px-4 sm:px-5 py-3 text-slate-900 whitespace-nowrap">${o.total.toFixed(2)}</td>
                <td className="px-4 sm:px-5 py-3">
                  <span className={`px-2 py-0.5 rounded-md text-[11px] whitespace-nowrap ${getStatusColor(o.status)}`}>{o.status}</span>
                  {o.simulated && <span className="ml-1 sm:ml-2 px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap bg-violet-500/10 text-violet-600">simulated</span>}
                </td>
                <td className="px-4 sm:px-5 py-3 text-slate-600 whitespace-nowrap">{o.activated_at ? new Date(o.activated_at).toLocaleDateString() : "-"}</td>
                <td className="px-4 sm:px-5 py-3 text-slate-600 whitespace-nowrap">{o.subscription_expires_at ? new Date(o.subscription_expires_at).toLocaleDateString() : "-"}</td>
                <td className="px-4 sm:px-5 py-3 text-slate-600 whitespace-nowrap">{new Date(o.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Account({ user, updateProfile, onLogout }) {
  const { setup2FA, verify2FA, disable2FA } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [twoFAStep, setTwoFAStep] = useState(user?.two_factor_enabled ? "enabled" : "disabled");
  const [twoFASecret, setTwoFASecret] = useState("");
  const [twoFAQr, setTwoFAQr] = useState("");
  const [twoFACode, setTwoFACode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [hasPassword, setHasPassword] = useState(user?.has_password ?? true); // Assume true by default

  // Check if user has a password (not a Google-only user)
  useEffect(() => {
    // We don't have a direct flag, but if user has google_id and no password set, they might not have a password
    // For simplicity, we'll rely on the backend to handle it, but let's update the UI
  }, [user]);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      const payload = { name };
      if (password) payload.password = password;
      await updateProfile(payload);
      setPassword("");
      setMsg("Saved.");
    } catch (err) {
      setMsg(err.response?.data?.detail || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleSetup2FA = async () => {
    try {
      const data = await setup2FA();
      setTwoFASecret(data.secret);
      setTwoFAQr(data.qr_code);
      setTwoFAStep("setup");
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to setup 2FA");
    }
  };

  const handleVerify2FA = async () => {
    try {
      await verify2FA(twoFACode);
      setTwoFAStep("enabled");
      setMsg("2FA enabled!");
    } catch (err) {
      alert(err.response?.data?.detail || "Invalid code");
    }
  };

  const handleDisable2FA = async () => {
    try {
      await disable2FA(disablePassword);
      setTwoFAStep("disabled");
      setDisablePassword("");
      setMsg("2FA disabled!");
    } catch (err) {
      alert(err.response?.data?.detail || "Invalid password");
    }
  };

  const isGoogleUser = user?.google_id; // We don't have this in UserPublic, but we can assume if they have no password

  return (
    <div className="space-y-6">
      <div className="max-w-xl glass rounded-2xl p-6">
        <h2 className="font-display text-[22px] text-slate-900 font-medium">Account settings</h2>
        <p className="mt-1 text-[13px] text-slate-500">Signed in as <span className="text-slate-700">{user?.email}</span></p>
        <form onSubmit={save} className="mt-6 space-y-4">
          <div>
            <label className="text-[12px] text-slate-600">Name</label>
            <input className="mt-2 w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-[14px] text-slate-900 focus:outline-none focus:border-blue-400/50" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="text-[12px] text-slate-600">New password (optional)</label>
            <input type="password" className="mt-2 w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-[14px] text-slate-900 focus:outline-none focus:border-blue-400/50" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Leave empty to keep current password" autoComplete="new-password" />
          </div>
          {msg && <p className="text-[13px] text-slate-700">{msg}</p>}
          <div className="flex items-center gap-3">
            <button disabled={saving} className="btn-primary !py-2.5">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}</button>
            <button type="button" onClick={onLogout} className="btn-ghost !py-2.5">Log out</button>
          </div>
        </form>
      </div>

      <div className="max-w-xl glass rounded-2xl p-6">
        <h2 className="font-display text-[22px] text-slate-900 font-medium">Two-factor authentication</h2>
        <p className="mt-1 text-[13px] text-slate-500">Add an extra layer of security to your account.</p>

        {twoFAStep === "disabled" && (
          <div className="mt-6">
            <button onClick={handleSetup2FA} className="btn-primary !py-2.5">
              Enable 2FA
            </button>
          </div>
        )}

        {twoFAStep === "setup" && (
          <div className="mt-6 space-y-4">
            <div className="glass rounded-xl p-4 bg-white">
              <img src={`data:image/png;base64,${twoFAQr}`} alt="QR Code" className="mx-auto" />
            </div>
            <p className="text-[13px] text-slate-600">
              Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.), or enter this secret: <code className="text-blue-700 bg-slate-100 px-2 py-1 rounded">{twoFASecret}</code>
            </p>
            <div>
              <label className="text-[12px] text-slate-600">Enter the 6-digit code from your app</label>
              <input
                type="text"
                maxLength={6}
                className="mt-2 w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-[14px] text-slate-900 focus:outline-none focus:border-blue-400/50"
                value={twoFACode}
                onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, ""))}
              />
            </div>
            <div className="flex gap-3">
              <button onClick={handleVerify2FA} className="btn-primary !py-2.5">
                Verify & enable
              </button>
              <button onClick={() => setTwoFAStep("disabled")} className="btn-ghost !py-2.5">
                Cancel
              </button>
            </div>
          </div>
        )}

        {twoFAStep === "enabled" && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-2 text-emerald-700 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2.5">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-[13px]">2FA is currently enabled</span>
            </div>
            {/* Only show password field if user might have a password */}
            <div>
              <label className="text-[12px] text-slate-600">Enter your password to disable 2FA (optional for Google users)</label>
              <input
                type="password"
                className="mt-2 w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-[14px] text-slate-900 focus:outline-none focus:border-blue-400/50"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                placeholder="Leave empty if you signed up with Google"
              />
            </div>
            <button onClick={handleDisable2FA} className="btn-ghost !py-2.5 !text-rose-700 hover:!bg-rose-50">
              Disable 2FA
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Downloads({ downloads }) {
  const [downloading, setDownloading] = useState({});

  const handleDownload = async (item) => {
    try {
      const key = item.type === "license" ? item.license.id : item.product.id;
      setDownloading((prev) => ({ ...prev, [key]: true }));
      
      if (item.type === "license") {
        const res = await api.get(`/downloads/license/${item.license.id}/token`);
        window.location.href = `/api/downloads/license/${res.data.download_token}`;
      } else {
        const res = await api.get(`/downloads/token/${item.product.id}`);
        window.location.href = `/api/downloads/${res.data.download_token}`;
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Download failed");
    } finally {
      const key = item.type === "license" ? item.license.id : item.product.id;
      setDownloading((prev) => ({ ...prev, [key]: false }));
    }
  };

  if (downloads.length === 0) {
    return <EmptyState message="No downloadable products yet. Purchase a product to get started." cta={{ to: "/products", label: "Browse products" }} />;
  }

  return (
    <ul className="space-y-2">
      {downloads.map((item) => {
        const date = item.order?.created_at || item.license?.created_at;
        const key = item.type === "license" ? item.license.id : item.product.id;
        return (
          <li key={key} className="glass rounded-xl p-4">
            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-4 justify-between">
              <div className="min-w-0 flex-1">
                <div className="text-[14.5px] text-slate-900 font-medium truncate">
                  {item.product?.name || "Product Download"}
                  {item.type === "license" && <span className="text-xs text-blue-600 ml-2">(License File)</span>}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 sm:gap-3 text-[11.5px] sm:text-[12px] text-slate-600">
                  <span className="flex items-center gap-1 flex-shrink-0">
                    <Download className="h-3.5 w-3.5" />
                    {item.download_count}/{item.max_downloads} downloads used
                  </span>
                  <span className={`px-2 py-0.5 rounded-md flex-shrink-0 ${
                    date
                      ? "bg-emerald-500/10 text-emerald-600"
                      : "bg-zinc-500/10 text-slate-700"
                  }`}>
                    {date ? `Added ${new Date(date).toLocaleDateString()}` : "Access granted"}
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleDownload(item)}
                disabled={downloading[key] || item.download_count >= item.max_downloads}
                className="btn-primary !py-2 !px-4 !text-[13px] flex items-center gap-2 w-full sm:w-auto justify-center"
              >
                {downloading[key] ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Downloading...</>
                ) : item.download_count >= item.max_downloads ? (
                  "Limit reached"
                ) : (
                  <><Download className="h-4 w-4" /> Download</>
                )}
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function EmptyState({ message, cta }) {
  return (
    <div className="glass rounded-2xl p-10 text-center">
      <div className="mx-auto h-10 w-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 mb-3">
        <Download className="h-4 w-4" />
      </div>
      <p className="text-slate-700">{message}</p>
      {cta && <Link to={cta.to} className="inline-block mt-4 btn-primary !py-2 !px-4 !text-[13px]">{cta.label}</Link>}
    </div>
  );
}
