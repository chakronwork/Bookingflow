import { NextResponse } from "next/server";
import { and, asc, eq, gte, gt, isNull, lt } from "drizzle-orm";
import { db } from "@/db";
import { bookingStatusHistory, bookings, departments, services, users } from "@/db/schema";
import { getSession } from "@/lib/auth/session";

const statuses = ["pending", "confirmed", "in_queue", "completed", "cancelled", "no_show"] as const;
type BookingStatus = (typeof statuses)[number];

function isBookingStatus(value: unknown): value is BookingStatus {
  return typeof value === "string" && statuses.includes(value as BookingStatus);
}

function dayRange(dateValue: string | null) {
  const date = dateValue && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)
    ? dateValue
    : new Date().toISOString().slice(0, 10);
  const start = new Date(`${date}T00:00:00.000+07:00`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

async function getStaffSession() {
  const session = await getSession();
  if (!session || (session.role !== "owner" && session.role !== "staff")) return null;
  return session;
}

export async function GET(request: Request) {
  const session = await getStaffSession();
  if (!session) return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const { start, end } = dayRange(searchParams.get("date"));
  const [rows, serviceRows] = await Promise.all([
    db
    .select({
      id: bookings.id,
      startTime: bookings.startTime,
      endTime: bookings.endTime,
      status: bookings.status,
      priority: bookings.priority,
      notes: bookings.notes,
      customerName: users.name,
      customerPhone: users.phone,
      serviceName: services.name,
      departmentName: departments.name,
    })
    .from(bookings)
    .innerJoin(users, eq(users.id, bookings.customerId))
    .innerJoin(services, eq(services.id, bookings.serviceId))
    .leftJoin(departments, eq(departments.id, bookings.departmentId))
    .where(and(
      eq(bookings.businessId, session.businessId),
      isNull(bookings.deletedAt),
      gte(bookings.startTime, start),
      lt(bookings.startTime, end),
    ))
    .orderBy(asc(bookings.startTime)),
    db.select({ id: services.id, name: services.name, durationMinutes: services.durationMinutes })
      .from(services)
      .where(and(eq(services.businessId, session.businessId), eq(services.isActive, true), isNull(services.deletedAt)))
      .orderBy(asc(services.name)),
  ]);

  return NextResponse.json({ bookings: rows, services: serviceRows });
}

export async function POST(request: Request) {
  const session = await getStaffSession();
  if (!session) return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });

  try {
    const body = await request.json();
    const customerName = typeof body.customerName === "string" ? body.customerName.trim() : "";
    const customerPhone = typeof body.customerPhone === "string" ? body.customerPhone.trim() : "";
    const startTime = new Date(body.startTime);
    const endTime = new Date(body.endTime);
    if (!customerName || !customerPhone || typeof body.serviceId !== "string" || Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
      return NextResponse.json({ error: "กรุณากรอกข้อมูลคิวให้ครบถ้วน" }, { status: 400 });
    }
    if (endTime <= startTime) {
      return NextResponse.json({ error: "เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่มต้น" }, { status: 400 });
    }

    const result = await db.transaction(async (tx) => {
      const [service] = await tx.select({ id: services.id }).from(services).where(and(
        eq(services.id, body.serviceId), eq(services.businessId, session.businessId),
        eq(services.isActive, true), isNull(services.deletedAt),
      ));
      if (!service) return null;

      let [customer] = await tx.select({ id: users.id }).from(users).where(and(
        eq(users.businessId, session.businessId), eq(users.phone, customerPhone), isNull(users.deletedAt),
      ));
      if (!customer) {
        [customer] = await tx.insert(users).values({
          businessId: session.businessId, role: "customer", name: customerName, phone: customerPhone,
        }).returning({ id: users.id });
      }
      const [booking] = await tx.insert(bookings).values({
        businessId: session.businessId, serviceId: service.id, customerId: customer.id,
        startTime, endTime, status: "confirmed", priority: body.priority === "urgent" || body.priority === "emergency" ? body.priority : "normal",
        notes: typeof body.notes === "string" ? body.notes.trim() || null : null,
      }).returning({ id: bookings.id, status: bookings.status });
      await tx.insert(bookingStatusHistory).values({
        bookingId: booking.id, previousStatus: null, newStatus: booking.status, changedByUserId: session.userId,
      });
      return booking;
    });

    if (!result) return NextResponse.json({ error: "ไม่พบบริการนี้" }, { status: 404 });
    return NextResponse.json({ booking: result }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "ไม่สามารถเพิ่มคิวได้" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await getStaffSession();
  if (!session) return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });

  try {
    const body = await request.json();
    if (typeof body.bookingId !== "string" || !isBookingStatus(body.status)) {
      return NextResponse.json({ error: "ข้อมูลสถานะคิวไม่ถูกต้อง" }, { status: 400 });
    }

    const result = await db.transaction(async (tx) => {
      const [booking] = await tx
        .select({ id: bookings.id, status: bookings.status })
        .from(bookings)
        .where(and(
          eq(bookings.id, body.bookingId),
          eq(bookings.businessId, session.businessId),
          isNull(bookings.deletedAt),
        ));

      if (!booking) return null;
      if (booking.status === body.status) return booking;

      const [updated] = await tx
        .update(bookings)
        .set({ status: body.status, updatedAt: new Date() })
        .where(and(eq(bookings.id, booking.id), gt(bookings.updatedAt, new Date(0))))
        .returning({ id: bookings.id, status: bookings.status });

      await tx.insert(bookingStatusHistory).values({
        bookingId: booking.id,
        previousStatus: booking.status,
        newStatus: body.status,
        changedByUserId: session.userId,
      });
      return updated;
    });

    if (!result) return NextResponse.json({ error: "ไม่พบคิวนี้" }, { status: 404 });
    return NextResponse.json({ booking: result });
  } catch {
    return NextResponse.json({ error: "ไม่สามารถเปลี่ยนสถานะคิวได้" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await getStaffSession();
  if (!session) return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });

  try {
    const body = await request.json();
    if (typeof body.bookingId !== "string") {
      return NextResponse.json({ error: "ไม่พบรหัสคิว" }, { status: 400 });
    }
    const [deleted] = await db.update(bookings)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(bookings.id, body.bookingId), eq(bookings.businessId, session.businessId), isNull(bookings.deletedAt)))
      .returning({ id: bookings.id });
    if (!deleted) return NextResponse.json({ error: "ไม่พบคิวนี้" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "ไม่สามารถลบคิวได้" }, { status: 500 });
  }
}