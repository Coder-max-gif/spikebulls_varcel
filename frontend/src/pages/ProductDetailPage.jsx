import React, { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  ShoppingCart,
  LineChart,
  Bot,
  Radio,
  Settings2,
  ShieldCheck,
  Calendar,
} from "lucide-react";
import { useProduct } from "../lib/queries";
import { startCheckout } from "../lib/queries";
import { useAuth } from "../context/AuthContext";
import AnimatedDashboard from "../components/AnimatedDashboard";
import FinalCTA from "../components/FinalCTA";

const ICONS = { indicator: LineChart, algo: Bot, signals: Radio, automation: Settings2 };

export default function ProductDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { product, loading, error } = useProduct(slug);
  const { isAuthenticated } = useAuth();
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState("");
  const [selectedTier, setSelectedTier] = useState(null);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const handleBuy = async (tierId = null) => {
    setBuyError("");
    if (!isAuthenticated) {
      navigate(`/login?next=${encodeURIComponent(`/products/${slug}`)}`);
      return;
    }
    setBuying(true);
    try {
      const result = await startCheckout([product.id]);
      if (result.mode === "stripe" && result.checkout_url) {
        window.location.href = result.checkout_url;
      } else {
        sessionStorage.setItem("binancePaymentInfo", JSON.stringify({
          order_id: result.order_id,
          payment_instructions: result.payment_instructions,
          binance_address: result.binance_address,
          binance_qr_text: result.binance_qr_text,
          binance_qr_image_url: result.binance_qr_image_url,
          binance_email: result.binance_email
        }));
        navigate(`/checkout/success?order_id=${result.order_id}`);
      }
    } catch (err) {
      setBuyError(err.response?.data?.detail || "Checkout failed.");
    } finally {
      setBuying(false);
    }
  };

  if (loading) {
    return (
      <main className="bg-app min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
      </main>
    );
  }
  if (error || !product) {
    return (
      <main className="bg-app min-h-screen flex items-center justify-center text-slate-600">
        <div className="text-center">
          <p>Product not found.</p>
          <Link to="/products" className="mt-4 inline-block btn-primary">Back to catalog</Link>
        </div>
      </main>
    );
  }

  const Icon = ICONS[product.category] || LineChart;
  const isViolet = product.accent === "violet" || product.accent === "gradient";

  return (
    <main className="bg-app">
      <section className="relative pt-32 pb-16 sm:pt-40 sm:pb-20 overflow-hidden">
        <div className="absolute inset-0 grid-overlay" />
        <div className="relative mx-auto max-w-7xl px-5">
          <button onClick={() => navigate("/products")} className="inline-flex items-center gap-2 text-[13px] text-slate-600 hover:text-slate-900 transition-colors mb-8">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to products
          </button>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <div className={`inline-flex items-center gap-2 glass rounded-full px-3 py-1 text-[11.5px] uppercase tracking-[0.18em] ${isViolet ? "text-violet-600" : "text-blue-600"}`}>
                <Icon className="h-3.5 w-3.5" />
                {product.category}
              </div>
              <h1 className="mt-5 font-display text-[44px] sm:text-[58px] font-semibold tracking-tight leading-[1.05] text-slate-900">
                {product.name}
              </h1>
              <p className="mt-5 text-slate-600 text-[16px] sm:text-[17px] leading-relaxed max-w-xl">
                {product.description}
              </p>

              {product.subscription_tiers && product.subscription_tiers.length > 0 ? (
                <div className="mt-7 space-y-4">
                  <div className="grid gap-3">
                    {product.subscription_tiers.map((tier, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedTier(index)}
                        className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                          selectedTier === index
                            ? (isViolet ? "border-violet-500 bg-violet-500/10" : "border-blue-500 bg-blue-500/10")
                            : "border-slate-200 bg-slate-900/[0.025] hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                              selectedTier === index
                                ? (isViolet ? "border-violet-400" : "border-blue-400")
                                : "border-zinc-500"
                            }`}>
                              {selectedTier === index && (
                                <div className={`w-2 h-2 rounded-full ${
                                  isViolet ? "bg-violet-400" : "bg-blue-400"
                                }`} />
                              )}
                            </div>
                            <span className="font-medium text-slate-900">{tier.name}</span>
                            {tier.badge && (
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-gradient-to-r from-blue-500 to-violet-500 text-slate-900">
                                {tier.badge}
                              </span>
                            )}
                          </div>
                          <div className="flex items-baseline gap-2">
                            <span className="font-display text-[28px] text-slate-900 font-semibold">${tier.price.toFixed(0)}</span>
                            {tier.compare_at_price && tier.compare_at_price > tier.price && (
                              <span className="text-[14px] text-slate-500 line-through">${tier.compare_at_price.toFixed(0)}</span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  {buyError && <p className="mt-3 text-[13px] text-rose-600">{buyError}</p>}

                  <div className="mt-6 flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="agreeTermsProduct"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      required
                    />
                    <label htmlFor="agreeTermsProduct" className="text-[13px] text-slate-600 leading-relaxed">
                      I agree to the <Link to="/terms" className="text-blue-600 hover:text-blue-700 font-medium">Terms and Conditions</Link>
                    </label>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button 
                      onClick={() => handleBuy(selectedTier)} 
                      disabled={buying || selectedTier === null || !agreeTerms} 
                      className="btn-primary" 
                      style={isViolet ? {
                        background: "linear-gradient(180deg, #8B5CF6 0%, #7C3AED 100%)",
                        borderColor: "rgba(167,139,250,0.6)",
                        boxShadow: "0 8px 24px -8px rgba(139,92,246,0.55), inset 0 1px 0 rgba(255,255,255,0.25)",
                      } : undefined}
                    >
                      {buying ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ShoppingCart className="h-4 w-4" /> Buy now</>}
                    </button>
                    <Link to="/contact" className="btn-ghost">Request demo</Link>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mt-7 flex items-baseline gap-3">
                    <span className="font-display text-[48px] text-slate-900 font-semibold tracking-tight">${product.price.toFixed(0)}</span>
                    {product.compare_at_price && product.compare_at_price > product.price && (
                      <span className="text-[16px] text-slate-500 line-through">${product.compare_at_price.toFixed(0)}</span>
                    )}
                    <span className="text-[13px] text-slate-500">
                      · {product.delivery_type === "membership" ? "30-day membership" : "Lifetime license"}
                    </span>
                  </div>

                  {buyError && <p className="mt-3 text-[13px] text-rose-600">{buyError}</p>}

                  <div className="mt-6 flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="agreeTermsProduct2"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      required
                    />
                    <label htmlFor="agreeTermsProduct2" className="text-[13px] text-slate-600 leading-relaxed">
                      I agree to the <Link to="/terms" className="text-blue-600 hover:text-blue-700 font-medium">Terms and Conditions</Link>
                    </label>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button onClick={handleBuy} disabled={buying || !agreeTerms} className="btn-primary" style={isViolet ? {
                      background: "linear-gradient(180deg, #8B5CF6 0%, #7C3AED 100%)",
                      borderColor: "rgba(167,139,250,0.6)",
                      boxShadow: "0 8px 24px -8px rgba(139,92,246,0.55), inset 0 1px 0 rgba(255,255,255,0.25)",
                    } : undefined}>
                      {buying ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ShoppingCart className="h-4 w-4" /> Buy now</>}
                    </button>
                    <Link to="/contact" className="btn-ghost">Request demo</Link>
                  </div>
                </>
              )}

              <ul className="mt-8 grid sm:grid-cols-2 gap-x-4 gap-y-2.5">
                {(product.features || []).map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[13.5px] text-slate-700">
                    <Check className={`h-4 w-4 mt-0.5 shrink-0 ${isViolet ? "text-violet-400" : "text-blue-400"}`} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6 flex flex-wrap items-center gap-2">
                {(product.platforms || []).map((pl) => (
                  <span key={pl} className="text-[11px] text-slate-600 px-2 py-1 rounded-md bg-slate-100 border border-slate-200">
                    {pl}
                  </span>
                ))}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}>
              <AnimatedDashboard />
            </motion.div>
          </div>
        </div>
      </section>

      {product.images && product.images.length > 0 && (
        <section className="py-12">
          <div className="mx-auto max-w-7xl px-5">
            <div className="glass-strong rounded-2xl overflow-hidden">
              <div className="relative aspect-[21/9]">
                <img src={product.images[0]} alt={product.name} className="absolute inset-0 w-full h-full object-cover opacity-55" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#F8FAFC] via-white/30 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
                  <div>
                    <div className="text-[12px] text-slate-600">Preview</div>
                    <div className="font-display text-[22px] text-slate-900 font-medium">{product.name}</div>
                  </div>
                  <span className="glass rounded-lg px-3 py-2 text-[12px] text-emerald-600 flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5" /> Verified by SpikeBulls
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="py-16">
        <div className="mx-auto max-w-3xl px-5">
          <div className="glass rounded-2xl p-6">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-[12px] text-slate-500">Delivery</div>
                <div className="text-[14.5px] text-slate-900">
                  <p className="mb-2">Pay with Trust Wallet, then after successful payment, we will manually send you the product files and instructions via email within 24 hours!</p>
                  <p className="text-slate-700">Please ensure you use a valid email address that you check regularly. If you don't receive the email within 24 hours, please contact us.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <FinalCTA />
    </main>
  );
}
