"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type BookingStatus = "pending" | "confirmed" | "in_queue" | "completed" | "cancelled" | "no_show";

interface QueueBooking {
  id: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  priority: "normal" | "urgent" | "emergency";
  notes: string | null;
  customerName: string;
  customerPhone: string | null;
  serviceName: string;
  departmentName: string | null;
}

interface ServiceOption {
  id: string;
  name: string;
  durationMinutes: number;
}

const statusLabels: Record<BookingStatus, string> = {
  pending: "รอยืนยัน",
  confirmed: "ยืนยันแล้ว",
  in_queue: "กำลังรอคิว",
  completed: "เสร็จสิ้น",
  cancelled: "ยกเลิก",
  no_show: "ไม่มาตามนัด",
};

const priorityLabels = { normal: "ปกติ", urgent: "ด่วน", emergency: "ฉุกเฉิน" };

function today() {
  const date = new Date();
  const pad = (number: number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function addMinutesToDateTime(value: string, minutes: number) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  date.setMinutes(date.getMinutes() + minutes);
  const pad = (number: number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function QueueBoard({ role }: { role: string }) {
  const router = useRouter();
  const [date, setDate] = useState(today);
  const [bookings, setBookings] = useState<QueueBooking[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [newQueue, setNewQueue] = useState({ customerName: "", customerPhone: "", serviceId: "", startTime: "", endTime: "", priority: "normal" });

  async function loadQueue(selectedDate: string) {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/dashboard/queue?date=${selectedDate}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "โหลดคิวไม่สำเร็จ");
      setBookings(data.bookings);
      setServices(data.services || []);
      setLastSynced(new Date());
    } catch (queueError) {
      setError(queueError instanceof Error ? queueError.message : "โหลดคิวไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void Promise.resolve().then(() => loadQueue(date));
    const syncTimer = window.setInterval(() => void loadQueue(date), 15000);
    return () => window.clearInterval(syncTimer);
  }, [date]);

  async function refreshQueue() {
    setIsRefreshing(true);
    await loadQueue(date);
    setIsRefreshing(false);
  }

  async function updateStatus(bookingId: string, status: BookingStatus) {
    setUpdatingId(bookingId);
    try {
      const response = await fetch("/api/dashboard/queue", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, status }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "เปลี่ยนสถานะไม่สำเร็จ");
      setBookings((current) => current.map((booking) => (
        booking.id === bookingId ? { ...booking, status: data.booking.status } : booking
      )));
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "เปลี่ยนสถานะไม่สำเร็จ");
    } finally {
      setUpdatingId(null);
    }
  }

  async function createQueue(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      const response = await fetch("/api/dashboard/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newQueue),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "เพิ่มคิวไม่สำเร็จ");
      setNewQueue({ customerName: "", customerPhone: "", serviceId: "", startTime: "", endTime: "", priority: "normal" });
      await loadQueue(date);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "เพิ่มคิวไม่สำเร็จ");
    }
  }

  function updateStartTime(value: string) {
    const selectedService = services.find((service) => service.id === newQueue.serviceId);
    setNewQueue({
      ...newQueue,
      startTime: value,
      endTime: selectedService ? addMinutesToDateTime(value, selectedService.durationMinutes) : newQueue.endTime,
    });
  }

  function updateService(serviceId: string) {
    const selectedService = services.find((service) => service.id === serviceId);
    setNewQueue({
      ...newQueue,
      serviceId,
      endTime: selectedService && newQueue.startTime ? addMinutesToDateTime(newQueue.startTime, selectedService.durationMinutes) : newQueue.endTime,
    });
  }

  async function deleteQueue(bookingId: string) {
    if (!window.confirm("ยืนยันการลบคิวนี้หรือไม่")) return;
    setUpdatingId(bookingId);
    try {
      const response = await fetch("/api/dashboard/queue", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "ลบคิวไม่สำเร็จ");
      setBookings((current) => current.filter((booking) => booking.id !== bookingId));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "ลบคิวไม่สำเร็จ");
    } finally {
      setUpdatingId(null);
    }
  }

  const counts = bookings.reduce<Record<string, number>>((summary, booking) => {
    summary[booking.status] = (summary[booking.status] || 0) + 1;
    return summary;
  }, {});

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-[#147d78]">BookFlow</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">จัดการคิว</h1>
          <p className="mt-2 text-slate-600">สิทธิ์ผู้ใช้งาน: {role}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <Link href="/dashboard/queue" className="kiosk-primary rounded-lg px-4 py-2 text-sm font-semibold">ดูคิววันนี้</Link>
          <button type="button" onClick={() => void refreshQueue()} disabled={isRefreshing} className="kiosk-field rounded-lg px-4 py-2 text-sm font-medium hover:bg-[#edf5f3] disabled:opacity-50">{isRefreshing ? "กำลังซิงค์..." : "รีเฟรชคิว"}</button>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-600" htmlFor="queue-date">วันที่<input id="queue-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} className="kiosk-field px-3 py-2" /></label>
          <button type="button" onClick={() => void fetch("/api/auth/logout", { method: "POST" }).then(() => router.push("/login"))} className="kiosk-field rounded-lg px-4 py-2 text-sm font-medium hover:bg-[#edf5f3]">ออกจากระบบ</button>
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#d7e1df] pb-4 text-sm text-[#5d716f]">
        <span>ระบบซิงค์คิวอัตโนมัติทุก 15 วินาที</span>
        <span>{lastSynced ? `ซิงค์ล่าสุด ${lastSynced.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : "กำลังเชื่อมต่อ..."}</span>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(["pending", "confirmed", "in_queue", "completed"] as BookingStatus[]).map((status) => (
          <div key={status} className="kiosk-panel p-4">
            <p className="text-sm text-slate-500">{statusLabels[status]}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{counts[status] || 0}</p>
          </div>
        ))}
      </section>

      <section className="kiosk-panel p-5">
        <h2 className="font-semibold text-slate-900">เพิ่มคิวด้วยตนเอง</h2>
        <form onSubmit={createQueue} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm font-medium text-slate-700">ชื่อลูกค้า<input required placeholder="เช่น สมชาย ใจดี" value={newQueue.customerName} onChange={(event) => setNewQueue({ ...newQueue, customerName: event.target.value })} className="kiosk-field mt-1 w-full px-3 py-2" /></label>
          <label className="text-sm font-medium text-slate-700">เบอร์โทรศัพท์<input required placeholder="เช่น 0812345678" value={newQueue.customerPhone} onChange={(event) => setNewQueue({ ...newQueue, customerPhone: event.target.value })} className="kiosk-field mt-1 w-full px-3 py-2" /></label>
          <label className="text-sm font-medium text-slate-700">บริการที่ลูกค้าเลือก<select required value={newQueue.serviceId} onChange={(event) => updateService(event.target.value)} className="kiosk-field mt-1 w-full px-3 py-2">
            <option value="">เลือกบริการ</option>
            {services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
          </select></label>
          <label className="text-sm font-medium text-slate-700">เวลาเริ่มคิว<input required type="datetime-local" value={newQueue.startTime} onChange={(event) => updateStartTime(event.target.value)} className="kiosk-field mt-1 w-full px-3 py-2" /></label>
          <label className="text-sm font-medium text-slate-700">เวลาสิ้นสุดคิว<input required type="datetime-local" value={newQueue.endTime} onChange={(event) => setNewQueue({ ...newQueue, endTime: event.target.value })} className="kiosk-field mt-1 w-full px-3 py-2" /></label>
          <label className="text-sm font-medium text-slate-700">ความเร่งด่วน<select value={newQueue.priority} onChange={(event) => setNewQueue({ ...newQueue, priority: event.target.value })} className="kiosk-field mt-1 w-full px-3 py-2">
            <option value="normal">ปกติ</option><option value="urgent">ด่วน</option><option value="emergency">ฉุกเฉิน</option>
          </select></label>
          <button type="submit" className="kiosk-primary rounded-lg px-4 py-2 font-medium sm:col-span-2 lg:col-span-1">เพิ่มคิว</button>
        </form>
      </section>

      {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}
      <section id="queue-section" className="kiosk-panel scroll-mt-6 overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-slate-900">รายการนัดหมายและคิว</h2>
        </div>
        {loading ? <p className="p-5 text-slate-500">กำลังโหลดคิว...</p> : bookings.length === 0 ? <p className="p-5 text-slate-500">ไม่มีคิวในวันที่เลือก</p> : (
          <div className="divide-y divide-slate-100">
            {bookings.map((booking) => (
              <article key={booking.id} className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex gap-4">
                  <time className="w-20 shrink-0 text-lg font-semibold text-slate-900">
                    {new Date(booking.startTime).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
                  </time>
                  <div>
                    <h3 className="font-semibold text-slate-900">{booking.customerName}</h3>
                    <p className="text-sm text-slate-600">{booking.serviceName}{booking.departmentName ? ` • ${booking.departmentName}` : ""}</p>
                    <p className="mt-1 text-xs text-slate-500">{booking.customerPhone || "ไม่ระบุเบอร์"} • {priorityLabels[booking.priority]}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">{statusLabels[booking.status]}</span>
                  {booking.status === "pending" || booking.status === "confirmed" ? <button type="button" disabled={updatingId === booking.id} onClick={() => void updateStatus(booking.id, "in_queue")} className="kiosk-primary rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50">เรียกคิว</button> : null}
                  {booking.status === "in_queue" ? <button type="button" disabled={updatingId === booking.id} onClick={() => void updateStatus(booking.id, "completed")} className="rounded-lg bg-[#2f806d] px-3 py-2 text-sm font-medium text-white hover:bg-[#256b5b] disabled:opacity-50">เสร็จสิ้น</button> : null}
                  <button type="button" disabled={updatingId === booking.id} onClick={() => void deleteQueue(booking.id)} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50">ลบ</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}