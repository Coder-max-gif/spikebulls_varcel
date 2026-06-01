import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, ArrowRight, Loader2, Copy, Key, Receipt, Upload, Phone, Hash } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function CheckoutSuccessPage() {
  const [params] = useSearchParams();
  const orderId = params.get("order_id");
  const simulated = params.get("simulated") === "1";
  const { isAuthenticated } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState("");
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [phone, setPhone] = useState("");
  const [transactionHash, setTransactionHash] = useState("");
  const [paymentProofFile, setPaymentProofFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

  useEffect(() => {
    if (!orderId || !isAuthenticated) {
      setLoading(false);
      return;
    }
    api
      .get(`/checkout/orders/${orderId}`)
      .then((r) => {
        setData(r.data);
        if (r.data.payment_info) {
          setPaymentInfo(r.data.payment_info);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
      
    const storedPaymentInfo = sessionStorage.getItem("binancePaymentInfo");
    if (storedPaymentInfo) {
      setPaymentInfo(JSON.parse(storedPaymentInfo));
    }
  }, [orderId, isAuthenticated]);

  const copy = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    setTimeout(() => setCopiedKey(""), 1500);
  };

  const handleSubmitPayment = async () => {
    setSubmitting(true);
    try {
      let paymentProofUrl = null;
      if (paymentProofFile) {
        const formData = new FormData();
        formData.append("file", paymentProofFile);
        const uploadRes = await api.post("/payments/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        paymentProofUrl = uploadRes.data.url;
      }

      await api.post("/payments/binance/submit-payment", {
        order_id: orderId,
        payment_proof_url: paymentProofUrl,
        binance_transaction_id: transactionHash,
        customer_phone: phone
      });
      setSubmitted(true);
      setShowSuccessAnimation(true);
      
      setTimeout(() => {
        setShowSuccessAnimation(false);
      }, 3000);
      
      const orderRes = await api.get(`/checkout/orders/${orderId}`);
      setData(orderRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="bg-app min-h-screen">
      <section className="relative pt-32 pb-20 sm:pt-40">
        <div className="absolute inset-0 grid-overlay" />
        <div className="relative mx-auto max-w-2xl px-5 text-center">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="mx-auto h-16 w-16 rounded-full bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7 text-emerald-400" />
            </div>
            <h1 className="mt-6 font-display text-[40px] sm:text-[52px] text-slate-900 font-semibold tracking-tight">Order confirmed!</h1>
            <p className="mt-3 text-slate-600 text-[15.5px]">
              Thanks for your purchase! Complete payment below to get your product within 24 hours.
              {simulated && (
                <span className="block mt-2 text-amber-600 text-[13px]">
                  (Simulated checkout — enable Stripe in backend/.env for live payments.)
                </span>
              )}
            </p>

            {submitted && (
              <div className="mt-6 glass-strong rounded-2xl p-6 text-left border-2 border-emerald-400/30">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-emerald-500 flex-shrink-0" />
                  <div className="text-left">
                    <h3 className="font-display text-[18px] text-slate-900 font-medium">Payment request submitted!</h3>
                    <p className="text-slate-600 text-[14px]">Waiting for admin verification. We'll email you when your order is active!</p>
                  </div>
                </div>
              </div>
            )}

            {/* Success Animation Overlay */}
            <AnimatePresence>
              {showSuccessAnimation && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
                >
                  <div className="glass-strong rounded-3xl p-10 flex flex-col items-center gap-4">
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 200 }}
                      className="h-24 w-24 rounded-full bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center"
                    >
                      <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                    </motion.div>
                    <h2 className="font-display text-2xl font-semibold text-slate-900">Payment Submitted!</h2>
                    <p className="text-slate-600">We'll review your payment shortly.</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {(data?.order?.status === "pending" || paymentInfo) && !submitted && (
              <div className="mt-8 glass-strong rounded-2xl p-6 text-left border-2 border-amber-400/30">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display text-[18px] text-slate-900 font-medium">📱 Pay USDT (TRC20)</h2>
                </div>
                
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  {/* QR Code Section */}
                  <div className="flex flex-col items-center justify-center">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                      {paymentInfo?.binance_qr_image_url ? (
                        <img 
                          src={paymentInfo.binance_qr_image_url} 
                          alt="USDT TRC20 QR Code" 
                          className="h-[200px] w-[200px] object-contain"
                        />
                      ) : paymentInfo?.binance_qr_text || paymentInfo?.binance_address ? (
                        <QRCodeSVG
                          value={paymentInfo.binance_qr_text || paymentInfo.binance_address}
                          size={200}
                          level="H"
                          includeMargin={true}
                        />
                      ) : (
                        <div className="flex items-center justify-center h-[200px] w-[200px] bg-slate-100 rounded-lg border border-slate-200">
                          <span className="text-slate-500 text-[13px]">QR code will appear here</span>
                        </div>
                      )}
                    </div>
                    <p className="mt-3 text-[13px] text-slate-600 text-center">Scan with Trust Wallet or any crypto wallet</p>
                    {paymentInfo?.binance_address && (
                      <div className="mt-2">
                        <p className="text-[11px] text-slate-500 uppercase tracking-wider mb-1">Network</p>
                        <p className="text-[13px] text-slate-700 font-medium">TRC20</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Payment Instructions */}
                  <div className="space-y-4 text-[14px] text-slate-700">
                    <p><strong>1.</strong> Open your Trust Wallet or any crypto wallet</p>
                    <p><strong>2.</strong> Send <span className="font-bold">${data?.order?.total.toFixed(2)}</span> USDT (TRC20) to this address:</p>
                    <div className="bg-slate-100 p-4 rounded-lg font-mono text-[12px] break-all border border-slate-200 flex items-center gap-3">
                      <span className="flex-1">{paymentInfo?.binance_address || "Your USDT TRC20 address will be here"}</span>
                      <button
                        onClick={() => copy(paymentInfo?.binance_address || "")}
                        className="shrink-0 text-blue-600 hover:text-blue-700 text-[12px] font-medium"
                      >
                        {copiedKey === paymentInfo?.binance_address ? "Copied!" : "Copy"}
                      </button>
                    </div>
                    <p><strong>3.</strong> After sending payment, click "Done" below</p>
                    <p><strong>4.</strong> Your request will appear in admin dashboard for manual review</p>
                    <p><strong>5.</strong> Keep your transaction hash ready for verification</p>
                  </div>
                </div>

                {/* Payment Form */}
                <div className="border-t border-slate-200 pt-6">
                  <h3 className="font-display text-[16px] text-slate-900 font-medium mb-4">Submit Payment Details</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-[13px] text-slate-700 font-medium mb-1.5 flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-slate-500" />
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+1 234 567 8900"
                        className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-slate-200 text-[14px] text-slate-900 focus:outline-none focus:border-blue-400/60"
                      />
                    </div>
                    
                    <div>
                      <label className="text-[13px] text-slate-700 font-medium mb-1.5 flex items-center gap-1.5">
                        <Hash className="h-3.5 w-3.5 text-slate-500" />
                        Transaction Hash (recommended)
                      </label>
                      <input
                        type="text"
                        value={transactionHash}
                        onChange={(e) => setTransactionHash(e.target.value)}
                        placeholder="0x..."
                        className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-slate-200 text-[14px] text-slate-900 focus:outline-none focus:border-blue-400/60 font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[13px] text-slate-700 font-medium mb-1.5 flex items-center gap-1.5">
                        <Upload className="h-3.5 w-3.5 text-slate-500" />
                        Payment Screenshot (optional)
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setPaymentProofFile(e.target.files?.[0] || null)}
                          className="text-[13px] text-slate-700 file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                        {paymentProofFile && (
                          <span className="text-[12px] text-emerald-600 font-medium">Selected</span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={handleSubmitPayment}
                      disabled={submitting || !phone.trim() || !transactionHash.trim()}
                      className="btn-primary w-full justify-center"
                    >
                      {submitting ? (
                        <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Submitting...</>
                      ) : (
                        "Done"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-8 glass-strong rounded-2xl p-6 text-left">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-[18px] text-slate-900 font-medium">What happens next?</h2>
                <Key className="h-4 w-4 text-slate-600" />
              </div>
              <div className="space-y-4 text-[14px] text-slate-700">
                <p>1. We will review your order and verify your payment manually.</p>
                <p>2. Within 24 hours, we will send you an email with the product files, installation instructions, and any other relevant information.</p>
                <p>3. Please make sure you check your email inbox (and spam folder, just in case) at the email address you used to sign up!</p>
                <p>4. If you don't receive anything within 24 hours, please contact us via our contact page.</p>
              </div>
            </div>

            <div className="mt-8 glass-strong rounded-2xl p-6 text-left">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-[18px] text-slate-900 font-medium">Your order details</h2>
                <Receipt className="h-4 w-4 text-slate-600" />
              </div>
              {loading ? (
                <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-slate-500" /></div>
              ) : !data ? (
                <p className="text-[13.5px] text-slate-600">Sign in to view your order details.</p>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-700">Order ID:</span>
                    <span className="text-slate-900 font-mono text-[12px]">{data.order.id.slice(0, 8)}...</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-700">Items:</span>
                    <span className="text-slate-900">{data.order.items.map((i) => i.name).join(", ")}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-700">Total:</span>
                    <span className="text-slate-900 font-semibold">${data.order.total.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-700">Status:</span>
                    <span className={`px-2 py-0.5 rounded-md text-[11px] whitespace-nowrap ${
                      data.order.status === "paid" ? "bg-emerald-500/10 text-emerald-600" :
                      data.order.status === "pending" ? "bg-amber-500/10 text-amber-600" :
                      "bg-rose-500/10 text-rose-600"
                    }`}>{data.order.status}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/dashboard" className="btn-primary">Go to dashboard <ArrowRight className="h-4 w-4" /></Link>
              <Link to="/contact" className="btn-ghost">Contact us</Link>
            </div>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
