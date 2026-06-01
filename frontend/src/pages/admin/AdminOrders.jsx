import React, { useEffect, useState } from "react";
import { Loader2, Search, CheckCircle2, XCircle, Eye, Mail } from "lucide-react";
import { api, BACKEND_URL } from "../../lib/api";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../components/ui/dialog";
import { Textarea } from "../../components/ui/textarea";
import { Label } from "../../components/ui/label";

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState({});
  const [q, setQ] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [openDetails, setOpenDetails] = useState(false);
  const [openEmail, setOpenEmail] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    api.get("/admin/orders").then((r) => setOrders(r.data)).finally(() => setLoading(false));
  }, []);
  
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
  
  const handleActivate = async (orderId) => {
    try {
      setProcessing(prev => ({ ...prev, [orderId]: true }));
      const res = await api.post(`/payments/admin/orders/${orderId}/activate`);
      setOrders(orders.map(o => o.id === orderId ? res.data : o));
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to activate order");
    } finally {
      setProcessing(prev => ({ ...prev, [orderId]: false }));
    }
  };
  
  const handleReject = async (orderId) => {
    if (!window.confirm("Are you sure you want to reject this order?")) return;
    try {
      setProcessing(prev => ({ ...prev, [orderId]: true }));
      const res = await api.post(`/payments/admin/orders/${orderId}/reject`);
      setOrders(orders.map(o => o.id === orderId ? res.data : o));
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to reject order");
    } finally {
      setProcessing(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const handleSendEmail = async () => {
    if (!selectedOrder) return;
    setSendingEmail(true);
    try {
      await api.post("/admin/send-email", {
        to: selectedOrder.user_email,
        subject: emailSubject,
        body: emailBody,
      });
      alert("Email sent successfully!");
      setOpenEmail(false);
      setEmailSubject("");
      setEmailBody("");
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to send email");
    } finally {
      setSendingEmail(false);
    }
  };

  const filtered = orders.filter((o) =>
    !q || 
    o.user_email?.toLowerCase().includes(q.toLowerCase()) || 
    o.id.includes(q) ||
    o.customer_name?.toLowerCase().includes(q.toLowerCase())
  );
  
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-[32px] text-slate-900 font-semibold tracking-tight">Orders</h1>
          <p className="text-slate-600 text-[14px] mt-1">
            {orders.length} total · 
            ${orders.filter((o) => o.status === "paid" || o.status === "active" || o.status === "fulfilled").reduce((s, o) => s + o.total, 0).toFixed(0)} revenue
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search email, order id, or customer name"
            className="pl-9 pr-3 py-2 rounded-lg bg-white border border-slate-200 text-[13px] text-slate-900 focus:outline-none focus:border-blue-400/50" />
        </div>
      </div>

      {loading ? <Loader2 className="h-5 w-5 animate-spin text-slate-500" /> : (
        <div className="glass rounded-2xl overflow-hidden overflow-x-auto">
          <table className="w-full text-[13px] min-w-[1200px]">
            <thead><tr className="text-left text-slate-500 text-[11.5px] uppercase tracking-wider border-b border-slate-200">
              <th className="px-5 py-3">Order</th>
              <th className="px-5 py-3">Customer</th>
              <th className="px-5 py-3">Items</th>
              <th className="px-5 py-3">Total</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">MT5 Acc</th>
              <th className="px-5 py-3">Duration</th>
              <th className="px-5 py-3">Expires</th>
              <th className="px-5 py-3">Actions</th>
              <th className="px-5 py-3">Date</th>
            </tr></thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-5 py-3 text-slate-600 font-mono text-[11.5px]">{o.id.slice(0, 8)}</td>
                  <td className="px-5 py-3">
                    <div className="text-slate-800 font-medium">{o.customer_name || "-"}</div>
                    <div className="text-slate-500 text-[12px]">{o.user_email}</div>
                    {o.customer_phone && <div className="text-slate-500 text-[11px]">{o.customer_phone}</div>}
                  </td>
                  <td className="px-5 py-3 text-slate-700">{o.items.map((i) => i.name).join(", ")}</td>
                  <td className="px-5 py-3 text-slate-900">${o.total.toFixed(2)}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-md text-[11px] ${getStatusColor(o.status)}`}>{o.status}</span>
                    {o.simulated && <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-violet-500/10 text-violet-600">sim</span>}
                  </td>
                  <td className="px-5 py-3 text-slate-700 text-[12px]">{o.mt5_account_number || "-"}</td>
                  <td className="px-5 py-3 text-slate-700 text-[12px]">{o.subscription_duration ? `${o.subscription_duration} days` : "-"}</td>
                  <td className="px-5 py-3 text-slate-600 text-[12px]">{o.subscription_expires_at ? new Date(o.subscription_expires_at).toLocaleDateString() : "-"}</td>
                  <td className="px-5 py-3">
                    <div className="flex gap-2 flex-wrap">
                      {(o.payment_proof_url || o.binance_transaction_id) && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => {
                            setSelectedOrder(o);
                            setOpenDetails(true);
                          }}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" /> View Proof
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => {
                          setSelectedOrder(o);
                          setEmailSubject(`Your Order ${o.id.slice(0, 8)} - SpikeBulls`);
                          setEmailBody(`Hi ${o.customer_name || o.user_email.split('@')[0]},\n\nThank you for your order! We are processing it and will be in touch soon.\n\nBest regards,\nSpikeBulls Team`);
                          setOpenEmail(true);
                        }}
                      >
                        <Mail className="h-3.5 w-3.5 mr-1" /> Send Email
                      </Button>
                      {o.status === "pending" && (
                        <>
                          <button 
                            onClick={() => handleActivate(o.id)} 
                            disabled={processing[o.id]}
                            className="flex items-center gap-1 px-2 py-1 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 rounded-md text-[12px]"
                          >
                            {processing[o.id] ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                            Activate
                          </button>
                          <button 
                            onClick={() => handleReject(o.id)} 
                            disabled={processing[o.id]}
                            className="flex items-center gap-1 px-2 py-1 bg-rose-500/10 text-rose-700 hover:bg-rose-500/20 rounded-md text-[12px]"
                          >
                            {processing[o.id] ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                    {o.binance_transaction_id && (
                      <div className="text-[11px] text-slate-500 mt-1">TX: {o.binance_transaction_id}</div>
                    )}
                  </td>
                  <td className="px-5 py-3 text-slate-600">{new Date(o.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={10} className="px-5 py-10 text-center text-slate-500">No orders found.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Order Details Modal */}
      <Dialog open={openDetails} onOpenChange={setOpenDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>
              View payment information for order {selectedOrder?.id.slice(0, 8)}
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">Customer Email</Label>
                  <p className="text-slate-700">{selectedOrder.user_email}</p>
                </div>
                <div>
                  <Label className="text-sm">Customer Phone</Label>
                  <p className="text-slate-700">{selectedOrder.customer_phone || "-"}</p>
                </div>
              </div>
              {selectedOrder.binance_transaction_id && (
                <div>
                  <Label className="text-sm">Transaction ID</Label>
                  <p className="font-mono text-sm text-slate-700">{selectedOrder.binance_transaction_id}</p>
                </div>
              )}
              {selectedOrder.payment_proof_url && (
                <div>
                  <Label className="text-sm mb-2 block">Payment Proof</Label>
                  <div className="max-h-96 overflow-auto">
                    <img 
                      src={selectedOrder.payment_proof_url.startsWith('http') 
                        ? selectedOrder.payment_proof_url 
                        : `${BACKEND_URL}${selectedOrder.payment_proof_url}`} 
                      alt="Payment proof" 
                      className="w-full rounded-lg border border-slate-200"
                    />
                  </div>
                </div>
              )}
              <div>
                <Label className="text-sm">Order Status</Label>
                <p className="text-slate-700">{selectedOrder.status}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDetails(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Email Modal */}
      <Dialog open={openEmail} onOpenChange={setOpenEmail}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send Email to Customer</DialogTitle>
            <DialogDescription>
              Send a custom email to {selectedOrder?.user_email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="subject">Subject</Label>
              <input
                id="subject"
                className="w-full mt-1 px-3 py-2 rounded-lg bg-white border border-slate-200 text-[14px] text-slate-900 focus:outline-none focus:border-blue-400/50"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="body">Email Body</Label>
              <Textarea
                id="body"
                className="w-full mt-1 min-h-[200px]"
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenEmail(false)}>Cancel</Button>
            <Button onClick={handleSendEmail} disabled={sendingEmail}>
              {sendingEmail ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Sending...</> : "Send Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
