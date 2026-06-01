import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, ArrowRight, LineChart, Bot, Radio, Settings2 } from "lucide-react";
import { useProducts } from "../lib/queries";

const ICONS = { indicator: LineChart, algo: Bot, signals: Radio, automation: Settings2 };

export default function PricingPage() {
  const { products, loading } = useProducts();
  const navigate = useNavigate();

  return (
    <main className="bg-app min-h-screen">
      <section className="relative pt-32 pb-12 sm:pt-40 overflow-hidden">
        <div className="absolute inset-0 grid-overlay" />
        <div className="relative mx-auto max-w-7xl px-5">
          <div className="max-w-2xl">
            <div className="inline-flex glass rounded-full px-3 py-1 text-[11.5px] uppercase tracking-[0.18em] text-slate-700">Pricing</div>
            <h1 className="mt-5 font-display text-[44px] sm:text-[56px] font-semibold tracking-tight leading-[1.04] text-slate-900">
              Choose your <span className="text-gradient-accent">tools</span>
            </h1>
            <p className="mt-4 text-slate-600 text-[16px] leading-relaxed">
              Pick the perfect product for your trading style. One-time payments or monthly subscriptions — your call.
            </p>
          </div>
        </div>
      </section>

      <section className="py-12 pb-24">
        <div className="mx-auto max-w-7xl px-5">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="h-8 w-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
            </div>
          ) : products.length === 0 ? (
            <div className="glass rounded-2xl p-10 text-center text-slate-600">No products available yet.</div>
          ) : (
            <div className="space-y-8">
              {products.map((p, i) => {
                const Icon = ICONS[p.category] || LineChart;
                const isViolet = p.accent === "violet" || p.accent === "gradient";
                
                return (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{ duration: 0.5, delay: i * 0.08 }}
                    className="glass rounded-2xl border border-slate-200 overflow-hidden flex flex-col lg:flex-row"
                  >
                    {/* Left side: Product info */}
                    <div className="p-8 lg:w-1/2 flex flex-col">
                      <div className="flex items-center gap-4">
                        <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                          isViolet ? "bg-violet-500/15 border border-violet-400/30 text-violet-600" : "bg-blue-500/15 border border-blue-400/30 text-blue-600"
                        }`}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="font-display text-[22px] text-slate-900 font-semibold">{p.name}</h3>
                          {p.badge && (
                            <span className="text-[10.5px] uppercase tracking-wider px-2 py-0.5 rounded-md bg-gradient-to-r from-blue-500/20 to-violet-500/20 text-blue-700 border border-slate-200">
                              {p.badge}
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="mt-4 text-[15px] text-slate-600">{p.short_description}</p>

                      <ul className="mt-6 space-y-2">
                        {(p.features || []).map((f, j) => (
                          <li key={j} className="flex items-start gap-2 text-[13.5px] text-slate-700">
                            <Check className={`h-4 w-4 mt-0.5 shrink-0 ${isViolet ? "text-violet-500" : "text-blue-500"}`} />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>

                      <div className="mt-6 flex-1" />

                      <div className="flex items-center gap-4">
                        <Link
                          to={`/products/${p.slug}`}
                          className="text-[13.5px] text-slate-600 hover:text-slate-900 font-medium transition-colors"
                        >
                          Learn more →
                        </Link>
                      </div>
                    </div>

                    {/* Right side: Pricing & CTA */}
                    <div className={`p-8 lg:w-1/2 flex flex-col justify-center border-t lg:border-t-0 lg:border-l border-slate-200 ${
                      isViolet ? "bg-gradient-to-br from-violet-500/5 to-blue-500/5" : "bg-slate-50/50"
                    }`}>
                      <div className="mb-6">
                        <div className="flex items-baseline gap-2">
                          <span className="font-display text-[44px] font-semibold text-slate-900">${p.price.toFixed(0)}</span>
                          {p.compare_at_price && p.compare_at_price > p.price && (
                            <span className="text-[16px] text-slate-500 line-through">${p.compare_at_price.toFixed(0)}</span>
                          )}
                        </div>
                        <p className="text-[13px] text-slate-500 mt-1">
                          {p.delivery_type === "membership" ? "Per month" : "One-time payment — lifetime access"}
                        </p>
                        {p.compare_at_price && p.compare_at_price > p.price && (
                          <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 text-[12px] font-medium">
                            <Check className="h-3.5 w-3.5" />
                            Save ${(p.compare_at_price - p.price).toFixed(0)}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => navigate(`/products/${p.slug}`)}
                        className={`w-full ${isViolet ? "btn-primary" : "btn-secondary"} !py-3`}
                      >
                        Get {p.name} <ArrowRight className="h-4 w-4 ml-1" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
