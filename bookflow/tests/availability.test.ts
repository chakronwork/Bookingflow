import { describe, it, expect } from "vitest";
import { calculateAvailableSlots } from "@/lib/availability/slots";

describe("calculateAvailableSlots", () => {
  const baseRecurring = [
    { dayOfWeek: 1, startTime: "09:00:00", endTime: "12:00:00" }, // จันทร์ 9:00 - 12:00
  ];

  it("คำนวณ Slot ว่างตามตารางปกติได้ถูกต้องเมื่อไม่มีคิวจอง", () => {
    const monday = new Date("2026-09-07T00:00:00");
    const slots = calculateAvailableSlots({
      targetDate: monday,
      durationMinutes: 60,
      recurringSlots: baseRecurring,
    });

    expect(slots).toHaveLength(3);
    expect(slots[0].startTime).toBe("09:00");
    expect(slots[0].endTime).toBe("10:00");
    expect(slots[2].startTime).toBe("11:00");
    expect(slots[2].endTime).toBe("12:00");
  });

  it("กรอง Slot ที่ชนกับการจองที่ Confirmed ออกไป", () => {
    const monday = new Date("2026-09-07T00:00:00");
    const existingBookings = [
      {
        startTime: new Date("2026-09-07T10:00:00"),
        endTime: new Date("2026-09-07T11:00:00"),
        status: "confirmed",
      },
    ];

    const slots = calculateAvailableSlots({
      targetDate: monday,
      durationMinutes: 60,
      recurringSlots: baseRecurring,
      existingBookings,
    });

    expect(slots).toHaveLength(2);
    expect(slots.map((s) => s.startTime)).toEqual(["09:00", "11:00"]);
  });

  it("ไม่บล็อก Slot หากสถานะการจองเดิมเป็น cancelled", () => {
    const monday = new Date("2026-09-07T00:00:00");
    const existingBookings = [
      {
        startTime: new Date("2026-09-07T10:00:00"),
        endTime: new Date("2026-09-07T11:00:00"),
        status: "cancelled",
      },
    ];

    const slots = calculateAvailableSlots({
      targetDate: monday,
      durationMinutes: 60,
      recurringSlots: baseRecurring,
      existingBookings,
    });

    expect(slots).toHaveLength(3);
  });

  it("คืนค่า Array ว่างเมื่อมี One-off Override กำหนดให้เป็นวันหยุด", () => {
    const monday = new Date("2026-09-07T00:00:00");
    const overrides = [
      {
        date: "2026-09-07",
        isAvailable: false,
      },
    ];

    const slots = calculateAvailableSlots({
      targetDate: monday,
      durationMinutes: 60,
      recurringSlots: baseRecurring,
      overrides,
    });

    expect(slots).toEqual([]);
  });
});