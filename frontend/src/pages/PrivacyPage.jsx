import React from "react";
import { motion } from "framer-motion";

export default function PrivacyPage() {
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
              Privacy <span className="text-gradient-accent">policy.</span>
            </h1>
          </motion.div>
        </div>
      </section>

      <section className="pb-20">
        <div className="mx-auto max-w-4xl px-5">
          <div className="glass-strong rounded-2xl p-7 sm:p-9 space-y-8">
            <div>
              <h2 className="font-display text-[20px] font-semibold tracking-tight text-slate-900">1. Information Collection</h2>
              <p className="mt-3 text-slate-600 text-[14px] leading-relaxed">
                We collect information that you provide directly to us when you create an account, make a purchase, or communicate with us. This may include your name, email address, payment details (processed securely via third-party providers), and any other information you choose to provide.
              </p>
            </div>

            <div>
              <h2 className="font-display text-[20px] font-semibold tracking-tight text-slate-900">2. Use of Information</h2>
              <p className="mt-3 text-slate-600 text-[14px] leading-relaxed">
                We use the information we collect to:
              </p>
              <ul className="mt-3 space-y-2 text-slate-600 text-[14px] leading-relaxed list-disc pl-5">
                <li>Process your transactions and deliver products.</li>
                <li>Verify payments and activate software licenses.</li>
                <li>Send technical notices, updates, and support messages.</li>
                <li>Respond to your comments, questions, and requests.</li>
                <li>Maintain the security of our Telegram communities.</li>
              </ul>
            </div>

            <div>
              <h2 className="font-display text-[20px] font-semibold tracking-tight text-slate-900">3. Data Security</h2>
              <p className="mt-3 text-slate-600 text-[14px] leading-relaxed">
                We take reasonable measures to help protect information about you from loss, theft, misuse, unauthorized access, disclosure, alteration, and destruction. We use industry-standard encryption and security protocols for data transmission and storage.
              </p>
            </div>

            <div>
              <h2 className="font-display text-[20px] font-semibold tracking-tight text-slate-900">4. Third-Party Services</h2>
              <p className="mt-3 text-slate-600 text-[14px] leading-relaxed">
                We use third-party services to process payments (such as Cryptomus) and manage our communities (Telegram). These services have their own privacy policies, and we recommend you review them. We do not store sensitive payment card or wallet information on our servers.
              </p>
            </div>

            <div>
              <h2 className="font-display text-[20px] font-semibold tracking-tight text-slate-900">5. Data Retention</h2>
              <p className="mt-3 text-slate-600 text-[14px] leading-relaxed">
                We retain your information for as long as necessary to provide our services, comply with legal obligations, resolve disputes, and enforce our agreements.
              </p>
            </div>

            <div>
              <h2 className="font-display text-[20px] font-semibold tracking-tight text-slate-900">6. Your Rights</h2>
              <p className="mt-3 text-slate-600 text-[14px] leading-relaxed">
                You may update or correct your account information at any time by logging into your account or contacting us. You also have the right to request the deletion of your personal data, subject to certain legal exceptions.
              </p>
            </div>

            <div>
              <h2 className="font-display text-[20px] font-semibold tracking-tight text-slate-900">7. Contact Us</h2>
              <p className="mt-3 text-slate-600 text-[14px] leading-relaxed">
                If you have any questions about this Privacy Policy, please contact us at <a href="mailto:hello@spikebulls.com" className="text-blue-600 hover:underline">hello@spikebulls.com</a>.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
