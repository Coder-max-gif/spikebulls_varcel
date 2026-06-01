import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, Loader2, X, Check, Upload } from "lucide-react";
import { api } from "../../lib/api";

const BLANK = {
  name: "",
  slug: "",
  category: "indicator",
  short_description: "",
  description: "",
  price: 99,
  compare_at_price: null,
  features: [],
  platforms: [],
  images: [],
  delivery_type: "license",
  file_path: null,
  max_downloads: 5,
  license_duration_days: null,
  status: "active",
  highlight: false,
  badge: "",
  accent: "blue",
};

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // product or null

  const load = async () => {
    setLoading(true);
    const res = await api.get("/admin/products");
    setProducts(res.data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const onDelete = async (id) => {
    if (!window.confirm("Delete this product?")) return;
    await api.delete(`/admin/products/${id}`);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[32px] text-slate-900 font-semibold tracking-tight">Products</h1>
          <p className="text-slate-600 text-[14px] mt-1">Manage your catalog. Changes are live immediately.</p>
        </div>
        <button onClick={() => setEditing({ ...BLANK })} className="btn-primary !py-2.5">
          <Plus className="h-4 w-4" /> New product
        </button>
      </div>

      {loading ? <Loader2 className="h-5 w-5 animate-spin text-slate-500" /> : (
        <div className="glass rounded-2xl overflow-hidden">
          <table className="w-full text-[13.5px]">
            <thead>
              <tr className="text-left text-slate-500 text-[11.5px] uppercase tracking-wider border-b border-slate-200">
                <th className="px-5 py-3">Product</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Price</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-5 py-3">
                    <div className="text-slate-900">{p.name}</div>
                    <div className="text-[11.5px] text-slate-500">{p.slug}</div>
                  </td>
                  <td className="px-5 py-3 text-slate-700">{p.category}</td>
                  <td className="px-5 py-3 text-slate-900">${p.price.toFixed(0)}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-md text-[11px] ${p.status === "active" ? "bg-emerald-500/10 text-emerald-600" : "bg-zinc-500/15 text-slate-700"}`}>{p.status}</span>
                    {p.highlight && <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-blue-500/10 text-blue-600">highlight</span>}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => setEditing(p)} className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[12px] text-slate-700 hover:text-slate-900 hover:bg-slate-100">
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </button>
                    <button onClick={() => onDelete(p.id)} className="ml-1 inline-flex items-center gap-1 px-2 py-1 rounded-md text-[12px] text-rose-600 hover:bg-rose-500/10">
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AnimatePresence>
        {editing && (
          <ProductDrawer
            initial={editing}
            onClose={() => setEditing(null)}
            onSaved={() => { setEditing(null); load(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ProductDrawer({ initial, onClose, onSaved }) {
  const [form, setForm] = useState(() => ({
    ...initial,
    features_text: (initial.features || []).join("\n"),
    platforms_text: (initial.platforms || []).join(", "),
    images_text: (initial.images || []).join("\n"),
  }));
  const [saving, setSaving] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-");

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        features: form.features_text.split("\n").map((s) => s.trim()).filter(Boolean),
        platforms: form.platforms_text.split(",").map((s) => s.trim()).filter(Boolean),
        images: form.images_text.split("\n").map((s) => s.trim()).filter(Boolean),
        price: parseFloat(form.price) || 0,
        compare_at_price: form.compare_at_price ? parseFloat(form.compare_at_price) : null,
        license_duration_days: form.license_duration_days ? parseInt(form.license_duration_days, 10) : null,
        max_downloads: form.max_downloads ? parseInt(form.max_downloads, 10) : null,
        file_path: form.file_path || null,
      };
      delete payload.features_text;
      delete payload.platforms_text;
      delete payload.images_text;
      if (!payload.slug) payload.slug = slugify(payload.name);
      if (!payload.badge) payload.badge = null;

      if (initial.id) {
        delete payload.created_at;
        delete payload.updated_at;
        delete payload.id;
        await api.patch(`/admin/products/${initial.id}`, payload);
      } else {
        await api.post("/admin/products", payload);
      }
      onSaved();
    } catch (err) {
      alert(err.response?.data?.detail || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleUploadFile = async (e) => {
    if (!e.target.files || !e.target.files[0] || !initial.id) return;
    const file = e.target.files[0];
    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "download");
      const res = await api.post(`/admin/products/${initial.id}/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setForm(prev => ({ ...prev, file_path: res.data.file_path }));
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to upload file");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleUploadImage = async (e) => {
    if (!e.target.files || !e.target.files[0] || !initial.id) return;
    const file = e.target.files[0];
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "image");
      const res = await api.post(`/admin/products/${initial.id}/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      const newImages = [...form.images, res.data.file_path];
      setForm(prev => ({ 
        ...prev, 
        images: newImages, 
        images_text: newImages.join("\n") 
      }));
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <motion.div
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "tween", duration: 0.25 }}
        className="relative w-full sm:w-[560px] bg-white border-l border-slate-200 overflow-y-auto"
      >
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="font-display text-[20px] text-slate-900">{initial.id ? "Edit product" : "New product"}</h2>
          <button onClick={onClose} className="h-8 w-8 rounded-md glass flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <Row><L label="Name"><Input v={form.name} on={(v) => set("name", v)} required /></L></Row>
          <Row><L label="Slug (URL)"><Input v={form.slug} on={(v) => set("slug", v)} placeholder="auto-generated if empty" /></L></Row>
          <div className="grid grid-cols-2 gap-3">
            <L label="Category"><Select v={form.category} on={(v) => set("category", v)} options={[
              { v: "indicator", l: "Indicator" }, { v: "algo", l: "Algo" }, { v: "signals", l: "Signals" }, { v: "automation", l: "Automation" }
            ]} /></L>
            <L label="Accent"><Select v={form.accent} on={(v) => set("accent", v)} options={[
              { v: "blue", l: "Blue" }, { v: "violet", l: "Violet" }, { v: "gradient", l: "Gradient" }
            ]} /></L>
          </div>
          <Row><L label="Short description"><Input v={form.short_description} on={(v) => set("short_description", v)} required /></L></Row>
          <Row><L label="Full description"><Textarea v={form.description} on={(v) => set("description", v)} rows={4} required /></L></Row>
          <div className="grid grid-cols-2 gap-3">
            <L label="Price (USD)"><Input type="number" v={form.price} on={(v) => set("price", v)} required /></L>
            <L label="Compare-at price"><Input type="number" v={form.compare_at_price || ""} on={(v) => set("compare_at_price", v)} /></L>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <L label="Delivery type"><Select v={form.delivery_type} on={(v) => set("delivery_type", v)} options={[
              { v: "license", l: "License" }, { v: "download", l: "Download" }, { v: "membership", l: "Membership" }
            ]} /></L>
            <L label="License days (blank = lifetime)"><Input type="number" v={form.license_duration_days || ""} on={(v) => set("license_duration_days", v)} /></L>
          </div>
          {form.delivery_type === "download" && (
            <div className="space-y-4">
            <div>
              <Label htmlFor="product-file">Product File (Download) — Supported: .zip, .ex5, .mq5, .ex4, .mq4, .bin, .pdf, .txt, .json</Label>
              <div className="flex gap-2 items-center mt-1">
                <input
                  id="product-file"
                  type="file"
                  accept=".zip,.ex5,.mq5,.ex4,.mq4,.bin,.pdf,.txt,.json"
                  disabled={!initial.id || uploadingFile}
                  onChange={handleUploadFile}
                  className="text-[13px] text-slate-700 file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {uploadingFile && <Loader2 className="h-4 w-4 animate-spin text-slate-500" />}
              </div>
              {form.file_path && (
                <p className="mt-1 text-[12px] text-slate-600">Current file: {form.file_path}</p>
              )}
            </div>
            <L label="Max downloads"><Input type="number" v={form.max_downloads} on={(v) => set("max_downloads", v)} /></L>
          </div>
          )}
          <div>
            <Label htmlFor="product-image">Product Images</Label>
            <div className="flex gap-2 items-center mt-1">
              <input
                id="product-image"
                type="file"
                accept="image/*"
                disabled={!initial.id || uploadingImage}
                onChange={handleUploadImage}
                className="text-[13px] text-slate-700 file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {uploadingImage && <Loader2 className="h-4 w-4 animate-spin text-slate-500" />}
            </div>
          </div>
          <Row><L label="Features (one per line)"><Textarea v={form.features_text} on={(v) => set("features_text", v)} rows={5} /></L></Row>
          <Row><L label="Platforms (comma-separated)"><Input v={form.platforms_text} on={(v) => set("platforms_text", v)} placeholder="MetaTrader 5, VPS" /></L></Row>
          <Row><L label="Image URLs (one per line)"><Textarea v={form.images_text} on={(v) => set("images_text", v)} rows={3} placeholder="https://..." /></L></Row>
          <div className="grid grid-cols-2 gap-3">
            <L label="Status"><Select v={form.status} on={(v) => set("status", v)} options={[
              { v: "active", l: "Active" }, { v: "draft", l: "Draft" }, { v: "archived", l: "Archived" }
            ]} /></L>
            <L label="Badge (optional)"><Input v={form.badge || ""} on={(v) => set("badge", v)} placeholder="Most Popular" /></L>
          </div>
          <label className="flex items-center gap-2 text-[13px] text-slate-700">
            <input type="checkbox" checked={!!form.highlight} onChange={(e) => set("highlight", e.target.checked)} />
            Highlight on landing page
          </label>

          <div className="sticky bottom-0 -mx-6 mt-6 px-6 py-4 bg-white border-t border-slate-200 flex gap-2">
            <button disabled={saving} className="btn-primary flex-1">
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> <span className="ml-2">Saving...</span></> : <><Check className="h-4 w-4" /> <span className="ml-2">Save</span></>}
            </button>
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function Row({ children }) { return <div>{children}</div>; }
function L({ label, children }) { return <label className="block"><span className="text-[12px] text-slate-600">{label}</span><div className="mt-2">{children}</div></label>; }
function Input({ v, on, type = "text", ...rest }) { return <input type={type} value={v ?? ""} onChange={(e) => on(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-[13.5px] text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-blue-400/50" {...rest} />; }
function Textarea({ v, on, rows, ...rest }) { return <textarea value={v} onChange={(e) => on(e.target.value)} rows={rows} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-[13.5px] text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-blue-400/50 resize-none" {...rest} />; }
function Select({ v, on, options }) { return <select value={v} onChange={(e) => on(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-[13.5px] text-slate-900 focus:outline-none focus:border-blue-400/50">{options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}</select>; }
function Label({ children, ...rest }) { return <label className="text-[12px] text-slate-600 block" {...rest}>{children}</label>; }
