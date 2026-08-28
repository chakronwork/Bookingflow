import { RecurringSlot, AvailabilityOverride, ExistingBooking, TimeSlot } from "./types";

function parseTimeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTimeString(minutes: number): string {
  const h = Math.floor(minutes / 60).toString().padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

export function calculateAvailableSlots(params: {
  targetDate: Date;
  durationMinutes: number;
  intervalMinutes?: number;
  recurringSlots: RecurringSlot[];
  overrides?: AvailabilityOverride[];
  existingBookings?: ExistingBooking[];
}): TimeSlot[] {
  const {
    targetDate,
    durationMinutes,
    intervalMinutes = durationMinutes,
    recurringSlots,
    overrides = [],
    existingBookings = [],
  } = params;

  const year = targetDate.getFullYear();
  const month = targetDate.getMonth();
  const dayOfMonth = targetDate.getDate();
  const dayOfWeek = targetDate.getDay();

  const formattedDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayOfMonth).padStart(2, "0")}`;

  // 1. ตรวจสอบ One-off Overrides
  const override = overrides.find((o) => o.date === formattedDate);
  if (override && !override.isAvailable) {
    return [];
  }

  // 2. กำหนดช่วงเวลาทำงาน
  let workWindows: { startMin: number; endMin: number }[] = [];

  if (override && override.isAvailable && override.startTime && override.endTime) {
    workWindows = [{
      startMin: parseTimeToMinutes(override.startTime),
      endMin: parseTimeToMinutes(override.endTime),
    }];
  } else {
    workWindows = recurringSlots
      .filter((s) => s.dayOfWeek === dayOfWeek)
      .map((s) => ({
        startMin: parseTimeToMinutes(s.startTime),
        endMin: parseTimeToMinutes(s.endTime),
      }));
  }

  if (workWindows.length === 0) return [];

  const activeBookings = existingBookings.filter((b) => b.status !== "cancelled");
  const availableSlots: TimeSlot[] = [];

  // 3. ซอยเวลาเป็น Slot และเช็คการทับซ้อน
  for (const window of workWindows) {
    let currentStartMin = window.startMin;

    while (currentStartMin + durationMinutes <= window.endMin) {
      const currentEndMin = currentStartMin + durationMinutes;

      const slotStart = new Date(year, month, dayOfMonth, Math.floor(currentStartMin / 60), currentStartMin % 60, 0, 0);
      const slotEnd = new Date(year, month, dayOfMonth, Math.floor(currentEndMin / 60), currentEndMin % 60, 0, 0);

      const hasConflict = activeBookings.some((booking) => {
        const bookingStart = new Date(booking.startTime).getTime();
        const bookingEnd = new Date(booking.endTime).getTime();
        return slotStart.getTime() < bookingEnd && slotEnd.getTime() > bookingStart;
      });

      if (!hasConflict) {
        availableSlots.push({
          startTime: minutesToTimeString(currentStartMin),
          endTime: minutesToTimeString(currentEndMin),
          startDateTime: slotStart,
          endDateTime: slotEnd,
        });
      }

      currentStartMin += intervalMinutes;
    }
  }

  return availableSlots;
}