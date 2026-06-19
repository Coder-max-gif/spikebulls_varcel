import React from "react";
import { motion } from "framer-motion";

export default function RefundPolicyPage() {
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
              Refund <span className="text-gradient-accent">policy.</span>
            </h1>
          </motion.div>
        </div>
      </section>

      <section className="pb-20">
        <div className="mx-auto max-w-4xl px-5">
          <div className="glass-strong rounded-2xl p-7 sm:p-9 space-y-8">
            <div className="rounded-lg bg-rose-500/10 border border-rose-500/30 px-4 py-3 mb-6">
              <p className="text-[14px] text-rose-700 font-medium uppercase tracking-wider">
                Strict No Refund Policy
              </p>
            </div>

            <div>
              <h2 className="font-display text-[20px] font-semibold tracking-tight text-slate-900">1. All Sales Are Final</h2>
              <p className="mt-3 text-slate-600 text-[14px] leading-relaxed">
                Due to the digital nature of our products and services, all sales are final. Once a purchase is completed, no refunds, returns, or exchanges will be issued.
              </p>
            </div>

            <div>
              <h2 className="font-display text-[20px] font-semibold tracking-tight text-slate-900">2. Digital Products</h2>
              <p className="mt-3 text-slate-600 text-[14px] leading-relaxed">
                Our MT5 indicators, trading algorithms, and software are digital products that are delivered or activated immediately upon payment verification. Because these products cannot be "returned," they are non-refundable.
              </p>
            </div>

            <div>
              <h2 className="font-display text-[20px] font-semibold tracking-tight text-slate-900">3. Subscription Fees</h2>
              <p className="mt-3 text-slate-600 text-[14px] leading-relaxed">
                All subscription fees (1 Month, 6 Months, or 1 Year plans) are non-refundable. If you choose to cancel your subscription, you will continue to have access until the end of your current billing period, but no partial refunds will be provided.
              </p>
            </div>

            <div>
              <h2 className="font-display text-[20px] font-semibold tracking-tight text-slate-900">4. Crypto Payments</h2>
              <p className="mt-3 text-slate-600 text-[14px] leading-relaxed">
                Payments made via cryptocurrency (processed through Cryptomus or other manual methods) are non-refundable. Cryptocurrency transactions are irreversible by design, and we do not provide refunds for any crypto-based purchases.
              </p>
            </div>

            <div>
              <h2 className="font-display text-[20px] font-semibold tracking-tight text-slate-900">5. Legal Exceptions</h2>
              <p className="mt-3 text-slate-600 text-[14px] leading-relaxed">
                Exceptions to this no-refund policy apply only where required by applicable law in your jurisdiction.
              </p>
            </div>

            <div className="pt-6 border-t border-slate-200">
              <p className="text-slate-600 text-[14px] leading-relaxed italic">
                By making a purchase on SpikeBulls, you acknowledge that you have read, understood, and agreed to this No Refund Policy.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
