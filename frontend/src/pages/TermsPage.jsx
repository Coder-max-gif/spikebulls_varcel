import React from "react";
import { motion } from "framer-motion";

export default function TermsPage() {
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
              Terms of <span className="text-gradient-accent">service.</span>
            </h1>
          </motion.div>
        </div>
      </section>

      <section className="pb-20">
        <div className="mx-auto max-w-4xl px-5">
          <div className="glass-strong rounded-2xl p-7 sm:p-9 space-y-8">
            <div>
              <h2 className="font-display text-[20px] font-semibold tracking-tight text-slate-900">1. ACCEPTANCE OF TERMS</h2>
              <p className="mt-3 text-slate-600 text-[14px] leading-relaxed">
                By accessing, browsing, purchasing, downloading, installing, or using any SpikeBulls website, software, MT5 indicators, trading algorithms, Telegram communities, educational materials, or related services, you agree to be bound by these Terms of Service.
              </p>
              <p className="mt-2 text-slate-600 text-[14px] leading-relaxed font-medium text-rose-600">
                If you do not agree with these Terms, you must not use our products or services.
              </p>
            </div>

            <div>
              <h2 className="font-display text-[20px] font-semibold tracking-tight text-slate-900">2. ABOUT SPIKEBULLS</h2>
              <p className="mt-3 text-slate-600 text-[14px] leading-relaxed">
                SpikeBulls provides digital trading-related tools and educational resources, including but not limited to:
              </p>
              <ul className="mt-3 space-y-2 text-slate-600 text-[14px] leading-relaxed list-disc pl-5">
                <li>MT5 Indicators</li>
                <li>Trading Algorithms</li>
                <li>Trading Automation Tools</li>
                <li>License-Based Software</li>
                <li>Educational Content</li>
                <li>Telegram Communities</li>
                <li>Market Analysis Content</li>
              </ul>
              <p className="mt-3 text-slate-600 text-[14px] leading-relaxed">
                All products are digital products only. No physical products are sold or delivered.
              </p>
            </div>

            <div>
              <h2 className="font-display text-[20px] font-semibold tracking-tight text-slate-900">3. ELIGIBILITY</h2>
              <p className="mt-3 text-slate-600 text-[14px] leading-relaxed">
                You must be at least 18 years old and legally capable of entering into binding agreements in your jurisdiction to use our products and services. By using SpikeBulls products, you represent and warrant that you meet these requirements.
              </p>
            </div>

            <div>
              <h2 className="font-display text-[20px] font-semibold tracking-tight text-slate-900">4. NO FINANCIAL ADVICE</h2>
              <p className="mt-3 text-slate-600 text-[14px] leading-relaxed">
                SpikeBulls is not a financial advisor, broker, investment manager, or financial institution. Nothing provided through our website, software, indicators, algorithms, Telegram channels/groups, social media, emails, documentation, or educational materials shall be considered:
              </p>
              <ul className="mt-3 space-y-2 text-slate-600 text-[14px] leading-relaxed list-disc pl-5">
                <li>Financial advice</li>
                <li>Investment advice</li>
                <li>Trading advice</li>
                <li>Portfolio management</li>
                <li>Asset management</li>
                <li>Solicitation to buy or sell securities</li>
              </ul>
              <p className="mt-3 text-slate-600 text-[14px] leading-relaxed">
                All information is provided strictly for educational, informational, and technical purposes. You are solely responsible for all trading decisions and financial outcomes.
              </p>
            </div>

            <div>
              <h2 className="font-display text-[20px] font-semibold tracking-tight text-slate-900">5. RISK DISCLOSURE</h2>
              <p className="mt-3 text-slate-600 text-[14px] leading-relaxed">
                Trading financial markets involves significant risk. You acknowledge and understand that:
              </p>
              <ul className="mt-3 space-y-2 text-slate-600 text-[14px] leading-relaxed list-disc pl-5">
                <li>Trading Forex involves substantial risk.</li>
                <li>Trading leveraged products can result in significant losses.</li>
                <li>You may lose some or all of your invested capital.</li>
                <li>Past performance does not guarantee future results.</li>
                <li>Backtesting results do not guarantee future performance.</li>
                <li>Historical data is not predictive of future outcomes.</li>
              </ul>
              <p className="mt-3 text-slate-600 text-[14px] leading-relaxed">
                You accept full responsibility for any financial losses incurred while using our products or services.
              </p>
            </div>

            <div>
              <h2 className="font-display text-[20px] font-semibold tracking-tight text-slate-900">6. PAYMENTS</h2>
              <p className="mt-3 text-slate-600 text-[14px] leading-relaxed">
                SpikeBulls uses third-party payment providers, including Cryptomus and other payment processors, to process payments. By making a purchase, you agree that:
              </p>
              <ul className="mt-3 space-y-2 text-slate-600 text-[14px] leading-relaxed list-disc pl-5">
                <li>Payments must be completed successfully before access is granted.</li>
                <li>Product delivery is subject to successful payment confirmation.</li>
                <li>Transaction fees charged by payment processors are your responsibility.</li>
                <li>Cryptocurrency transactions are irreversible once confirmed.</li>
                <li>Incorrect wallet addresses, payment amounts, or network selections are solely the customer's responsibility.</li>
              </ul>
              <p className="mt-3 text-slate-600 text-[14px] leading-relaxed">
                SpikeBulls reserves the right to reject or cancel any order if fraudulent, suspicious, or unauthorized activity is detected.
              </p>
            </div>

            <div>
              <h2 className="font-display text-[20px] font-semibold tracking-tight text-slate-900">7. PRODUCT DELIVERY</h2>
              <p className="mt-3 text-slate-600 text-[14px] leading-relaxed">
                After successful payment confirmation:
              </p>
              <ul className="mt-3 space-y-2 text-slate-600 text-[14px] leading-relaxed list-disc pl-5">
                <li>Access credentials may be delivered by email.</li>
                <li>License keys may be delivered manually or automatically.</li>
                <li>Subscription access may be activated on your account.</li>
                <li>Telegram access may be granted where applicable.</li>
              </ul>
              <p className="mt-3 text-slate-600 text-[14px] leading-relaxed">
                Delivery times may vary depending on operational requirements.
              </p>
            </div>

            <div>
              <h2 className="font-display text-[20px] font-semibold tracking-tight text-slate-900">8. SUBSCRIPTIONS</h2>
              <p className="mt-3 text-slate-600 text-[14px] leading-relaxed">
                SpikeBulls offers subscription-based products. Subscription periods may include 1 Month, 6 Months, or 1 Year. Access remains active only during the purchased subscription period and automatically expires unless renewed.
              </p>
            </div>

            <div>
              <h2 className="font-display text-[20px] font-semibold tracking-tight text-slate-900">9. LICENSE GRANT</h2>
              <p className="mt-3 text-slate-600 text-[14px] leading-relaxed">
                Upon successful purchase, SpikeBulls grants you a limited, revocable, non-exclusive, non-transferable license to use the purchased product for personal use only. No ownership rights are transferred.
              </p>
            </div>

            <div>
              <h2 className="font-display text-[20px] font-semibold tracking-tight text-slate-900">10. LICENSE RESTRICTIONS</h2>
              <p className="mt-3 text-slate-600 text-[14px] leading-relaxed">
                You may not share, transfer, resell, rent, or distribute products. You are prohibited from reverse engineering software, modifying software, copying source code, republishing materials, or creating derivative works. Any violation may result in immediate termination of access without notice.
              </p>
            </div>

            <div>
              <h2 className="font-display text-[20px] font-semibold tracking-tight text-slate-900">11. TELEGRAM COMMUNITIES</h2>
              <p className="mt-3 text-slate-600 text-[14px] leading-relaxed">
                SpikeBulls may provide access to Telegram channels, groups, or communities. Participation must remain respectful and professional. Prohibited activities include spam, harassment, hate speech, fraudulent activity, promotion of competing products, sharing confidential materials, or distribution of licenses. SpikeBulls reserves the right to remove any member without notice.
              </p>
            </div>

            <div>
              <h2 className="font-display text-[20px] font-semibold tracking-tight text-slate-900">12. NO PERFORMANCE GUARANTEE</h2>
              <p className="mt-3 text-slate-600 text-[14px] leading-relaxed">
                SpikeBulls does not guarantee profits, trading success, accuracy rates, win rates, future returns, or income generation. Any examples, screenshots, or performance illustrations are for informational purposes only. Actual results will vary.
              </p>
            </div>

            <div>
              <h2 className="font-display text-[20px] font-semibold tracking-tight text-slate-900">13. NO REFUNDS</h2>
              <p className="mt-3 text-slate-600 text-[14px] leading-relaxed">
                Due to the digital nature of our products and services, all sales are final. No refunds, returns, exchanges, or cancellations will be provided once payment has been completed and access has been granted. Customers are responsible for reviewing all product information before purchasing.
              </p>
            </div>

            <div>
              <h2 className="font-display text-[20px] font-semibold tracking-tight text-slate-900">14. CHARGEBACKS AND PAYMENT DISPUTES</h2>
              <p className="mt-3 text-slate-600 text-[14px] leading-relaxed">
                Customers agree not to initiate chargebacks or payment disputes for valid purchases. Any attempt to obtain products through chargebacks or reversals may result in immediate account termination, license deactivation, and potential legal action.
              </p>
            </div>

            <div>
              <h2 className="font-display text-[20px] font-semibold tracking-tight text-slate-900">15. INTELLECTUAL PROPERTY</h2>
              <p className="mt-3 text-slate-600 text-[14px] leading-relaxed">
                All content, including indicators, algorithms, software, source code, graphics, branding, and educational materials, remains the exclusive property of SpikeBulls. Unauthorized use is strictly prohibited.
              </p>
            </div>

            <div>
              <h2 className="font-display text-[20px] font-semibold tracking-tight text-slate-900">16. PRODUCT COMPATIBILITY</h2>
              <p className="mt-3 text-slate-600 text-[14px] leading-relaxed">
                Customers are responsible for ensuring compatibility with MetaTrader 5 (MT5), supported operating systems, and internet requirements. SpikeBulls is not responsible for third-party platform limitations.
              </p>
            </div>

            <div>
              <h2 className="font-display text-[20px] font-semibold tracking-tight text-slate-900">17. LIMITATION OF LIABILITY</h2>
              <p className="mt-3 text-slate-600 text-[14px] leading-relaxed">
                To the maximum extent permitted by law, SpikeBulls shall not be liable for trading losses, financial losses, loss of profits, or any indirect, consequential, or special damages. Use of our products is entirely at your own risk.
              </p>
            </div>

            <div>
              <h2 className="font-display text-[20px] font-semibold tracking-tight text-slate-900">18. DISCLAIMER OF WARRANTIES</h2>
              <p className="mt-3 text-slate-600 text-[14px] leading-relaxed">
                All products and services are provided "AS IS" and "AS AVAILABLE" without warranties of any kind. SpikeBulls does not guarantee continuous availability, error-free operation, or specific performance outcomes.
              </p>
            </div>

            <div>
              <h2 className="font-display text-[20px] font-semibold tracking-tight text-slate-900">19. ACCOUNT SUSPENSION AND TERMINATION</h2>
              <p className="mt-3 text-slate-600 text-[14px] leading-relaxed">
                SpikeBulls reserves the right to suspend or terminate access immediately if these Terms are violated, fraud is suspected, or abuse is detected. Termination may occur without refund.
              </p>
            </div>

            <div>
              <h2 className="font-display text-[20px] font-semibold tracking-tight text-slate-900">20. PRIVACY</h2>
              <p className="mt-3 text-slate-600 text-[14px] leading-relaxed">
                Your use of SpikeBulls products is also governed by our Privacy Policy.
              </p>
            </div>

            <div>
              <h2 className="font-display text-[20px] font-semibold tracking-tight text-slate-900">21. MODIFICATIONS TO TERMS</h2>
              <p className="mt-3 text-slate-600 text-[14px] leading-relaxed">
                SpikeBulls may update these Terms at any time. Updated versions become effective immediately upon publication. Continued use constitutes acceptance of updated Terms.
              </p>
            </div>

            <div>
              <h2 className="font-display text-[20px] font-semibold tracking-tight text-slate-900">22. GOVERNING LAW</h2>
              <p className="mt-3 text-slate-600 text-[14px] leading-relaxed">
                These Terms shall be governed and interpreted under the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts of India.
              </p>
            </div>

            <div>
              <h2 className="font-display text-[20px] font-semibold tracking-tight text-slate-900">23. CONTACT INFORMATION</h2>
              <p className="mt-3 text-slate-600 text-[14px] leading-relaxed">
                For support or legal inquiries: <br />
                Email: <a href="mailto:hello@spikebulls.com" className="text-blue-600 hover:underline">hello@spikebulls.com</a> <br />
                Website: <a href="https://spikebulls.com" className="text-blue-600 hover:underline">https://spikebulls.com</a>
              </p>
              <p className="mt-6 text-slate-900 font-medium text-[14px]">
                By purchasing, downloading, installing, accessing, or using any SpikeBulls product or service, you acknowledge that you have read, understood, and agreed to these Terms of Service.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
