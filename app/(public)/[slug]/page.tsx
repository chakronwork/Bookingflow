"use client";

import { useEffect, useState, use } from "react";
import { BookingStep, BusinessConfig } from "@/lib/booking-flow/types";

interface BusinessData {
  id: string;
  name: string;
  slug: string;
  config: BusinessConfig;
  steps: BookingStep[];
}

interface Service {
  id: string;
  name: string;
  durationMinutes: number;
  price: string;
  description?: string;
}

interface Staff {
  id: string;
  name: string;
  bio?: string;
}

interface TimeSlot {
  startTime: string;
  endTime: string;
  startDateTime: string;
  endDateTime: string;
}

interface BookingConfirmation {
  id: string;
}

export default function BookingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);

  const [business, setBusiness] = useState<BusinessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Form State
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [notes] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState<BookingConfirmation | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ดึงข้อมูล Business และ Step Flow
  useEffect(() => {
    async function loadBusiness() {
      try {
        const res = await fetch(`/api/businesses/${slug}`);
        if (!res.ok) throw new Error("Business not found");
        const data = await res.json();
        setBusiness(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadBusiness();
  }, [slug]);

  // ดึง Slot เวลาว่างเมื่อเลือก Service, Staff และ Date ครบ
  useEffect(() => {
    async function loadSlots() {
      if (!selectedService || !selectedStaff || !selectedDate || !business) return;
      try {
        const res = await fetch(
          `/api/businesses/${slug}/availability?serviceId=${selectedService.id}&staffId=${selectedStaff.id}&date=${selectedDate}`
        );
        const data = await res.json();
        setAvailableSlots(data.slots || []);
      } catch (err) {
        console.error(err);
      }
    }
    loadSlots();
  }, [slug, business, selectedService, selectedStaff, selectedDate]);

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-slate-500">กำลังโหลด...</div>;
  }

  if (!business) {
    return <div className="flex h-screen items-center justify-center text-red-500">ไม่พบข้อมูลธุรกิจ</div>;
  }

  const steps = business.steps;
  const currentStep = steps[currentStepIndex];

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleSubmitBooking = async () => {
    if (!business || !selectedService || !selectedSlot) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: business.id,
          staffId: selectedStaff?.id,
          serviceId: selectedService.id,
          customerName,
          customerPhone,
          customerEmail,
          startTime: selectedSlot.startDateTime,
          endTime: selectedSlot.endDateTime,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "จองไม่สำเร็จ");
      setBookingSuccess(data.booking);
      setCurrentStepIndex(steps.length - 1); // ไปขั้นตอน Confirmation
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "จองไม่สำเร็จ");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Header */}
        <header className="bg-slate-900 text-white p-6">
          <h1 className="text-xl font-bold">{business.name}</h1>
          <p className="text-slate-400 text-sm mt-1">
            ขั้นตอน {currentStepIndex + 1} จาก {steps.length}: {currentStep}
          </p>
        </header>

        {/* Wizard Steps */}
        <div className="p-6">
          {currentStep === "select_service" && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-800">เลือกบริการ</h2>
              {/* ข้อมูลจำลองสำหรับ UI Step */}
              <div
                onClick={() => {
                  setSelectedService({ id: "demo-service", name: "บริการมาตรฐาน", durationMinutes: 45, price: "450.00" });
                }}
                className={`p-4 rounded-xl border cursor-pointer transition ${
                  selectedService?.id === "demo-service" ? "border-blue-600 bg-blue-50/50" : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-slate-800">บริการมาตรฐาน</p>
                    <p className="text-sm text-slate-500">45 นาที</p>
                  </div>
                  <span className="font-semibold text-slate-900">450 ฿</span>
                </div>
              </div>
            </div>
          )}

          {currentStep === "select_staff" && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-800">เลือกผู้ให้บริการ / ช่าง</h2>
              <div
                onClick={() => setSelectedStaff({ id: "demo-staff", name: "ช่างเอก" })}
                className={`p-4 rounded-xl border cursor-pointer transition ${
                  selectedStaff?.id === "demo-staff" ? "border-blue-600 bg-blue-50/50" : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <p className="font-medium text-slate-800">ช่างเอก</p>
                <p className="text-sm text-slate-500">ผู้เชี่ยวชาญประจำร้าน</p>
              </div>
            </div>
          )}

          {currentStep === "select_slot" && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-800">เลือกวันและเวลา</h2>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-800"
              />
              <div className="grid grid-cols-3 gap-2 mt-4">
                {availableSlots.length > 0 ? (
                  availableSlots.map((slot) => (
                    <button
                      key={slot.startTime}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      className={`py-2 px-3 text-sm rounded-lg border font-medium transition ${
                        selectedSlot?.startTime === slot.startTime
                          ? "bg-blue-600 text-white border-blue-600"
                          : "border-slate-200 text-slate-700 hover:border-slate-400"
                      }`}
                    >
                      {slot.startTime} - {slot.endTime}
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-slate-400 col-span-3">ไม่พบช่วงเวลาว่างในวันที่เลือก</p>
                )}
              </div>
            </div>
          )}

          {currentStep === "customer_info" && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-800">ข้อมูลผู้จอง</h2>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อ-นามสกุล *</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg"
                  placeholder="สมชาย ใจดี"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">เบอร์โทรศัพท์ *</label>
                <input
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg"
                  placeholder="0812345678"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">อีเมล (ถ้ามี)</label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg"
                  placeholder="somchai@example.com"
                />
              </div>
            </div>
          )}

          {currentStep === "confirmation" && (
            <div className="text-center py-6 space-y-3">
              <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto text-xl">
                ✓
              </div>
              <h2 className="text-xl font-bold text-slate-800">ยืนยันการจองเรียบร้อย</h2>
              <p className="text-sm text-slate-500">
                รหัสการจองของคุณคือ: <span className="font-mono font-bold text-slate-800">{bookingSuccess?.id || "-"}</span>
              </p>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        {currentStep !== "confirmation" && (
          <footer className="bg-slate-50 p-4 border-t border-slate-200 flex justify-between">
            <button
              type="button"
              disabled={currentStepIndex === 0}
              onClick={handleBack}
              className="px-4 py-2 text-sm font-medium text-slate-600 disabled:opacity-40"
            >
              ย้อนกลับ
            </button>
            {currentStepIndex === steps.length - 2 ? (
              <button
                type="button"
                disabled={isSubmitting || !customerName || !customerPhone}
                onClick={handleSubmitBooking}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? "กำลังบันทึก..." : "ยืนยันการจอง"}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800"
              >
                ถัดไป
              </button>
            )}
          </footer>
        )}
      </div>
    </main>
  );
}