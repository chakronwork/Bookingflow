"use client";

import { FormEvent, useEffect, useState } from "react";

interface ServiceItem {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: string;
  category: string | null;
  isActive: boolean;
}

interface ServiceForm {
  name: string;
  durationMinutes: string;
  price: string;
  category: string;
  description: string;
}

const emptyForm: ServiceForm = { name: "", durationMinutes: "30", price: "", category: "", description: "" };

export default function ServiceManager() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [form, setForm] = useState<ServiceForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadServices() {
    setLoading(true);
    try {
      const response = await fetch("/api/dashboard/services", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "โหลดบริการไม่สำเร็จ");
      setServices(data.services);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "โหลดบริการไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void Promise.resolve().then(loadServices);
  }, []);

  function startEdit(service: ServiceItem) {
    setEditingId(service.id);
    setForm({ name: service.name, durationMinutes: String(service.durationMinutes), price: service.price, category: service.category || "", description: service.description || "" });
    setError("");
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function saveService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const response = await fetch("/api/dashboard/services", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, durationMinutes: Number(form.durationMinutes), serviceId: editingId }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "บันทึกบริการไม่สำเร็จ");
      return;
    }
    resetForm();
    await loadServices();
  }

  async function deleteService(serviceId: string) {
    if (!window.confirm("ยืนยันการลบบริการนี้หรือไม่")) return;
    const response = await fetch("/api/dashboard/services", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serviceId }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "ลบบริการไม่สำเร็จ");
      return;
    }
    setServices((current) => current.filter((service) => service.id !== serviceId));
  }

  return (
    <section className="kiosk-panel p-5">
      <div className="flex items-center justify-between gap-3">
        <div><h2 className="font-semibold text-slate-900">บริการ</h2><p className="mt-1 text-sm text-slate-500">จัดการรายการบริการและราคา</p></div>
        {editingId && <button type="button" onClick={resetForm} className="text-sm font-medium text-slate-600 hover:text-slate-900">ยกเลิกแก้ไข</button>}
      </div>
      <form onSubmit={saveService} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="text-sm font-medium text-slate-700">ชื่อบริการ<input required placeholder="เช่น ตัดผมชาย" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="kiosk-field mt-1 w-full px-3 py-2" /></label>
        <label className="text-sm font-medium text-slate-700">ระยะเวลา (นาที)<input required type="number" min="1" value={form.durationMinutes} onChange={(event) => setForm({ ...form, durationMinutes: event.target.value })} className="kiosk-field mt-1 w-full px-3 py-2" /></label>
        <label className="text-sm font-medium text-slate-700">ราคา (บาท)<input required type="number" min="0" step="0.01" placeholder="เช่น 450" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} className="kiosk-field mt-1 w-full px-3 py-2" /></label>
        <label className="text-sm font-medium text-slate-700">หมวดหมู่ (ถ้ามี)<input placeholder="เช่น ตัดผม" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className="kiosk-field mt-1 w-full px-3 py-2" /></label>
        <button type="submit" className="kiosk-primary rounded-lg px-4 py-2 font-medium">{editingId ? "บันทึกการแก้ไข" : "เพิ่มบริการ"}</button>
        <label className="text-sm font-medium text-slate-700 sm:col-span-2 lg:col-span-4">รายละเอียดบริการ (ถ้ามี)<textarea placeholder="เช่น ตัดผมพร้อมสระและไดร์" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="kiosk-field mt-1 w-full px-3 py-2" rows={2} /></label>
      </form>
      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
      {loading ? <p className="mt-5 text-sm text-slate-500">กำลังโหลดบริการ...</p> : services.length === 0 ? <p className="mt-5 text-sm text-slate-500">ยังไม่มีบริการ</p> : (
        <div className="mt-5 divide-y divide-slate-100 border-t border-slate-100">
          {services.map((service) => <div key={service.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="font-medium text-slate-900">{service.name}</p><p className="text-sm text-slate-500">{service.durationMinutes} นาที • {Number(service.price).toLocaleString("th-TH")} บาท{service.category ? ` • ${service.category}` : ""}</p></div>
            <div className="flex gap-2"><button type="button" onClick={() => startEdit(service)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">แก้ไข</button><button type="button" onClick={() => void deleteService(service.id)} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50">ลบ</button></div>
          </div>)}
        </div>
      )}
    </section>
  );
}