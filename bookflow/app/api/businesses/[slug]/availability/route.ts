import { NextResponse } from "next/server";
import { db } from "@/db";
import { businesses, services, availabilitySlots, availabilityOverrides, bookings } from "@/db/schema";
import { eq, and, gte, lte, isNull } from "drizzle-orm";
import { calculateAvailableSlots } from "@/lib/availability/slots";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { searchParams } = new URL(request.url);
  const serviceId = searchParams.get("serviceId");
  const staffId = searchParams.get("staffId");
  const dateParam = searchParams.get("date"); // Format: YYYY-MM-DD

  if (!serviceId || !staffId || !dateParam) {
    return NextResponse.json(
      { error: "Missing required query params: serviceId, staffId, date" },
      { status: 400 }
    );
  }

  // 1. ตรวจสอบข้อมูลธุรกิจและบริการ
  const business = await db.query.businesses.findFirst({
    where: and(eq(businesses.slug, slug), isNull(businesses.deletedAt)),
  });

  if (!business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  const service = await db.query.services.findFirst({
    where: and(
      eq(services.id, serviceId),
      eq(services.businessId, business.id),
      isNull(services.deletedAt)
    ),
  });

  if (!service) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  const targetDate = new Date(`${dateParam}T00:00:00`);
  const startOfDay = new Date(`${dateParam}T00:00:00`);
  const endOfDay = new Date(`${dateParam}T23:59:59`);

  // 2. ดึงข้อมูล Availability Slots ประจำสัปดาห์
  const recurring = await db.query.availabilitySlots.findMany({
    where: and(
      eq(availabilitySlots.staffId, staffId),
      isNull(availabilitySlots.deletedAt)
    ),
  });

  // 3. ดึง Overrides เฉพาะวันนั้น
  const overrides = await db.query.availabilityOverrides.findMany({
    where: and(
      eq(availabilityOverrides.staffId, staffId),
      gte(availabilityOverrides.date, startOfDay),
      lte(availabilityOverrides.date, endOfDay),
      isNull(availabilityOverrides.deletedAt)
    ),
  });

  // 4. ดึง Bookings เดิมที่เกิดขึ้นในวันนั้น
  const existingBookings = await db.query.bookings.findMany({
    where: and(
      eq(bookings.staffId, staffId),
      gte(bookings.startTime, startOfDay),
      lte(bookings.startTime, endOfDay),
      isNull(bookings.deletedAt)
    ),
  });

  // 5. ส่งเข้า Engine คำนวณ Slot ว่าง
  const availableSlots = calculateAvailableSlots({
    targetDate,
    durationMinutes: service.durationMinutes,
    recurringSlots: recurring.map((r) => ({
      dayOfWeek: r.dayOfWeek,
      startTime: r.startTime,
      endTime: r.endTime,
    })),
    overrides: overrides.map((o) => ({
      date: dateParam,
      isAvailable: o.isAvailable,
      startTime: o.startTime,
      endTime: o.endTime,
    })),
    existingBookings: existingBookings.map((b) => ({
      startTime: b.startTime,
      endTime: b.endTime,
      status: b.status,
    })),
  });

  return NextResponse.json({ slots: availableSlots });
}