"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type BookingStatus = "pending" | "confirmed" | "in_queue" | "completed" | "cancelled" | "no_show";

interface QueueBooking {
  id: string;
  startTime: string;
  status: BookingStatus;
  priority: "normal" | "urgent" | "emergency";
  customerName: string;
  serviceName: string;
  departmentName: string | null;
}

const statusLabels: Record<BookingStatus, string> = {
  pending: "รอยืนยัน", confirmed: "ยืนยันแล้ว", in_queue: "กำลังรอคิว",
  completed: "เสร็จสิ้น", cancelled: "ยกเลิก", no_show: "ไม่มาตามนัด",
};

const priorityLabels = { normal: "ปกติ", urgent: "ด่วน", emergency: "ฉุกเฉิน" };

function localDate() {
  const date = new Date();
  const pad = (number: number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function timeOf(value: string) {
  return new Date(value).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}

export default function QueueDisplay() {
  const [date, setDate] = useState(localDate);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [bookings, setBookings] = useState<QueueBooking[]>([]);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadQueue = useCallback(async () => {
    try {
      const response = await fetch(`/api/dashboard/queue?date=${date}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "โหลดคิวไม่สำเร็จ");
      setBookings(data.bookings.filter((booking: QueueBooking) => booking.status !== "completed" && booking.status !== "cancelled" && booking.status !== "no_show"));
      setLastSynced(new Date());
      setError("");
    } catch (queueError) {
      setError(queueError instanceof Error ? queueError.message : "โหลดคิวไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    void Promise.resolve().then(loadQueue);
    const syncTimer = window.setInterval(() => void loadQueue(), 15000);
    const clockTimer = window.setInterval(() => setCurrentTime(new Date()), 1000);
    return () => {
      window.clearInterval(syncTimer);
      window.clearInterval(clockTimer);
    };
  }, [date, loadQueue]);

  return (
    <main className="min-h-screen bg-[#f4f7f6] px-5 py-6 sm:px-10 sm:py-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-5 border-b border-[#d7e1df] pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-[#147d78]">BookFlow</p>
            <h1 className="mt-2 text-3xl font-bold text-[#193332] sm:text-4xl">คิววันนี้</h1>
            <p className="mt-2 text-lg text-[#5d716f]">รายการที่กำลังรอและนัดหมายถัดไป</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <time className="text-xl font-semibold tabular-nums text-[#193332]">{currentTime.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</time>
            <label className="flex items-center gap-2 text-sm font-medium text-[#5d716f]" htmlFor="display-date">วันที่<input id="display-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} className="kiosk-field px-3 py-2" /></label>
            <Link href="/dashboard" className="kiosk-field rounded-lg px-4 py-2 text-sm font-medium hover:bg-[#edf5f3]">กลับหน้าจัดการ</Link>
          </div>
        </header>

        <div className="flex flex-wrap items-center justify-between gap-2 py-4 text-sm text-[#5d716f]">
          <span>ข้อมูลอัปเดตอัตโนมัติทุก 15 วินาที</span>
          <span>{lastSynced ? `ซิงค์ล่าสุด ${lastSynced.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : "กำลังเชื่อมต่อ..."}</span>
        </div>

        {error && <p className="mb-4 rounded-lg bg-[#fff0ed] px-4 py-3 text-[#a34332]" role="alert">{error}</p>}
        {loading ? <p className="py-12 text-center text-lg text-[#5d716f]">กำลังโหลดคิว...</p> : bookings.length === 0 ? <div className="kiosk-panel px-6 py-16 text-center"><p className="text-2xl font-semibold text-[#193332]">ยังไม่มีคิว</p><p className="mt-2 text-lg text-[#5d716f]">ไม่มีรายการรอในวันที่เลือก</p></div> : (
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="รายการคิว">
            {bookings.map((booking, index) => <article key={booking.id} className={`kiosk-panel p-5 ${booking.status === "in_queue" ? "border-[#147d78] ring-2 ring-[#d3eeeb]" : ""}`}>
              <div className="flex items-start justify-between gap-3"><span className="text-3xl font-bold tabular-nums text-[#193332]">{timeOf(booking.startTime)}</span><span className="rounded-full bg-[#e4f3f1] px-3 py-1 text-sm font-semibold text-[#0d625e]">คิว {index + 1}</span></div>
              <h2 className="mt-5 text-xl font-semibold text-[#193332]">{booking.customerName}</h2>
              <p className="mt-1 text-lg text-[#5d716f]">{booking.serviceName}{booking.departmentName ? ` • ${booking.departmentName}` : ""}</p>
              <div className="mt-5 flex items-center justify-between border-t border-[#d7e1df] pt-4 text-sm"><span className="font-medium text-[#5d716f]">{priorityLabels[booking.priority]}</span><span className="font-semibold text-[#147d78]">{statusLabels[booking.status]}</span></div>
            </article>)}
          </section>
        )}
      </div>
    </main>
  );
}