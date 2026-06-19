import React from "react";
import { motion } from "framer-motion";

export default function RiskDisclosurePage() {
  return (
    <main className="bg-app">
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 overflow-hidden">
        <div className="absolute inset-0 grid-overlay" />
        <div className="relative mx-auto max-w-4xl px-5">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex glass rounded-full px-3 py-1 text-[11.5px] uppercase tracking-[0.18em] text-slate-700">
              Legal
            </div>
            <h1 className="mt-5 font-display text-[44px] sm:text-[56px] font-semibold tracking-tight leading-[1.05] text-slate-900">
              Risk <span className="text-gradient-accent">disclosure.</span>
            </h1>
          </motion.div>
        </div>
      </section>

      <section className="pb-20">
        <div className="mx-auto max-w-4xl px-5">
          <div className="glass-strong rounded-2xl p-7 sm:p-9 border-2 border-rose-200">
            <div className="rounded-lg bg-rose-500/10 border border-rose-500/30 px-4 py-3 mb-8">
              <p className="text-[14px] text-rose-700 font-bold uppercase tracking-wider text-center">
                High-Risk Investment Warning
              </p>
            </div>
            
            <div className="space-y-8">
              <div>
                <h2 className="font-display text-[20px] font-semibold tracking-tight text-slate-900">1. Nature of Trading Risk</h2>
                <p className="mt-3 text-slate-600 text-[14px] leading-relaxed">
                  Trading financial markets, including Forex, Commodities, and Indices, involves a high level of risk and may not be suitable for all investors. The high degree of leverage available can work against you as well as for you. Before deciding to trade, you should carefully consider your investment objectives, level of experience, and risk appetite.
                </p>
              </div>

              <div>
                <h2 className="font-display text-[20px] font-semibold tracking-tight text-slate-900">2. Potential for Total Loss</h2>
                <p className="mt-3 text-slate-600 text-[14px] leading-relaxed font-medium">
                  The possibility exists that you could sustain a loss of some or all of your initial investment.
                </p>
                <p className="mt-2 text-slate-600 text-[14px] leading-relaxed">
                  Therefore, you should not invest money that you cannot afford to lose. You should be aware of all the risks associated with foreign exchange trading and seek advice from an independent financial advisor if you have any doubts.
                </p>
              </div>

              <div>
                <h2 className="font-display text-[20px] font-semibold tracking-tight text-slate-900">3. Past Performance</h2>
                <p className="mt-3 text-slate-600 text-[14px] leading-relaxed">
                  Any past performance, simulation, or backtesting results displayed on SpikeBulls or within our communities are not indicative of future results. No representation is being made that any account will or is likely to achieve profits or losses similar to those shown.
                </p>
              </div>

              <div>
                <h2 className="font-display text-[20px] font-semibold tracking-tight text-slate-900">4. Software and Technical Risks</h2>
                <p className="mt-3 text-slate-600 text-[14px] leading-relaxed">
                  Using trading indicators and automated algorithms involves technical risks, including but not limited to:
                </p>
                <ul className="mt-3 space-y-2 text-slate-600 text-[14px] leading-relaxed list-disc pl-5">
                  <li>Internet connectivity failures</li>
                  <li>Software glitches or bugs</li>
                  <li>Platform (MetaTrader 5) updates or outages</li>
                  <li>Latency in signal delivery or trade execution</li>
                  <li>Data feed inaccuracies from brokers</li>
                </ul>
              </div>

              <div>
                <h2 className="font-display text-[20px] font-semibold tracking-tight text-slate-900">5. No Financial Advice</h2>
                <p className="mt-3 text-slate-600 text-[14px] leading-relaxed">
                  SpikeBulls provides educational and technical tools only. We are not financial advisors and do not provide personalized investment advice. All trading decisions are made solely by you, and you accept full responsibility for the outcomes of those decisions.
                </p>
              </div>

              <div className="pt-6 border-t border-rose-100">
                <p className="text-slate-900 font-semibold text-[14px] leading-relaxed text-center">
                  By using SpikeBulls products, you acknowledge that you fully understand the risks involved in trading and agree to hold SpikeBulls harmless for any financial losses you may incur.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
