import React, { useEffect, useState } from "react";
import { Loader2, Key, ShieldOff, RotateCw, Copy, CheckCircle2, Plus, X, Upload, File } from "lucide-react";
import { api } from "../../lib/api";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../components/ui/dialog";
import { Label } from "../../components/ui/label";

export default function AdminLicenses() {
  const [items, setItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState("");
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(null);

  const load = async () => {
    setLoading(true);
    const [licensesRes, usersRes, productsRes] = await Promise.all([
      api.get("/admin/licenses"),
      api.get("/admin/users"),
      api.get("/admin/products"),
    ]);
    setItems(licensesRes.data);
    setUsers(usersRes.data);
    setProducts(productsRes.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const revoke = async (id) => {
    if (!window.confirm("Revoke this license? The user will lose access.")) return;
    await api.post(`/admin/licenses/${id}/revoke`);
    load();
  };
  const regen = async (id) => {
    await api.post(`/admin/licenses/${id}/regenerate`);
    load();
  };
  const copy = (k) => { navigator.clipboard.writeText(k); setCopied(k); setTimeout(() => setCopied(""), 1500); };
  
  const handleFileUpload = async (e, licenseId) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    setUploading(licenseId);
    try {
      const formData = new FormData();
      formData.append("file", file);
      await api.post(`/admin/licenses/${licenseId}/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      load();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to upload file");
    } finally {
      setUploading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-[32px] text-slate-900 font-semibold tracking-tight">Licenses</h1>
          <p className="text-slate-600 text-[14px] mt-1">{items.length} licenses issued</p>
        </div>
        <button onClick={() => setOpen(true)} className="btn-primary !py-2.5">
          <Plus className="h-4 w-4" /> New License
        </button>
      </div>
      {loading ? <Loader2 className="h-5 w-5 animate-spin text-slate-500" /> : (
        <div className="glass rounded-2xl overflow-hidden overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead><tr className="text-left text-slate-500 text-[11.5px] uppercase tracking-wider border-b border-slate-200">
              <th className="px-5 py-3">Key</th><th className="px-5 py-3">Product</th><th className="px-5 py-3">User</th><th className="px-5 py-3">File</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Expires</th><th className="px-5 py-3 text-right">Actions</th>
            </tr></thead>
            <tbody>
              {items.map((l) => (
                <tr key={l.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <Key className="h-3.5 w-3.5 text-blue-600" />
                      <code className="text-[12px] text-blue-700">{l.key}</code>
                      <button onClick={() => copy(l.key)} className="h-6 w-6 rounded-md hover:bg-slate-100 flex items-center justify-center">
                        {copied === l.key ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3 text-slate-500" />}
                      </button>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-slate-800">{l.product_name}</td>
                  <td className="px-5 py-3 text-slate-700">{l.user_email}</td>
                  <td className="px-5 py-3">
                    {l.file_path ? (
                      <div className="flex items-center gap-2 text-slate-700 text-[12px]">
                        <File className="h-3.5 w-3.5" />
                        <span className="truncate max-w-[150px]">{l.file_path}</span>
                      </div>
                    ) : (
                      <span className="text-slate-500 text-[12px]">No file</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-md text-[11px] ${l.status === "active" ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"}`}>{l.status}</span>
                  </td>
                  <td className="px-5 py-3 text-slate-600">{l.expires_at ? new Date(l.expires_at).toLocaleDateString() : "Lifetime"}</td>
                  <td className="px-5 py-3 text-right">
                    <label className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[12px] text-slate-700 hover:bg-slate-100 cursor-pointer mr-1">
                      <Upload className="h-3.5 w-3.5" />
                      {uploading === l.id ? "Uploading..." : "Upload"}
                      <input 
                        type="file"
                        accept=".zip,.ex5,.mq5,.ex4,.mq4,.bin,.pdf,.txt,.json"
                        disabled={uploading === l.id}
                        onChange={(e) => handleFileUpload(e, l.id)}
                        className="hidden"
                      />
                    </label>
                    {l.status === "active" && (
                      <button onClick={() => revoke(l.id)} className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[12px] text-rose-600 hover:bg-rose-500/10">
                        <ShieldOff className="h-3.5 w-3.5" /> Revoke
                      </button>
                    )}
                    <button onClick={() => regen(l.id)} className="ml-1 inline-flex items-center gap-1 px-2 py-1 rounded-md text-[12px] text-slate-700 hover:text-slate-900 hover:bg-slate-100">
                      <RotateCw className="h-3.5 w-3.5" /> Regenerate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateLicenseDialog 
        open={open} 
        onClose={() => setOpen(false)} 
        users={users} 
        products={products}
        onCreated={() => { setOpen(false); load(); }}
      />
    </div>
  );
}

function CreateLicenseDialog({ open, onClose, users, products, onCreated }) {
  const [form, setForm] = useState({
    key: "",
    user_id: "",
    user_email: "",
    product_id: "",
    product_name: "",
    order_id: "",
    status: "active",
    expires_at: "",
    max_activations: 2,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/admin/licenses", {
        ...form,
        key: form.key || null,
        order_id: form.order_id || null,
        expires_at: form.expires_at || null,
      });
      onCreated();
      setForm({
        key: "",
        user_id: "",
        user_email: "",
        product_id: "",
        product_name: "",
        order_id: "",
        status: "active",
        expires_at: "",
        max_activations: 2,
      });
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to create license");
    } finally {
      setSaving(false);
    }
  };

  const handleUserSelect = (userId) => {
    const user = users.find(u => u.id === userId);
    setForm(prev => ({ ...prev, user_id: userId, user_email: user?.email || "" }));
  };

  const handleProductSelect = (productId) => {
    const product = products.find(p => p.id === productId);
    setForm(prev => ({ ...prev, product_id: productId, product_name: product?.name || "" }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New License</DialogTitle>
          <DialogDescription>
            Manually create a license for a user.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div>
            <Label>User</Label>
            <select
              value={form.user_id}
              onChange={(e) => handleUserSelect(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-lg bg-white border border-slate-200 text-[13.5px] text-slate-900 focus:outline-none focus:border-blue-400/50"
              required
            >
              <option value="">Select a user...</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.email}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Product</Label>
            <select
              value={form.product_id}
              onChange={(e) => handleProductSelect(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-lg bg-white border border-slate-200 text-[13.5px] text-slate-900 focus:outline-none focus:border-blue-400/50"
              required
            >
              <option value="">Select a product...</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Custom License Key (optional - leave blank to auto-generate)</Label>
            <input
              type="text"
              value={form.key}
              onChange={(e) => setForm(prev => ({ ...prev, key: e.target.value }))}
              className="w-full mt-1 px-3 py-2 rounded-lg bg-white border border-slate-200 text-[13.5px] text-slate-900 focus:outline-none focus:border-blue-400/50"
              placeholder="Leave empty to auto-generate"
            />
          </div>
          <div>
            <Label>Order ID (optional)</Label>
            <input
              type="text"
              value={form.order_id}
              onChange={(e) => setForm(prev => ({ ...prev, order_id: e.target.value }))}
              className="w-full mt-1 px-3 py-2 rounded-lg bg-white border border-slate-200 text-[13.5px] text-slate-900 focus:outline-none focus:border-blue-400/50"
              placeholder="Order ID (if applicable)"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Status</Label>
              <select
                value={form.status}
                onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value }))}
                className="w-full mt-1 px-3 py-2 rounded-lg bg-white border border-slate-200 text-[13.5px] text-slate-900 focus:outline-none focus:border-blue-400/50"
              >
                <option value="active">Active</option>
                <option value="revoked">Revoked</option>
              </select>
            </div>
            <div>
              <Label>Max Activations</Label>
              <input
                type="number"
                value={form.max_activations}
                onChange={(e) => setForm(prev => ({ ...prev, max_activations: parseInt(e.target.value) || 2 }))}
                className="w-full mt-1 px-3 py-2 rounded-lg bg-white border border-slate-200 text-[13.5px] text-slate-900 focus:outline-none focus:border-blue-400/50"
              />
            </div>
          </div>
          <div>
            <Label>Expiration Date (optional - leave blank for lifetime)</Label>
            <input
              type="datetime-local"
              value={form.expires_at}
              onChange={(e) => setForm(prev => ({ ...prev, expires_at: e.target.value }))}
              className="w-full mt-1 px-3 py-2 rounded-lg bg-white border border-slate-200 text-[13.5px] text-slate-900 focus:outline-none focus:border-blue-400/50"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Creating...</> : "Create License"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
